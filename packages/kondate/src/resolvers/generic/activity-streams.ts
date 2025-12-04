import jsonld from 'jsonld';

import type {
  DefinedTerm,
  Metadata as GenericMetadata,
  ExtendedMetadataRecord,
  MediaObject,
  Person,
  ResolveOptions,
  ResolveResult as GenericResolveResult,
} from '../../index.js';
import { isTemporaryHTTPError, ResolveError } from '../../error.js';
import * as util from '../../util.js';
import { jsonLdUtil, mediaType } from './index.js';

declare module '../../index.js' {
  interface ExtendedMetadataRecord {
    activityStreams?: MetadataExt;
  }
}

export interface Metadata extends GenericMetadata {
  resolver: ExtendedMetadataRecord & {
    activityStreams: MetadataExt;
  };
}

export type ResolveResult = GenericResolveResult<Metadata>;

export interface MetadataExt {
  object: jsonld.NodeObject;
  actor?: jsonld.NodeObject | string | undefined;
}

const COMPACT_CONTEXT = [
  jsonLdUtil.contexts.miscellany['@context'],
  'https://w3id.org/security/v1',
  'https://www.w3.org/ns/activitystreams',
] satisfies (string | jsonld.ContextDefinition)[];

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  const res = await util.fetch(options, url, {
    headers: {
      accept:
        'application/ld+json;profile="https://www.w3.org/ns/activitystreams",application/activity+json',
    },
  });
  const response = { status: res.status, headers: res.headers };

  if (isTemporaryHTTPError(res.status)) {
    throw new ResolveError(undefined, { response: res });
  } else if (!res.ok) {
    return { value: undefined, response };
  }

  const ct = res.headers.get('content-type');
  if (!ct || mediaType.classify(ct) !== mediaType.MediaType.ActivityStreams) {
    return { value: undefined, response };
  }

  return { value: await extract(res, options), response };
}

export async function extract(
  response: Response,
  options?: Readonly<ResolveOptions>,
): Promise<Metadata | undefined> {
  const resUrl = new URL(response.url);

  const json = (await response.json()) as jsonld.JsonLdDocument;
  let object;
  try {
    object = await jsonld.compact(json, COMPACT_CONTEXT, {
      documentLoader: jsonLdUtil.makeDocumentLoader(),
      expandContext: jsonLdUtil.contexts.activityStreams['@context'],
    });
  } catch (e) {
    if (jsonLdUtil.isTemporaryJsonLdError(e)) {
      throw new ResolveError(
        `Unable to resolve JSON-LD context(s) imported from ${response.url}`,
        { cause: e },
      );
    }
    return;
  }
  if (
    typeof object.id !== 'string' ||
    new URL(object.id).origin !== resUrl.origin
  ) {
    return;
  }

  const link = parseUrl(object.url);
  const url = link ? link.href : object.id;

  let actor, creator;
  const attributedTo = await hydrateNode(
    jsonLdUtil.firstOfSet(object.attributedTo),
    resUrl.origin,
    options,
  );
  if (attributedTo !== undefined) {
    actor = attributedTo;
    if (typeof attributedTo === 'object') {
      creator = personFromActor(attributedTo);
    }
  }

  let inLanguage;

  let description;
  const contentVal = firstLangString(object.contentMap, object.content);
  if (contentVal) {
    inLanguage = contentVal.language;
    // The convention is to use the `summary` as a content warning, but we are mixing the `content`
    // anyway since the library expects the metadata to be displayed in already sensitive contexts.
    description = contentVal.value;
  }

  const summaryVal = firstLangString(object.summaryMap, object.summary);
  if (summaryVal) {
    inLanguage ??= summaryVal.language;
    description = summaryVal.value + (description ? `\n\n${description}` : '');
  }

  let name;
  const nameVal = firstLangString(object.nameMap, object.name);
  if (nameVal) {
    inLanguage ??= nameVal.language;
    name = nameVal.value;
  }

  const datePublished =
    typeof object.published === 'string' ? object.published : undefined;
  const dateModified =
    typeof object.updated === 'string' ? object.updated : undefined;

  const keywords = keywordsFromHashtags(object.tag);

  const labels = isSensitive(object) ? [{ val: 'sexual' }] : undefined;

  const ret = {
    url,
    name: name ? { textValue: name } : undefined,
    inLanguage,
    description,
    creator: creator ? [creator] : undefined,
    datePublished,
    dateModified,
    labels,
    image: undefined,
    video: undefined,
    audio: undefined,
    keywords,
    resolver: { activityStreams: { object, actor } },
  } satisfies Metadata;

  if (object.attachment) {
    for (const attachment of jsonLdUtil.setAsArray(object.attachment)) {
      if (jsonLdUtil.isNodeObject(attachment)) {
        processAttachment(ret, attachment);
      }
    }
  }

  return ret;
}

function personFromActor(actor: jsonld.NodeObject): Person & { type: string } {
  const name = firstLangString(actor.nameMap, actor.name)?.value;
  return {
    type: 'Person',
    name: name ? { textValue: name } : undefined,
    url:
      parseUrl(actor.url)?.href ??
      (typeof actor.id === 'string' ? actor.id : undefined),
    description: firstLangString(actor.summaryMap, actor.summary)?.value,
  };
}

function keywordsFromHashtags(tag: jsonld.NodeObject[string]): DefinedTerm[] {
  const ret: DefinedTerm[] = [];

  for (const t of jsonLdUtil.setAsArray(tag)) {
    if (
      jsonLdUtil.isNodeObject(t) &&
      jsonLdUtil.setAsArray(t.type).includes('Hashtag') &&
      typeof t.name === 'string'
    ) {
      ret.push({ name: { textValue: t.name } });
    }
  }

  return ret;
}

function processAttachment(
  meta: Metadata,
  attachment: jsonld.NodeObject,
): void {
  if (!attachment || typeof attachment !== 'object') {
    return;
  }

  const url = parseUrl(attachment.url);
  if (!url) {
    return;
  }

  let name;
  if (typeof attachment.name === 'string') {
    name = attachment.name;
  }

  let encodingFormat, mt;
  if (url.mediaType) {
    encodingFormat = url.mediaType;
    mt = mediaType.classify(url.mediaType);
  } else {
    switch (attachment.type) {
      case 'Image':
        mt = mediaType.MediaType.Image;
        break;
      case 'Video':
        mt = mediaType.MediaType.Video;
        break;
      case 'Audio':
        mt = mediaType.MediaType.Audio;
        break;
      case 'Document':
        if (typeof attachment.mediaType !== 'string') {
          return;
        }
        encodingFormat = attachment.mediaType;
        mt = mediaType.classify(attachment.mediaType);
    }
  }

  let ratio;
  if (url.ratio) {
    ratio = url.ratio;
  } else if (
    typeof attachment.width === 'number' &&
    typeof attachment.height === 'number'
  ) {
    ratio = { width: attachment.width, height: attachment.height };
  }

  const labels = isSensitive(attachment) ? [{ val: 'sexual' }] : undefined;

  const media = {
    contentUrl: url.href,
    name: name ? { textValue: name } : undefined,
    encodingFormat,
    ratio,
    labels,
  } satisfies MediaObject;

  switch (mt) {
    case mediaType.MediaType.Image:
      (meta.image ??= []).push(media);
      return;
    case mediaType.MediaType.Video:
      (meta.video ??= []).push(media);
      return;
    case mediaType.MediaType.Audio:
      (meta.audio ??= []).push(media);
  }
}

interface AsLink {
  href: string;
  mediaType?: string | undefined;
  ratio?: { width: number; height: number } | undefined;
}

/**
 * Normalizes an `xsd:anyURI | as:Link`.
 */
function parseUrl(url: jsonld.NodeObject[string]): AsLink | undefined {
  url = jsonLdUtil.firstOfSet(url);

  if (typeof url === 'string') {
    return {
      href: url,
      mediaType: undefined,
      ratio: undefined,
    };
  } else if (
    url &&
    typeof url === 'object' &&
    jsonLdUtil.isNodeObject(url) &&
    typeof url.href === 'string'
  ) {
    const ret: AsLink = {
      href: url.href,
      mediaType: undefined,
      ratio: undefined,
    };

    if (typeof url.mediaType === 'string') {
      ret.mediaType = url.mediaType;
    }

    if (typeof url.width === 'number' && typeof url.height === 'number') {
      ret.ratio = { width: url.width, height: url.height };
    }

    return ret;
  }
}

function isSensitive(object: jsonld.NodeObject): boolean {
  // Some implementations (used to) forget to include context definition for the `sensitive` term,
  // causing the term compact into `_:sensitive`.
  // Other implementations don't coerce the `@type` of the `sensitive` term into `xsd:boolean`
  // unlike the `miscellany` context, causing the term compact into `as:sensitive`.
  return (
    jsonLdUtil.firstOfSet(object.sensitive) === true ||
    jsonLdUtil.firstOfSet(object['as:sensitive']) === true ||
    jsonLdUtil.firstOfSet(object['_:sensitive']) === true
  );
}

/**
 * Takes the values of language-map and non-language-map terms for a natural language property and
 * returns the first string value.
 */
function firstLangString(
  langMap: jsonld.NodeObject[string],
  none: jsonld.NodeObject[string],
): jsonLdUtil.MaybeLangString | undefined {
  const entry = jsonLdUtil.firstOfLanguageMap(langMap);
  if (entry) {
    return entry;
  }

  const value = jsonLdUtil.firstOfSet(none);
  if (typeof value === 'string') {
    return { language: undefined, value };
  }
}

/**
 * Takes an `@id` term value (compacted against the AS2 context) and returns the referent node.
 * Dereferences the URI if the value is a non-embedded reference. Returns the `@id` IRI as string if
 * it couldn't be dereferenced.
 */
export async function hydrateNode(
  id: jsonld.NodeObject[string],
  origin: string,
  options?: Readonly<ResolveOptions>,
): Promise<jsonld.NodeObject | string | undefined> {
  if (id && typeof id === 'object') {
    if (!jsonLdUtil.isNodeObject(id)) {
      return;
    }
    // Not considering possible other aliases of `@id` as we're assuming the object to be compact.
    if (
      'id' in id &&
      (typeof id.id !== 'string' || new URL(id.id).origin !== origin)
    ) {
      delete id.id;
    }
    return id;
  }

  if (typeof id !== 'string') {
    return;
  }

  const response = await util.fetch(options, id, {
    headers: {
      accept:
        'application/ld+json;profile="https://www.w3.org/ns/activitystreams",application/activity+json',
    },
  });

  if (isTemporaryHTTPError(response.status)) {
    throw new ResolveError(undefined, { response });
  } else if (!response.ok) {
    return;
  }

  const ct = response.headers.get('content-type');
  if (!ct || mediaType.classify(ct) !== mediaType.MediaType.ActivityStreams) {
    return;
  }

  const json: unknown = await response.json();
  let obj;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    obj = await jsonld.compact(json as any, COMPACT_CONTEXT, {
      documentLoader: jsonLdUtil.makeDocumentLoader(),
    });
  } catch (e) {
    if (jsonLdUtil.isTemporaryJsonLdError(e)) {
      throw new ResolveError(
        `Unable to resolve JSON-LD context(s) imported from ${id}`,
        { cause: e },
      );
    }
    return id;
  }

  if (
    typeof obj.id !== 'string' ||
    new URL(obj.id).origin !== new URL(id).origin
  ) {
    return;
  }

  return obj;
}
