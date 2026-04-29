import {
  AtpBaseClient,
  AtUri,
  type ComAtprotoRepoGetRecord,
} from '@atproto/api';
import { OrgOkazuDiaryMaterialExternal } from '@okazu-diary/api';
import { useEffect, useReducer, useState } from 'react';

import coalesce, { state as coalescerState } from '~/lib/coalescer';
import { useDid } from './did';

export type State =
  | { status: 'pending'; error?: unknown }
  | {
      status: 'resolved';
      value: OrgOkazuDiaryMaterialExternal.Main;
      cid: string | undefined;
    }
  | { status: 'error'; error: unknown };

export function useMaterial(uri: string, cid?: string): [State, () => void] {
  let repo: string, collection: string, rkey: string | undefined, error;
  try {
    const atUri = new AtUri(uri);
    [repo, collection, rkey] = [atUri.host, atUri.collection, atUri.rkey];
  } catch (e) {
    error = e;
  }

  const didRes = useDid(
    // This satisfies the overload signature since `repo` is defined iff the `uri`
    // successfully parses and has an rkey. We are not using `if` statement here to make the
    // `react-hooks/rules-of-hooks` lint happy.
    // @ts-expect-error
    repo,
    rkey ? undefined : (error ?? new Error('Missing rkey in AT URI')),
  );

  const [state, setState] = useState<State>(
    didRes.state.error
      ? {
          status: 'error',
          error: didRes.state.error,
        }
      : { status: 'pending' },
  );
  const [retryState, retry] = useReducer((x) => !x, true);
  const ret: [State, () => void] = [
    state,
    () => {
      const error = state.status === 'error' ? state.error : null;
      setState({ status: 'pending', error });
      retry();
    },
  ];

  const service = didRes.state.pds;

  useEffect(() => {
    if (!(rkey && service)) {
      return;
    }

    const abort = new AbortController();
    const signal = abort.signal;

    (async () => {
      const client = new AtpBaseClient({
        service,
      });

      const params: ComAtprotoRepoGetRecord.QueryParams = {
        repo,
        collection,
        rkey,
      };
      if (cid) {
        params.cid = cid;
      }
      const res = await coalesce(
        coalescerState,
        cid ? `${uri}/${cid}` : uri,
        (signal) =>
          client.com.atproto.repo.getRecord(params, signal && { signal }),
        [],
        { signal },
      );

      const result = OrgOkazuDiaryMaterialExternal.validateMain(res.data.value);
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
  }, [uri, cid, service, retryState]);

  return ret;
}
