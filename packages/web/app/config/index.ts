import type { CompatibleOperation } from '@atcute/did-plc';
import type { DidDocument } from '@atproto/identity';

import prefetchedDidsJson from './prefetched-dids.json';

const vite_okazu_diary_web_allowed_dids =
  import.meta.env.VITE_OKAZU_DIARY_WEB_ALLOWED_DIDS?.trim();
if (!vite_okazu_diary_web_allowed_dids) {
  throw new Error(
    'VITE_OKAZU_DIARY_WEB_ALLOWED_DIDS environment variable must be set',
  );
}

const vite_okazu_diary_web_allowed_dids_array =
  vite_okazu_diary_web_allowed_dids.split(/\s+/);

export let allowed_dids: readonly `did:${string}`[];
if (vite_okazu_diary_web_allowed_dids_array.includes('*')) {
  allowed_dids = [];
} else if (
  vite_okazu_diary_web_allowed_dids_array.every((s) => s.startsWith('did:'))
) {
  allowed_dids = vite_okazu_diary_web_allowed_dids_array as `did:${string}`[];
} else {
  throw new Error(
    'VITE_OKAZU_DIARY_WEB_ALLOWED_DIDS environment variable must be a list of valid DIDs',
  );
}

export let primary_did: `did:${string}` | undefined;
const [did, ...rest] = allowed_dids;
if (did !== undefined && !rest.length) {
  primary_did = did;
}

export const plc =
  import.meta.env.VITE_OKAZU_DIARY_WEB_PLC || 'https://plc.directory';

export const bsky_cdn =
  import.meta.env.VITE_OKAZU_DIARY_WEB_BSKY_CDN || 'https://cdn.bsky.app';

export const prefetchedDids = new Map<
  string,
  DidDocument | CompatibleOperation
>(Object.entries(prefetchedDidsJson));

export function isAllowedDid(did: string): boolean {
  const a: readonly string[] = allowed_dids;
  return !a.length || a.includes(did);
}
