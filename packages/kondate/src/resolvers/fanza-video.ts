import type {
  DefinedTerm,
  ImageObject,
  Metadata,
  Person,
  ResolveOptions,
  ResolveResult,
} from '../index.js';
import { isTemporaryHTTPError, ResolveError } from '../error.js';
import * as util from '../util.js';
import { extensions, http } from './generic/index.js';

const host = 'video.dmm.co.jp';

const QUERY =
  '\
query ContentPageData($id:ID!,$isAmateur:Boolean!,$isAnime:Boolean!,$isAv:Boolean!,$isCinema:Boolean!){\
ppvContent(id:$id){\
...ContentData\
}\
}\
fragment ContentData on PPVContent{\
id \
floor \
title \
description \
packageImage{\
largeUrl \
mediumUrl\
}\
sampleImages{\
imageUrl \
largeImageUrl\
}\
sample2DMovie{\
highestMovieUrl\
}\
sampleVRMovie{\
highestMovieUrl\
}\
...AmateurAdditionalContentData@include(if:$isAmateur)\
...AnimeAdditionalContentData@include(if:$isAnime)\
...AvAdditionalContentData@include(if:$isAv)\
...CinemaAdditionalContentData@include(if:$isCinema)\
}\
fragment AmateurAdditionalContentData on PPVContent{\
deliveryStartDate \
duration \
amateurActress{\
id \
name \
imageUrl\
}\
maker{\
id \
name\
}\
label{\
id \
name\
}\
genres{\
id \
name\
}\
makerContentId\
}\
fragment AnimeAdditionalContentData on PPVContent{\
deliveryStartDate \
duration \
series{\
id \
name\
}\
maker{\
id \
name\
}\
label{\
id \
name\
}\
genres{\
id \
name\
}\
makerContentId\
}\
fragment AvAdditionalContentData on PPVContent{\
deliveryStartDate \
makerReleasedAt \
duration \
actresses{\
id \
name \
nameRuby \
imageUrl\
}\
histrions{\
id \
name\
}\
directors{\
id \
name\
}\
series{\
id \
name\
}\
maker{\
id \
name\
}\
label{\
id \
name\
}\
genres{\
id \
name\
}\
contentType \
makerContentId\
}\
fragment CinemaAdditionalContentData on PPVContent{\
deliveryStartDate \
duration \
actresses{\
id \
name \
nameRuby \
imageUrl\
}\
histrions{\
id \
name\
}\
directors{\
id \
name\
}\
authors{\
id \
name\
}\
series{\
id \
name\
}\
maker{\
id \
name\
}\
label{\
id \
name\
}\
genres{\
id \
name\
}\
makerContentId\
}\
';

interface PPVContent {
  id?: string | null;
  floor?: string | null;
  title?: string | null;
  description?: string | null;
  packageImage?: {
    largeUrl?: string | null;
    mediumUrl?: string | null;
  } | null;
  sampleImages?:
    | {
        imageUrl?: string | null;
        largeImageUrl?: string | null;
      }[]
    | null;
  sample2DMovie?: {
    highestMovieUrl?: string | null;
  } | null;
  sampleVRMovie?: {
    highestMovieUrl?: string | null;
  } | null;
  deliveryStartDate?: string | null;
  makerReleasedAt?: string | null;
  duration?: number | null;
  amateurActress?: {
    id?: string | null;
    name?: string | null;
    imageUrl?: string | null;
  } | null;
  actresses?:
    | {
        id?: string | null;
        name?: string | null;
        nameRuby?: string | null;
        imageUrl?: string | null;
      }[]
    | null;
  histrions?:
    | {
        id?: string | null;
        name?: string | null;
      }[]
    | null;
  directors?:
    | {
        id?: string | null;
        name?: string | null;
      }[]
    | null;
  maker?: {
    id?: string | null;
    name?: string | null;
  } | null;
  label?: {
    id?: string | null;
    name?: string | null;
  } | null;
  genres?: {
    id?: string | null;
    name?: string | null;
  } | null;
  makerContentId?: string | null;
  series?: {
    id?: string | null;
    name?: string | null;
  } | null;
  contentType?: string | null;
  authors?:
    | {
        id?: string | null;
        name?: string | null;
      }[]
    | null;
}

type GraphQLResponse =
  | { data: { ppvContent: PPVContent | null } }
  | { data: null; errors: object[] };

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (url.host !== host) {
    return { value: undefined, response: undefined };
  }

  url.protocol = 'https';

  let match, id;
  if (
    !(match = /\/+(av|amateur|anime|cinema)\/+content\/*/.exec(url.pathname)) ||
    !(id = url.searchParams.get('id'))
  ) {
    const headers = new Headers(options?.headers);
    headers.append('cookie', 'age_check_done=1');
    return http.resolve(url, { ...options, headers });
  }

  const floor = match[1];

  const res = await util.fetch(options, 'https://api.video.dmm.co.jp/graphql', {
    method: 'POST',
    headers: {
      accept: 'application/graphql-response+json,application/json',
      'accept-language': 'ja-JP, ja',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      operationName: 'ContentPageData',
      query: QUERY,
      variables: {
        id,
        isAmateur: floor === 'amateur',
        isAnime: floor === 'anime',
        isAv: floor === 'av',
        isCinema: floor === 'cinema',
      },
    }),
  });

  if (isTemporaryHTTPError(res.status)) {
    throw new ResolveError(undefined, { response: res });
  }

  const response = { status: res.status, headers: res.headers };

  const graphqlRes = (await res.json()) as GraphQLResponse;
  if (!graphqlRes.data) {
    throw new ResolveError(
      `GraphQL error: ${JSON.stringify(graphqlRes.errors)}`,
      { response: res },
    );
  }

  const content = graphqlRes.data.ppvContent;

  if (content?.floor !== floor.toUpperCase()) {
    return { value: undefined, response };
  }

  const creator: Metadata['creator'] = [];

  const maker = content.maker;
  if (maker) {
    creator.push({
      type: 'Organization',
      name: maker.name ? { textValue: maker.name } : undefined,
      url: maker.id
        ? `https://video.dmm.co.jp/${floor}/list/?maker=${maker.id}`
        : undefined,
    });
  }

  const directors = content.directors;
  if (directors) {
    creator.push(
      ...directors.map(
        (director) =>
          ({
            type: 'Person',
            name: director.name ? { textValue: director.name } : undefined,
            url: director.id
              ? `https://video.dmm.co.jp/${floor}/list/?director=${director.id}`
              : undefined,
          }) satisfies Person,
      ),
    );
  }

  const authors = content.authors;
  if (authors) {
    creator.push(
      ...authors.map(
        (author) =>
          ({
            type: 'Person',
            name: author.name ? { textValue: author.name } : undefined,
            url: author.id
              ? `https://video.dmm.co.jp/${floor}/list/?director=${author.id}`
              : undefined,
          }) satisfies Person,
      ),
    );
  }

  const actresses = content.actresses;
  if (actresses) {
    creator.push(
      ...actresses.map(
        (actress) =>
          ({
            type: 'Person',
            name: actress.name
              ? {
                  textValue: actress.name,
                  phoneticText: actress.nameRuby || undefined,
                }
              : undefined,
            url: actress.id
              ? `https://video.dmm.co.jp/${floor}/list/?actress=${actress.id}`
              : undefined,
            image: actress.imageUrl
              ? { contentUrl: actress.imageUrl }
              : undefined,
          }) satisfies Person,
      ),
    );
  }

  const histrions = content.histrions;
  if (histrions) {
    creator.push(
      ...histrions.map(
        (histrion) =>
          ({
            type: 'Person',
            name: histrion.name ? { textValue: histrion.name } : undefined,
            url: histrion.id
              ? `https://video.dmm.co.jp/${floor}/list/?histrion=${histrion.id}`
              : undefined,
          }) satisfies Person,
      ),
    );
  }

  const amateurActress = content.amateurActress;
  if (amateurActress) {
    creator.push({
      type: 'Person',
      name: amateurActress.name
        ? { textValue: amateurActress.name }
        : undefined,
    });
  }

  let image: ImageObject[];

  const packageImage = content.packageImage;
  if (packageImage) {
    const contentUrl = packageImage.largeUrl || packageImage.mediumUrl;
    if (contentUrl) {
      image = [{ contentUrl }];
    }
  }

  const sampleImages = content.sampleImages;
  if (sampleImages) {
    image ??= [];
    for (const sample of sampleImages) {
      const contentUrl = sample.largeImageUrl || sample.imageUrl;
      if (contentUrl) {
        image.push({ contentUrl });
      }
    }
  }

  return {
    value: {
      name: content.title ? { textValue: content.title } : undefined,
      identifier: content.id || id,
      inLanguage: 'ja-JP',
      description: content.description ?? undefined,
      creator,
      brand: content.label
        ? {
            name: content.label.name
              ? { textValue: content.label.name }
              : undefined,
            url: content.label.id
              ? `https://video.dmm.co.jp/${floor}/list/?label=${content.label.id}`
              : undefined,
          }
        : undefined,
      keywords: content.genres
        ? (content.genres as Record<string, string>[]).flatMap(
            (genre): DefinedTerm | [] =>
              genre.name ? { name: { textValue: genre.name } } : [],
          )
        : undefined,
    },
    response,
  };
}

extensions.registerHosts([host], resolve);
