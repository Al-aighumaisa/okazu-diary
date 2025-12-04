import * as z from 'zod/mini';

import type {
  CreativeWorkSeries,
  DefinedTerm,
  ImageObject,
  Metadata as GenericMetadata,
  ResolveOptions,
  ResolveResult,
  SelfLabel,
} from '../index.js';
import { extensions, http } from './generic/index.js';
import { isTemporaryHTTPError, ResolveError } from '../error.js';
import * as util from '../util.js';

declare module '../index.js' {
  interface ExtendedMetadataRecord {
    pixivArtwork?: ArtworkMetadataExt;
  }

  interface DefinedTerm {
    resolver?:
      | {
          pixiv?: DefinedTermExt;
        }
      | undefined;
  }
}

export interface DefinedTermExt {
  /**
   * If `true`, the tag cannot be removed by arbitrary users, typically because it is added by
   * the author.
   */
  locked: boolean;
}

export interface ArtworkMetadataExt {
  /**
   * Known values:
   * - `0`: Regular artwork
   * - `1`: Manga
   * - `2`: Ugoira
   */
  illustType: number;
  /**
   * Known values (from enum labels in pixiv's JS code):
   * - `0`: `safe` - General
   * - `1`: `r18` - R-18
   * - `2`: `r18g` - R-18G
   */
  xRestrict: number;
  /**
   * Known values (from enum labels in pixiv's JS code):
   * - `0`: `unchecked`
   * - `1`: `gray`
   * - `2`: `white` - Safe
   * - `3`: N/A
   * - `4`: `semiBlack` - Sensitive
   * - `5`: N/A
   * - `6`: `black` - R-18
   * - `7`: `illegal`
   */
  sl: number;
  /**
   * The page number denoted by the URL (0-origin).
   */
  page: number | undefined;
  /**
   * The number of overall pages in the post.
   */
  pageCount: number;
  userId: string;
  /**
   * The slug of the author used in the `pixiv.me` URL.
   */
  userAccount: string;
  /**
   * The URL of the full size image at the original `pximg.net` server rather than the `pixiv.cat`
   * proxy.
   */
  originalImage: string | undefined;
  /**
   * Known values:
   * - `0`: Published before `2022-10-31T03:00:00+00:00` (`illust_id=102382135`) and has not been
   *   marked as AI-generated.
   * - `1`: Published after `2022-10-31T03:00:00+00:00` (`illust_id=102382140`) and marked as not
   *   AI-generated.
   * - `2`: Marked as AI-generated.
   */
  aiType: number | undefined;
}

export const ILLUST_TYPE_ARTWORK = 0;
export const ILLUST_TYPE_MANGA = 1;
export const ILLUST_TYPE_UGOIRA = 2;

export const XRESTRICT_SAFE = 0;
export const XRESTRICT_R18 = 1;
export const XRESTRICT_R18G = 2;

export const SANITY_LEVEL_UNCHECKED = 0;
export const SANITY_LEVEL_GRAY = 1;
export const SANITY_LEVEL_WHITE = 2;
export const SANITY_LEVEL_SEMI_BLACK = 4;
export const SANITY_LEVEL_BLACK = 6;
export const SANITY_LEVEL_ILLEGAL = 7;

const seriesNavWork = z.object({
  id: z.string(),
  title: z.string(),
  order: z.int(),
});

const illustSchema = z.discriminatedUnion('error', [
  z.object({ error: z.literal(true) }),
  z.object({
    error: z.literal(false),
    body: z.object({
      illustId: z.string(),
      illustTitle: z.string(),
      illustComment: z.string(),
      illustType: z.number(),
      createDate: z.string(),
      uploadDate: z.string(),
      xRestrict: z.int(),
      sl: z.int(),
      urls: z.object({
        original: z.nullish(z.string()),
      }),
      tags: z.object({
        isLocked: z.boolean(),
        tags: z.array(
          z.object({
            tag: z.string(),
            locked: z.boolean(),
            userId: z.nullish(z.string()),
          }),
        ),
      }),
      userId: z.string(),
      userName: z.string(),
      userAccount: z.string(),
      userIllusts: z.record(
        z.string(),
        z.nullable(
          z.object({
            url: z.string(),
            userId: z.string(),
            profileImageUrl: z.nullish(z.string()),
          }),
        ),
      ),
      width: z.int(),
      height: z.int(),
      pageCount: z.int(),
      imageResponseOutData: z.array(
        z.object({
          type: z.string(),
          workId: z.string(),
          title: z.string(),
          userName: z.string(),
          imageUrl: z.string(),
        }),
      ),
      // imageResponseData: z.array(
      //   z.object({
      //     type: z.string(),
      //     id: z.string(),
      //     title: z.string(),
      //     illustType: z.int(),
      //     xRestrict: z.int(),
      //     sl: z.int(),
      //     url: z.string(),
      //     description: z.string(),
      //     tags: z.array(z.string()),
      //     userId: z.string(),
      //     width: z.int(),
      //     height: z.int(),
      //     pageCount: z.int(),
      //     createDate: z.string(),
      //     updateDate: z.string(),
      //     aiType: z.nullish(z.int()),
      //     urls: z.record(z.string(), z.string()),
      //     seriesId: z.nullish(z.string()),
      //     seriesTitle: z.nullish(z.string()),
      //   }),
      // ),
      seriesNavData: z.nullish(
        z.object({
          seriesType: z.string(),
          seriesId: z.string(),
          title: z.string(),
          order: z.int(),
          prev: z.nullish(seriesNavWork),
          next: z.nullish(seriesNavWork),
        }),
      ),
      aiType: z.nullish(z.int()),
    }),
  }),
]);

const hosts = ['pixiv.net', 'www.pixiv.net'];

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (!hosts.includes(url.host)) {
    return { value: undefined, response: undefined };
  }

  url.host = 'www.pixiv.net';

  let illustId, page;
  if (/^\/artworks\/\d+$/.test(url.pathname)) {
    illustId = url.pathname.slice('/artworks/'.length);
    if (/^#[1-9]\d*$/.test(url.hash)) {
      // Manga page in desktop view.
      page = +url.hash.slice(1) - 1;
    } else if (/^#big_\d+/.test(url.hash)) {
      // Manga page in mobile view.
      page = +url.hash.slice(5);
    }
  } else if (url.pathname === '/member_illust.php') {
    // Old URL format.
    const illust_id = url.searchParams.get('illust_id');
    if (illust_id && /\d+/.test(illust_id)) {
      illustId = illust_id;

      const p = url.searchParams.get('page');
      if (p && /\d+/.test(p)) {
        page = +p;
      }
    }
  }

  if (illustId !== undefined) {
    return resolveIllust(illustId, page, options);
  }

  url.protocol = 'https';

  return http.resolve(url, options);
}

async function resolveIllust(
  id: string,
  page: number | undefined,
  options: ResolveOptions | undefined,
): Promise<ResolveResult> {
  const ajaxUrl = `https://www.pixiv.net/ajax/illust/${id}`;
  const res = await util.fetch(options, ajaxUrl, {
    headers: {
      'accept-language': 'ja-JP, ja',
    },
  });
  if (isTemporaryHTTPError(res.status)) {
    throw new ResolveError(undefined, { response: res });
  }

  const response = { status: res.status, headers: res.headers };

  const ajax = illustSchema.parse(await res.json());
  if (ajax.error) {
    return { value: undefined, response };
  }
  const body = ajax.body;

  if (body.illustType === ILLUST_TYPE_UGOIRA) {
    page = undefined;
  }

  let labels: SelfLabel[] | undefined;
  if (body.xRestrict === XRESTRICT_R18G) {
    labels = [{ val: 'graphic-media' }];
  } else if (
    body.xRestrict === XRESTRICT_SAFE &&
    body.sl === SANITY_LEVEL_WHITE
  ) {
    // Safe
  } else if (
    body.xRestrict === XRESTRICT_SAFE &&
    body.sl === SANITY_LEVEL_SEMI_BLACK
  ) {
    labels = [{ val: 'nudity' }];
  } else {
    labels = [{ val: 'sexual' }];
  }

  const originalImage = body.urls.original ?? undefined;
  let thumbnail;
  if (originalImage) {
    thumbnail = formatAsProxyThumbUrl(originalImage, page);
  } else {
    // `urls.original` can be `null` for age restricted artworks.
    // OTOH, `userIllusts[id]` seems to be always present, but the image at its `url` is a cropped
    // one, so we need to transform it.
    const userIllust = body.userIllusts[id];
    if (!userIllust) {
      throw new ResolveError(`Missing \`${id}\` in \`userIllusts\``, {
        response: res,
      });
    }
    thumbnail = formatAsProxyThumbUrl(userIllust.url, page);
    // `originalImage` cannot be determined by the URL alone because the original image may have a
    // different file name extension. While we could figure it by heuristically try fetching URLs
    // with different extensions, we don't bother to do that much.
  }

  let image;
  if (page === undefined) {
    image = [
      {
        contentUrl: thumbnail,
        encodingFormat: 'image/jpeg',
        ratio: { width: body.width, height: body.height },
      },
      ...Array(body.pageCount - 1)
        .fill(null)
        .map(
          (_, i): ImageObject => ({
            contentUrl:
              thumbnail.slice(0, -'0_master1200.jpg'.length) +
              `${i + 1}_master1200.jpg`,
            encodingFormat: 'image/jpeg',
            ratio: undefined,
          }),
        ),
    ];
  } else {
    image = [
      {
        contentUrl: thumbnail,
        encodingFormat: 'image/jpeg',
        ratio: page ? undefined : { width: body.width, height: body.height },
      },
    ];
  }

  const tags: DefinedTerm[] = [];
  if (body.aiType === 2) {
    tags.push({
      name: { textValue: 'AI生成' },
    });
  }
  for (const t of body.tags.tags) {
    tags.push({
      name: { textValue: t.tag },
      resolver: {
        pixiv: {
          locked: body.tags.isLocked || t.locked || t.userId === body.userId,
        },
      },
    });
  }

  let profileImage;
  for (const key in body.userIllusts) {
    // We cannot just use `userIllusts[id]` because it (and only it) somehow lacks `profileImageUrl`.
    const value = body.userIllusts[key];
    if (value?.profileImageUrl && value.userId === body.userId) {
      profileImage = value.profileImageUrl;
      break;
    }
  }

  let isBasedOn;
  const imageResponseOutData = body.imageResponseOutData;
  if (imageResponseOutData?.length) {
    isBasedOn = imageResponseOutData.map(
      (v) =>
        ({
          type: v.type === 'illust' ? 'VisualArtwork' : undefined,
          url: `https://www.pixiv.net/artworks/${v.workId}`,
          name: { textValue: v.title },
          creator: [
            { type: 'Person', name: { textValue: v.userName } },
          ] as const,
          image: [
            {
              contentUrl: v.imageUrl,
              encodingFormat: util.encodingFormatFromFileExt(v.imageUrl),
            },
          ] as const,
        }) satisfies GenericMetadata,
    );
  }

  let isPartOf;
  const seriesNavData = body.seriesNavData;
  if (seriesNavData) {
    isPartOf = {
      name: { textValue: seriesNavData.title },
      url: `https://www.pixiv.net/user/${body.userId}/series/${seriesNavData.seriesId}`,
    } satisfies CreativeWorkSeries;
  }

  return {
    value: {
      type: body.illustType === 1 ? 'ComicStory' : 'VisualArtwork',
      url: `https://www.pixiv.net/artworks/${id}${page !== undefined ? `#${page + 1}` : ''}`,
      name: { textValue: body.illustTitle },
      identifier: id,
      description: body.illustComment,
      isBasedOn,
      isPartOf,
      creator: [
        {
          type: 'Person',
          name: { textValue: body.userName },
          url: `https://www.pixiv.net/users/${body.userId}`,
          image:
            profileImage !== undefined
              ? {
                  contentUrl: profileImage,
                  encodingFormat: util.encodingFormatFromFileExt(profileImage),
                }
              : undefined,
        },
      ],
      datePublished: body.createDate,
      dateModified: body.uploadDate,
      image,
      keywords: tags,
      labels,
      resolver: {
        pixivArtwork: {
          illustType: body.illustType,
          xRestrict: body.xRestrict,
          sl: body.sl,
          page,
          pageCount: body.pageCount,
          userId: body.userId,
          userAccount: body.userAccount,
          originalImage,
          aiType: body.aiType ?? undefined,
        },
      },
    },
    response,
  };
}

function formatAsProxyThumbUrl(url: string, page?: number): string {
  return (
    url
      .replace(/^.*\/img\//, 'https://i.pixiv.cat/img-master/img/')
      .replace(/_p0[^./]*\.[^./]+$/, `_p${page ?? 0}`)
      .replace(/_ugoira0\.[^./]+$/, '')
      .replace(/_square\d+\.[^./]+$/, '') + '_master1200.jpg'
  );
}

extensions.registerHosts(hosts, resolve);
