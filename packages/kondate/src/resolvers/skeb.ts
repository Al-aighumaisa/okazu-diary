import * as z from 'zod/mini';

import type {
  MediaObject,
  Metadata,
  ResolveOptions,
  ResolveResult,
} from '../index.js';
import { isTemporaryHTTPError, ResolveError } from '../error.js';
import * as util from '../util.js';
import { http } from './generic/index.js';
import { registerHosts } from './generic/extensions.js';

const hosts = ['skeb.jp', 'www.skeb.jp'];

const schema = z.object({
  id: z.number(),
  path: z.string(),
  body: z.string(),
  nsfw: z.boolean(),
  og_image_url: z.string(),
  source_body: z.nullish(z.string()),
  genre: z.string(),
  creator: z.object({
    name: z.string(),
    screen_name: z.string(),
    avatar_url: z.string(),
  }),
  previews: z.array(
    z.object({
      information: z.object({
        width: z.nullish(z.number()),
        height: z.nullish(z.number()),
        duration: z.nullish(z.number()),
        extension: z.nullish(z.string()),
        transcoder: z.nullish(z.string()),
      }),
      url: z.string(),
    }),
  ),
});

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (!hosts.includes(url.host)) {
    return { value: undefined, response: undefined };
  }

  url.protocol = 'https';
  url.host = 'skeb.jp';

  let apiUrl, match;
  if ((match = /^\/@([^/]+)\/works\/(\d+)\/?/.exec(url.pathname))) {
    const username = match[1];
    const workSeq = match[2];
    apiUrl = `https://skeb.jp/api/users/${username}/works/${workSeq}`;
  } else if ((match = /^\/works\/(\d+)\/?/.exec(url.pathname))) {
    const workId = match[1];
    apiUrl = `https://skeb.jp/api/works/${workId}`;
  } else {
    return http.resolve(url, options);
  }

  const response = await util.fetch(options, apiUrl, {
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer null',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
    },
  });
  if (isTemporaryHTTPError(response.status)) {
    throw new ResolveError(undefined, { response });
  }

  const data = schema.parse(await response.json());
  const creator = data.creator;

  let type;
  switch (data.genre) {
    case 'art':
      type = 'VisualArtwork';
      break;
    case 'comic':
      type = 'ComicStory';
      break;
    // case 'voice': // TODO
    case 'novel':
      type = 'ShortStory';
      break;
    // case 'video': // TODO
    case 'music':
      type = 'MusicComposition';
      break;
    case 'correction':
      type = 'LearningResource';
      break;
    default:
      type = 'CreativeWork';
  }

  let name = data.body;
  if (name.length > 15) {
    name = name.slice(0, 11) + '...';
  }
  let nameCreator = creator.name;
  if (nameCreator.length > 15) {
    nameCreator = nameCreator.slice(0, 11) + '...';
  }
  name += ` by ${nameCreator}`;

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  const value: Metadata & { image: {} } = {
    type,
    url: `https://skeb.jp${data.path}`,
    name: { textValue: `${name} | Skeb` },
    identifier: `work:${data.id}`,
    description: data.source_body ?? data.body,
    creator: [
      {
        type: 'Person',
        name: { textValue: creator.name },
        url: `https://skeb.jp/@${creator.screen_name}`,
        image: {
          contentUrl: creator.avatar_url,
          encodingFormat: util.encodingFormatFromFileExt(creator.avatar_url),
        },
      },
    ],
    labels: data.nsfw ? [{ val: 'sexual' }] : undefined,
    image: [],
  };

  for (const { information, url } of data.previews) {
    const width = information.width;
    const height = information.height;
    const duration = information.duration;
    const media = {
      contentUrl: url,
      ratio:
        typeof width === 'number' && typeof height === 'number'
          ? { width, height }
          : undefined,
      encodingFormat: util.encodingFormatFromFileExt(
        `.${information.extension}`,
      ),
      duration:
        typeof duration === 'number'
          ? { unitCode: 'SEC', value: duration }
          : undefined,
    } satisfies MediaObject;
    switch (information.transcoder) {
      case 'image':
        value.image.push(media);
        break;
      case 'video':
        (value.video ??= []).push(media);
        break;
      case 'audio':
        (value.audio ??= []).push(media);
        break;
      case 'text':
        (value.text ??= []).push(media);
    }
  }

  if (!value.image.length) {
    value.image.push({
      contentUrl: data.og_image_url,
    });
  }

  return {
    value,
    response: { status: response.status, headers: response.headers },
  };
}

registerHosts(hosts, resolve);
