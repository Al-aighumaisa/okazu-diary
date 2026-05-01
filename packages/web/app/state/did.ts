import { getPds, type DidDocument } from '@atproto/identity';
import { useEffect, useReducer, useState } from 'react';

import { didResolver, getPrefetchedDid } from '~/lib/identity';

export type State = PendingState | ResolvedState | ErrorState;

interface PendingState {
  status: 'pending';
  error: unknown;
  doc?: never;
  pds?: never;
}
interface ResolvedState {
  status: 'resolved';
  doc: DidDocument;
  pds: string;
  error?: never;
}
interface ErrorState {
  status: 'error';
  error: unknown;
  doc?: never;
  pds?: never;
}

export interface HookResponse {
  state: State;
  retry: () => void;
}

export function useDid(did: string): HookResponse;
export function useDid(
  did: undefined,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  error: {},
): HookResponse & { state: ErrorState };
export function useDid(did: string | undefined, error?: unknown): HookResponse {
  let init: State | undefined;

  let prefetched: DidDocument | null;
  if (did) {
    // Speculatively use a prefetched DID doc if available, and check for the upstream doc later in
    // the background and update the state as needed.
    prefetched = getPrefetchedDid(did);
    if (prefetched) {
      const pds = getPds(prefetched);
      if (pds) {
        init = {
          status: 'resolved',
          doc: prefetched,
          pds,
        };
      }
      // If the prefetched DID doc doesn't have a PDS service, ignore the doc and defer until the
      // latest doc is fetched.
    }
  }

  const [state, setState] = useState<State>(
    init ?? {
      status: 'pending',
      error,
    },
  );

  const [retryState, retry] = useReducer((x) => !x, true);

  useEffect(() => {
    if (error) {
      return;
    }
    const did_ = did!;

    const abort = new AbortController();
    const signal = abort.signal;

    (async () => {
      let value = prefetched;
      try {
        value = await didResolver.resolve(did_);
      } catch (error) {
        if (!value) {
          if (!signal.aborted) {
            setState({
              status: 'error',
              error,
            });
          }
          return;
        }
        console.warn(
          `Unable to resolve ${did_}, falling back on the prefetched document:`,
          error,
        );
      }
      if (!value) {
        setState({
          status: 'error',
          error: new Error(`Unable to resolve ${did_}`),
        });
        return;
      }

      const pds = getPds(value);
      if (!pds) {
        setState({
          status: 'error',
          error: new Error(
            `DID document for ${did_} does not have Atproto PDS service`,
          ),
        });
        return;
      }

      setState({
        status: 'resolved',
        doc: value,
        pds,
      });
    })().catch((error) => {
      if (!signal.aborted) {
        setState({ status: 'error', error });
      }
    });

    return () => abort.abort();
  }, [did, error, retryState]);

  return {
    state,
    retry: () => {
      const error = state.status === 'error' ? state.error : null;
      setState({ status: 'pending', error });
      retry();
    },
  };
}
