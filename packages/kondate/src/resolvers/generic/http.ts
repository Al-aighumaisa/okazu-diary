import contentDisposition from 'content-disposition';
import Link from 'http-link-header';

import type { Metadata, ResolveOptions, ResolveResult } from '../../index.js';
import { isTemporaryHTTPError, ResolveError } from '../../error.js';
import * as util from '../../util.js';
import { as2, html, mediaType } from './index.js';

declare module '../../index.js' {
  interface ExtendedMetadataRecord {
    at?: ATMetadataExt | undefined;
  }
}

export interface ATMetadataExt {
  uri: string;
}

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  if (!/https?:\/\//.test(url.toString())) {
    return { value: undefined, response: undefined };
  }

  const res = await util.fetch(options, url, {
    headers: {
      // Not including `*/*` as that would break Mastodon interop.
      accept:
        'application/ld+json;profile="https://www.w3.org/ns/activitystreams",application/activity+json;q=0.9,text/html,application/xhtml+xml,application/xml;q=0.8',
    },
  });

  if (isTemporaryHTTPError(res.status)) {
    throw new ResolveError(undefined, { response: res });
  }

  let asLink, atLink;

  const link = res.headers.get('link');
  if (link) {
    const ret = getAlternateLink(link, res.url);
    switch (ret?.[0]) {
      case 'activity-streams':
        if (ret[1]) {
          asLink = ret[1];
        }
        break;
      case 'at-uri':
        if (ret[1]) {
          atLink = ret[1];
        }
    }
  }

  for (const prefer of options?.preferDiscovered ?? []) {
    switch (prefer) {
      case 'activity-streams':
        if (asLink) {
          void res.body?.cancel();
          return as2.resolve(asLink, options);
        }
        break;
      case 'at-uri':
        if (atLink) {
          void res.body?.cancel();
          return {
            value: {
              url: atLink,
              resolver: { at: { uri: atLink } },
            },
            response: { status: res.status, headers: res.headers },
          };
        }
    }
  }

  let mt;
  const contentType = res.headers.get('content-type') ?? undefined;
  if (contentType) {
    mt = mediaType.classify(contentType);
  }

  let value: Metadata | undefined;
  const response = { status: res.status, headers: res.headers };

  const mediaObject = {
    contentUrl: res.url,
    encodingFormat: contentType,
  };
  switch (mt) {
    case mediaType.MediaType.HTML:
    case mediaType.MediaType.XML:
      return {
        value: (await html.extract(res, options)).value,
        response,
      };
    case mediaType.MediaType.ActivityStreams:
      return { value: await as2.extract(res, options), response };
    case mediaType.MediaType.Image:
      value = { image: [mediaObject] };
    // Fall through
    case mediaType.MediaType.Video:
      value ??= { video: [mediaObject] };
    // Fall through
    case mediaType.MediaType.Audio: {
      value ??= { audio: [mediaObject] };

      void res.body?.cancel();

      const name = extractFilename(res);
      if (name) {
        value.name = { textValue: name };
      }
    }
  }
  // TODO: Should we try MIME sniffing?

  if (atLink) {
    ((value ??= {}).resolver ??= {}).at ??= { uri: atLink };
  }

  return { value, response };
}

function getAlternateLink(
  value: string,
  base: string,
): ['activity-streams' | 'at-uri', string] | undefined {
  let parsed;
  try {
    parsed = Link.parse(value);
  } catch {
    return;
  }

  for (const ref of parsed.refs) {
    if (ref.rel !== 'alternate') {
      continue;
    }

    if (ref.uri.startsWith('at://')) {
      return ['at-uri', ref.uri];
    }

    if (ref.type) {
      switch (mediaType.classify(ref.type)) {
        case mediaType.MediaType.ActivityStreams: {
          return ['activity-streams', new URL(ref.uri, base).href];
        }
      }
    }
  }
}

function extractFilename(response: Response): string | undefined {
  const contentDispositionHeader = response.headers.get('content-disposition');
  if (contentDispositionHeader) {
    const parsed = contentDisposition.parse(contentDispositionHeader);
    const ret = parsed.parameters['filename*'] ?? parsed.parameters.filename;
    if (ret) {
      return ret;
    }
  }

  try {
    return new URL(response.url).pathname.split('/').at(-1);
  } catch {
    // noop
  }
}
