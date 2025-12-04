import { JSDOM, VirtualConsole } from 'jsdom';

import type {
  AudioObject,
  MediaObject,
  Metadata,
  ResolveOptions,
} from '../../index.js';
import { robustParseJSON } from '../../util.js';
import { as2, schemaOrg, mediaType } from './index.js';

declare module '../../index.js' {
  interface ExtendedMetadataRecord {
    html?: HTMLHeadMetadataExt;
  }
}

export interface HTMLHeadMetadataExt {
  title?: string | undefined;
  canonical?: string | undefined;
  og?: OGPMetadata | undefined;
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name#meta_names_defined_in_the_html_specification
  author?: string | undefined;
  creator?: string[] | undefined;
  publisher?: string | undefined;
  robots?: string | undefined;
  description?: string | undefined;
  keywords?: string[] | undefined;
  // https://developers.google.com/search/docs/crawling-indexing/special-tags#rating
  // https://www.rtalabel.org/index.php?content=howto
  rating?: string | undefined;
}

// https://ogp.me/
export interface OGPMetadata {
  title?: string | undefined;
  type?: string | undefined;
  image?: OgImage[] | undefined;
  url?: string;
  audio?: OgAudio[] | undefined;
  description?: string | undefined;
  locale?: OgLocale | undefined;
  siteName?: string | undefined;
  video?: OgVideo[] | undefined;
}

export interface OgMedia {
  url: string;
  secureUrl?: string | undefined;
  type?: string | undefined;
}

export interface OgImage extends OgMedia {
  width?: number | undefined;
  height?: number | undefined;
  alt?: string | undefined;
}

export interface OgVideo extends OgImage {}

export interface OgAudio extends OgMedia {}

export interface OgLocale {
  locale: string;
  alternate?: string[];
}

export async function extract(
  response: Response,
  options?: Readonly<ResolveOptions>,
): Promise<{ value: Metadata; document: Document }> {
  const contentType = response.headers.get('content-type') ?? undefined;
  const dom = new JSDOM(await response.arrayBuffer(), {
    url: response.url,
    contentType,
    virtualConsole: new VirtualConsole(),
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  let as2Result: (as2.ResolveResult & { value: {} }) | undefined;
  let schemaOrgMeta: schemaOrg.Metadata | undefined;
  const head: HTMLHeadMetadataExt = {};
  const og: OGPMetadata = {};

  // Scan `<head>` and collect extended metadata record values:
  for (const elt of dom.window.document.head.children) {
    if (elt instanceof dom.window.HTMLMetaElement) {
      if (!elt.content) {
        continue;
      }

      processMetaName(head, elt.name, elt.content);

      const propertyAttr = elt.attributes.getNamedItem('property');
      if (propertyAttr) {
        processMetaProperty(og, propertyAttr.value, elt.content);
      }
    } else if (elt instanceof dom.window.HTMLLinkElement) {
      for (const rel of elt.relList) {
        if (!elt.href) {
          continue;
        }

        switch (rel) {
          case 'alternate':
            if (!elt.href) {
              continue;
            }

            switch (mediaType.classify(elt.type)) {
              case mediaType.MediaType.ActivityStreams: {
                const res = await as2.resolve(elt.href, options);
                if (res.value) {
                  as2Result = res as typeof res & {
                    value: NonNullable<typeof res.value>;
                  };
                }
                continue;
              }
            }
            break;
          case 'canonical':
            head.canonical = elt.href;
        }
      }
    } else if (elt instanceof dom.window.HTMLScriptElement) {
      if (elt.type !== 'application/ld+json') {
        continue;
      }

      const json = robustParseJSON(elt.innerHTML);
      if (json) {
        const value = await schemaOrg.extractMaybeSchemaOrg(json);
        if (value) {
          schemaOrgMeta = value;
        }
      }
    }
  }

  // Hydrate the extended metadata record values into the main metadata value, in order of priority
  // of AS2 > Schema.org > OGP > other `<head>` elements:
  let value: Metadata;
  if (as2Result) {
    const v = as2Result.value;
    if (schemaOrgMeta) {
      v.resolver.schemaOrg = schemaOrgMeta.resolver.schemaOrg;
    }
    value = v;
  } else if (schemaOrgMeta) {
    value = schemaOrgMeta;
  } else {
    value = {};
  }

  if (og.title) {
    value.name ??= { textValue: og.title };
  }

  if (og.image?.length) {
    value.image ??= og.image.map(mediaObjectFromOg);
  }

  if (og.video?.length) {
    value.video ??= og.video.map(mediaObjectFromOg);
  }

  if (og.audio?.length) {
    value.audio ??= og.audio.map(audioObjectFromOgAudio);
  }

  if (Object.values(og).some((x) => x)) {
    head.og = og;
  }

  if ((head.title = dom.window.document.title)) {
    value.name ??= { textValue: head.title };
  }

  if (
    head.rating &&
    ['adult', 'RTA-5042-1996-1400-1577-RTA'].includes(head.rating)
  ) {
    (value.labels ??= []).push({ val: 'sexual' });
  }

  if (Object.values(head).some((x) => x)) {
    (value.resolver ??= {}).html = head;
  }

  value.url ||= og.url || head.canonical;
  value.description ||= head.description;

  if (head.creator) {
    value.creator ??= head.creator.map((name) => ({
      type: 'Person',
      name: { textValue: name },
    }));
  }

  return { value, document: dom.window.document };
}

function processMetaName(
  head: HTMLHeadMetadataExt,
  name: string,
  content: string,
): void {
  switch (name) {
    case 'creator':
      (head.creator ??= []).push(content);
      return;
    case 'keywords':
      head.keywords = content.split(',');
      return;
    case 'author':
    case 'publisher':
    case 'robots':
    case 'description':
    case 'rating':
      head[name] = content;
      return;
  }
}

function processMetaProperty(
  og: OGPMetadata,
  property: string,
  content: string,
): void {
  switch (property) {
    case 'og:title':
      og.title = content;
      return;
    case 'og:image':
    case 'og:image:url':
      (og.image ??= []).push({ url: content });
      return;
    case 'og:image:type': {
      const image = og.image?.at(-1);
      if (image) {
        image.type = content;
      }
      return;
    }
    case 'og:image:secure_url': {
      const image = og.image?.at(-1);
      if (image) {
        image.secureUrl = content;
      }
      return;
    }
    case 'og:image:width': {
      const image = og.image?.at(-1);
      if (image) {
        const width = Number(content);
        if (!Number.isNaN(width)) {
          image.width = width;
        }
      }
      return;
    }
    case 'og:image:height': {
      const image = og.image?.at(-1);
      if (image) {
        const height = Number(content);
        if (!Number.isNaN(height)) {
          image.height = height;
        }
      }
      return;
    }
    case 'og:image:alt': {
      const image = og.image?.at(-1);
      if (image) {
        image.alt = content;
      }
      return;
    }
    case 'og:video':
    case 'og:video:url':
      (og.video ??= []).push({ url: content });
      return;
    case 'og:video:type': {
      const video = og.video?.at(-1);
      if (video) {
        video.type = content;
      }
      return;
    }
    case 'og:video:secure_url': {
      const video = og.video?.at(-1);
      if (video) {
        video.secureUrl = content;
      }
      return;
    }
    case 'og:video:width': {
      const video = og.video?.at(-1);
      if (video) {
        const width = Number(content);
        if (!Number.isNaN(width)) {
          video.width = width;
        }
      }
      return;
    }
    case 'og:video:height': {
      const video = og.video?.at(-1);
      if (video) {
        const height = Number(content);
        if (!Number.isNaN(height)) {
          video.height = height;
        }
      }
      return;
    }
    case 'og:video:alt': {
      const video = og.video?.at(-1);
      if (video) {
        video.alt = content;
      }
      return;
    }
    case 'og:audio':
    case 'og:audio:url':
      (og.audio ??= []).push({ url: content });
      return;
    case 'og:audio:type': {
      const audio = og.audio?.at(-1);
      if (audio) {
        audio.type = content;
      }
      return;
    }
    case 'og:audio:secure_url': {
      const audio = og.audio?.at(-1);
      if (audio) {
        audio.secureUrl = content;
      }
      return;
    }
  }
}

function mediaObjectFromOg(og: OgImage): MediaObject & { type?: never } {
  const ret: MediaObject & { type?: never } = {
    contentUrl: og.secureUrl ?? og.url,
  };

  if (og.type !== undefined) {
    ret.encodingFormat = og.type;
  }

  if (og.width !== undefined && og.height !== undefined) {
    ret.ratio = { width: og.width, height: og.height };
  }

  if (og.alt !== undefined) {
    ret.name = { textValue: og.alt };
  }

  return ret;
}

function audioObjectFromOgAudio(og: OgAudio): AudioObject {
  const ret: AudioObject = {
    contentUrl: og.secureUrl ?? og.url,
  };

  if (og.type !== undefined) {
    ret.encodingFormat = og.type;
  }

  return ret;
}
