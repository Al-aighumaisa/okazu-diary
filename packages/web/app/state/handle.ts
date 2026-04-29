import { OrgOkazuDiaryMaterialExternal } from '@okazu-diary/api';
import { useEffect, useState } from 'react';

import coalesce, { state as coalescerState } from '~/lib/coalescer';
import type * as didHook from './did';
import { getHandle, HandleResolver } from '@atproto/identity';

const handleResolver = new HandleResolver();

export function useHandle(
  didRes: didHook.HookResponse,
  prefetched?: string,
): string | undefined {
  let did: string | undefined;
  let didHandle: string | null | undefined;
  const doc = didRes.state.doc;
  if (doc) {
    did = doc.id;
    didHandle = getHandle(doc) ?? null;
  }

  const [handle, setHandle] = useState<string | undefined>(
    prefetched || didHandle === null
      ? (prefetched ?? 'handle.invalid')
      : undefined,
  );

  useEffect(() => {
    if (prefetched || !didHandle) {
      return;
    }

    const abort = new AbortController();
    const signal = abort.signal;

    (async () => {
      const roundtripDid = await coalesce(
        coalescerState,
        `at://${didHandle}`,
        (_signal) => handleResolver.resolve(didHandle),
        [],
        { signal },
      );

      if (roundtripDid === did) {
        setHandle(didHandle);
      }
    })().catch(() => {
      if (!signal.aborted) {
        setHandle('handle.invalid');
      }
    });

    return () => abort.abort();
  }, [did, didHandle, prefetched]);

  return handle;
}
