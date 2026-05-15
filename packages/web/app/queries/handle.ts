import { getHandle } from '@atproto/identity';

import { handleResolver } from '~/lib/identity';
import { useDidQuery } from './did';
import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

export type UseHandleQueryResult = UseQueryResult<string>;

export function useHandleQuery(
  did: string,
  prefetched?: string,
): UseHandleQueryResult {
  const didQuery = useDidQuery(did);

  let initialData;

  let didHandle: string | undefined;
  const doc = didQuery.data?.doc;
  if (doc) {
    didHandle = getHandle(doc);
    if (didHandle) {
      if (prefetched === didHandle) {
        initialData = didHandle;
      }
    } else {
      initialData = 'handle.invalid';
    }
  }

  const queryOpts = queryOptions({
    enabled: !!didQuery.data,
    queryKey: ['at-handle', did, didHandle],
    queryFn: async ({ queryKey: [_key, did, didHandle] }) => {
      if (didHandle && (await handleResolver.resolve(didHandle)) === did) {
        return didHandle;
      } else {
        return 'handle.invalid';
      }
    },
  });
  if (initialData !== undefined) {
    queryOpts.initialData = initialData;
  }
  return useQuery(queryOpts);
}
