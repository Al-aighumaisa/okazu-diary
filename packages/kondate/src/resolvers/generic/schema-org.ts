import jsonld from 'jsonld';

import type {
  DefinedTerm,
  ExtendedMetadataRecord,
  Metadata as GenericMetadata,
  ImageObject,
  MediaObject,
  Organization,
  Person,
  PronounceableText,
} from '../../index.js';
import { jsonLdUtil } from './index.js';
import { ResolveError } from '../../error.js';

declare module '../../index.js' {
  interface ExtendedMetadataRecord {
    schemaOrg?: jsonld.NodeObject | undefined;
  }
}

export interface Metadata extends GenericMetadata {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  resolver: ExtendedMetadataRecord & { schemaOrg: {} };
}

const COMPACT_CONTEXT = [
  'https://schema.org/',
  // Prefer `@id` and `@type` keywords over these shorthand terms when compacting because the
  // keywords seem to be somewhat more popular out there than the shorthands and they comes with
  // better type information.
  { id: null, type: null },
];

export async function extractMaybeSchemaOrg(
  json: unknown,
): Promise<Metadata | undefined> {
  // Only implementing logics enough to process Nijie pages for now.

  let node;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    node = await jsonld.compact(json as any, COMPACT_CONTEXT, {
      documentLoader: jsonLdUtil.makeDocumentLoader(),
    });
  } catch (e) {
    if (jsonLdUtil.isTemporaryJsonLdError(e)) {
      throw new ResolveError(`Unable to resolve JSON-LD context(s)`, {
        cause: e,
      });
    }
    return;
  }
  node['@context'] = 'https://schema.org/';

  let image: ImageObject[] = jsonLdUtil
    .setAsArray(node.image)
    .flatMap((v) => extractMediaObject(v, 'ImageObject') ?? []);
  if (!image.length) {
    const thumbnailUrl = extractThumbnailUrl(node);
    if (thumbnailUrl) {
      image = [{ contentUrl: thumbnailUrl }];
    }
  }

  const video = jsonLdUtil
    .setAsArray(node.video)
    .flatMap((v) => extractMediaObject(v, 'VideoObject') ?? []);

  const audio = jsonLdUtil
    .setAsArray(node.audio)
    .flatMap((v) => extractMediaObject(v, 'AudioObject') ?? []);

  return {
    type: jsonLdUtil.firstOfSet(node['@type']),
    url: firstString(node.url),
    name: firstPronounceableText(node.name),
    inLanguage: firstString(node.inLanguage),
    description: firstString(node.description),
    creator: jsonLdUtil
      .setAsArray(node.creator)
      .flatMap((v) => extractCreator(v) ?? []),
    datePublished: firstString(node.datePublished),
    dateModified: firstString(node.dateModified),
    image: image.length ? image : undefined,
    video: video.length ? video : undefined,
    audio: audio.length ? audio : undefined,
    keywords: jsonLdUtil
      .setAsArray(node.keywords)
      .flatMap((v) => extractDefinedTerm(v) ?? []),
    resolver: {
      schemaOrg: node,
    },
  };
}

function firstString(set: jsonld.NodeObject[string]): string | undefined {
  return jsonLdUtil.setAsArray(set).find((v) => typeof v === 'string');
}

function extractPronounceableText(
  value: jsonld.NodeObject[string],
): PronounceableText | undefined {
  if (typeof value === 'string') {
    return { textValue: value };
  }

  if (!jsonLdUtil.isNodeObject(value)) {
    return;
  }

  const textValue = firstString(value.textValue);
  if (textValue) {
    return {
      textValue,
      phoneticText: firstString(value.phoneticText),
      inLanguage: firstString(value.inLanguage),
    };
  }
}

function firstPronounceableText(
  value: jsonld.NodeObject[string],
): PronounceableText | undefined {
  for (const v of jsonLdUtil.setAsArray(value)) {
    const p = extractPronounceableText(v);
    if (p) {
      return p;
    }
  }
}

function extractCreator(
  value: jsonld.NodeObject[string],
): ((Person | Organization) & { type: string }) | undefined {
  if (!jsonLdUtil.isNodeObject(value)) {
    return;
  }

  const type = jsonLdUtil
    .setAsArray(value['@type'])
    .find((v) => v === 'Person' || v === 'Organization');
  if (!type) {
    return;
  }

  return {
    type,
    url:
      firstString(value.url) ??
      (value['@id'] as string) ??
      firstString(value.sameAs),
    description: firstString(value.description),
    image: jsonLdUtil
      .setAsArray(value.image)
      .flatMap((v) => extractMediaObject(v, 'ImageObject') ?? [])[0],
  };
}

function extractMediaObject<T extends string>(
  value: jsonld.NodeObject[string],
  expectedType: T,
): (MediaObject & { type: T }) | undefined {
  if (
    !jsonLdUtil.isNodeObject(value) ||
    !jsonLdUtil.setAsArray(value['@type']).includes(expectedType)
  ) {
    return;
  }

  let contentUrl = firstString(value.contentUrl);
  if (!contentUrl && expectedType === 'ImageObject') {
    contentUrl = extractThumbnailUrl(value);
  }

  if (!contentUrl) {
    return;
  }

  const width = jsonLdUtil.firstOfSet(value.width);
  const height = jsonLdUtil.firstOfSet(value.height);
  let ratio;
  if (typeof width === 'number' && typeof height === 'number') {
    ratio = { width, height };
  }

  return {
    type: expectedType,
    contentUrl,
    name: firstPronounceableText(value.name),
    encodingFormat: firstString(value.encodingFormat),
    ratio,
  };
}

function extractDefinedTerm(
  value: jsonld.NodeObject[string],
): DefinedTerm | undefined {
  if (!jsonLdUtil.isNodeObject(value)) {
    return;
  }

  const name = extractPronounceableText(value.name);
  if (!name) {
    return;
  }

  return { name };
}

function extractThumbnailUrl(value: jsonld.NodeObject): string | undefined {
  const thumbnailUrl = firstString(value.thumbnailUrl);
  if (thumbnailUrl) {
    return thumbnailUrl;
  }

  if (jsonLdUtil.isNodeObject(value.thumbnail)) {
    return firstString(value.thumbnail.contentUrl);
  }
}
