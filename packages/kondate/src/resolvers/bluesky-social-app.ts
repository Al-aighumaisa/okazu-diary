import { ensureValidAtIdentifier, isValidTid } from '@atproto/syntax';

import type { ResolveOptions, ResolveResult } from '../index.js';
import { extensions, http } from './generic/index.js';

const hosts = [
  'bsky.app',
  'blacksky.community',
  'deer.social',
  'zeppelin.social',
];

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (hosts.includes(url.host)) {
    // Do not fail early for unkown hosts because this might be yet another bsky frontend.
    // But we know that all the known domains support HTTPS at least.
    url.protocol = 'https';
  }

  const atUri = extractAtUri(url);
  if (atUri && options?.preferDiscovered?.includes('at-uri')) {
    return {
      value: atUri
        ? {
            url: atUri,
            resolver: { at: { uri: atUri } },
          }
        : undefined,
      response: undefined,
    };
  }

  const result =
    url.host !== 'zeppelin.social'
      ? await http.resolve(url, options)
      : // Zeppelin has sunset and the site takes forever to respond as of this writing. It's not
        // even clear if they're going to maintain the domain, so try not to resolve the site.
        // https://bsky.app/profile/did:plc:uu5axsmbm2or2dngy4gwchec/post/3lze6etev6s25
        { value: undefined, response: undefined };

  if (atUri) {
    ((result.value ??= {}).resolver ??= {}).at ??= { uri: atUri };
  }

  return result;
}

function extractAtUri(url: URL): string | undefined {
  if (!url.pathname.startsWith('/profile/')) {
    return;
  }

  const [id, collectionish, rkey, ...rest] = url.pathname
    .slice('/profile/'.length)
    .split('/');

  if (rest.some((x) => x)) {
    return;
  }

  try {
    ensureValidAtIdentifier(id);
  } catch {
    return;
  }

  if (!collectionish && !rkey) {
    return `at://${id}/app.bsky.actor.profile/self`;
  }

  if (!rkey || !isValidTid(rkey)) {
    return;
  }

  let collection;
  switch (collectionish) {
    case 'post':
      collection = 'app.bsky.feed.post';
      break;
    case 'lists':
      collection = 'app.bsky.graph.list';
      break;
    case 'feed':
      collection = 'app.bsky.feed.generator';
      break;
    default:
      return;
  }

  return `at://${id}/${collection}/${rkey}`;
}

extensions.registerHosts(hosts, resolve);
