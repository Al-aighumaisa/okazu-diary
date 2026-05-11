import { getPds, type DidDocument } from '@atproto/identity';
import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { didResolver, getPrefetchedDid } from '~/lib/identity';

export interface QueryValue {
  doc: DidDocument;
  pds: string;
}

export function useDidQuery(
  did: string | null | undefined,
): UseQueryResult<QueryValue> {
  // Speculatively use a prefetched DID doc if available.
  let initialData: QueryValue | undefined;
  if (did) {
    const doc = getPrefetchedDid(did);
    if (doc) {
      const pds = getPds(doc);
      if (pds) {
        initialData = { doc, pds };
      }
    }
  }

  const queryOpts = queryOptions({
    enabled: !!did,
    queryKey: [did],
    async queryFn({ queryKey: [did_] }) {
      const did = did_!;

      const doc = await didResolver.resolve(did);
      if (!doc) {
        throw new Error(`Unable to resolve ${did}`);
      }

      const pds = getPds(doc);
      if (!pds) {
        throw new Error(
          `DID document for ${did} does not have Atproto PDS service`,
        );
      }

      return { doc, pds };
    },
  });
  if (initialData) {
    queryOpts.initialData = initialData;
  }

  return useQuery(queryOpts);
}
