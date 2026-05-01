import {
  AtpBaseClient,
  AtUri,
  type ComAtprotoRepoGetRecord,
} from '@atproto/api';
import type { ValidationResult } from '@atproto/lexicon';
import { useEffect, useReducer, useState } from 'react';

import coalesce, { state as coalescerState } from '~/lib/coalescer';
import { useDid } from './did';
import type * as didHook from './did';

export type State<T> =
  | {
      status: 'pending';
      value?: never;
      cid?: never;
      error?: unknown;
    }
  | {
      status: 'resolved';
      value: T;
      cid: string | undefined;
      error?: never;
    }
  | {
      status: 'error';
      error: unknown;
      value?: never;
      cid?: never;
    };

export interface HookResponse<T> {
  state: State<T>;
  retry: () => void;
}

export interface HookOptions {
  cid?: string | undefined;
}

export function useUriRecord<T>(
  uri: string,
  validate: (v: Record<string, unknown>) => ValidationResult<T>,
  opts?: HookOptions,
): HookResponse<T> {
  let atUri;
  let error;
  try {
    atUri = new AtUri(uri);
  } catch (e) {
    error = e;
  }

  let rkey;
  // eslint-disable-next-line no-cond-assign
  return (rkey = atUri?.rkey)
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useDidRecord(useDid(atUri.host), atUri.collection, rkey, validate, opts)
    : // eslint-disable-next-line react-hooks/rules-of-hooks
      useDidRecord(
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useDid(undefined, error ?? new Error('Missing rkey in AT URI')),
        undefined,
        undefined,
        validate,
        opts,
      );
}

export function useDidRecord<T>(
  didRes: didHook.HookResponse,
  collection: string,
  rkey: string,
  validate: (v: Record<string, unknown>) => ValidationResult<T>,
  opts?: HookOptions,
): HookResponse<T>;
export function useDidRecord<T = Record<string, unknown>>(
  didRes: didHook.HookResponse & { state: { status: 'error' } },
  collection: string | undefined,
  rkey: string | undefined,
  validate: (v: Record<string, unknown>) => ValidationResult<T>,
  opts?: HookOptions,
): HookResponse<T>;
export function useDidRecord<T = Record<string, unknown>>(
  didRes: didHook.HookResponse,
  collection: string | undefined,
  rkey: string | undefined,
  validate: (v: Record<string, unknown>) => ValidationResult<T>,
  opts?: HookOptions,
): HookResponse<T> {
  const [state, setState] = useState<State<T>>(
    didRes.state.error
      ? {
          status: 'error',
          error: didRes.state.error,
        }
      : { status: 'pending' },
  );
  const [retryState, retry] = useReducer((x) => !x, true);

  const cid = opts?.cid;
  const repo = didRes.state.doc?.id;
  const service = didRes.state.pds;

  useEffect(() => {
    if (!service) {
      return;
    }
    // `didRes.status` has been confirmed to be not `"error"`, so this is the first overload.
    const repo_ = repo!;
    const collection_ = collection!;
    const rkey_ = rkey!;

    const abort = new AbortController();
    const signal = abort.signal;

    (async () => {
      const client = new AtpBaseClient({
        service,
      });

      const params: ComAtprotoRepoGetRecord.QueryParams = {
        repo: repo_,
        collection: collection_,
        rkey: rkey_,
      };
      if (cid) {
        params.cid = cid;
      }
      const uri = `at://${repo_}/${collection_}/${rkey_}`;
      const res = await coalesce(
        coalescerState,
        cid ? `${uri}/${cid}` : uri,
        (signal) =>
          client.com.atproto.repo.getRecord(params, signal && { signal }),
        [],
        { signal },
      );

      const result = validate(res.data.value);
      if (!result.success) {
        setState({
          status: 'error',
          error: result.error,
        });
        return;
      }

      setState({
        status: 'resolved',
        value: result.value,
        cid: res.data.cid,
      });
    })().catch((error) => {
      if (!signal.aborted) {
        setState({ status: 'error', error });
      }
    });

    return () => abort.abort();
  }, [repo, collection, rkey, cid, service, validate, retryState]);

  return {
    state,
    retry: () => {
      const error = state.status === 'error' ? state.error : null;
      setState({ status: 'pending', error });
      retry();
    },
  };
}
