// Workaround for https://github.com/TanStack/query/issues/3090
// Reference: https://github.com/TanStack/query/issues/5988#issuecomment-1719416782

import type {
  QueryObserverLoadingResult,
  QueryObserverPendingResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { brand, type Branded } from './brand';

export type UseDeferredQueryErrorResult<D = unknown, E = Error> = Branded<
  | Exclude<
      UseQueryResult<D, E>,
      QueryObserverLoadingResult<D, E> | QueryObserverPendingResult<D, E>
    >
  | (Omit<
      QueryObserverLoadingResult<D, E> | QueryObserverPendingResult<D, E>,
      'error'
    > & { error: E | null }),
  typeof useDeferredQueryErrorResultBrand
>;

const useDeferredQueryErrorResultBrand = Symbol();

/**
 * Caches a `query.error` value while refetching the query, so that it can be kept displayed to
 * prevent layout shift, for example.
 *
 * This will destructively update the `error` property of the input, so it is unsafe to touch the
 * passed value afterwards. Preferably, this function is called right after a `useQuery` invocation,
 * like `UseDeferredQueryError(useQuery({ ... }))`.
 */
export function useDeferredQueryError<TData = unknown, TError = Error>(
  query: UseQueryResult<TData, TError>,
): UseDeferredQueryErrorResult<TData, TError> {
  const [error, setError] = useState<TError | undefined>();
  useEffect(() => {
    if (query.isError) {
      setError(query.error);
    } else if (query.isSuccess) {
      setError(undefined);
    }
    // `query.{isError,isSuccess}` is derived from `query.status`.
  }, [query.status, query.error]);

  if (query.isPending) {
    const ret: Omit<typeof query, 'error'> & { error: TError | null } = query;
    if (error) {
      ret.error = error;
    }
    return brand(ret, useDeferredQueryErrorResultBrand);
  } else {
    return brand(query, useDeferredQueryErrorResultBrand);
  }
}
