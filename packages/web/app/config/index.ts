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

export const allowed_dids: readonly string[] =
  vite_okazu_diary_web_allowed_dids_array.includes('*')
    ? []
    : vite_okazu_diary_web_allowed_dids_array;

export let primary_did: string | undefined;
const [did, ...rest] = allowed_dids;
if (did !== undefined && !rest.length) {
  primary_did = did;
}

export const plc =
  // Meant to ignore empty strings as well.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  import.meta.env.VITE_OKAZU_DIARY_WEB_PLC || 'https://plc.directory';

export const bsky_cdn =
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  import.meta.env.VITE_OKAZU_DIARY_WEB_BSKY_CDN || 'https://cdn.bsky.app';

export const prefetchedDids = new Map<
  string,
  DidDocument | CompatibleOperation
>(Object.entries(prefetchedDidsJson));
