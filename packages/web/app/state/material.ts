import {
  AtpBaseClient,
  AtUri,
  type ComAtprotoRepoGetRecord,
} from '@atproto/api';
import { getPds } from '@atproto/identity';
import { OrgOkazuDiaryMaterialExternal } from '@okazu-diary/api';
import { useEffect, useReducer, useState } from 'react';

import coalesce, { type State as CoalescerState } from '~/lib/coalescer';
import { didResolver } from '~/lib/atproto';

const coalescerState: CoalescerState<ComAtprotoRepoGetRecord.Response> =
  new Map();

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
  if (!rkey) {
    error = new Error('Missing rkey in AT URI');
  }

  const [state, setState] = useState<State>(
    error
      ? {
          status: 'error',
          error,
        }
      : {
          status: 'pending',
        },
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

  useEffect(() => {
    const abort = new AbortController();
    const signal = abort.signal;

    (async () => {
      if (!rkey) {
        return;
      }

      let didDoc;
      try {
        didDoc = await didResolver.resolve(repo);
      } catch (error) {
        if (!signal.aborted) {
          setState({
            status: 'error',
            error,
          });
        }
        return;
      }
      if (!didDoc) {
        setState({
          status: 'error',
          error: new Error('Unable to resolve DID'),
        });
        return;
      }

      const service = getPds(didDoc);
      if (!service) {
        setState({
          status: 'error',
          error: new Error('DID document does not have atproto PDS service'),
        });
        return;
      }

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
        (signal) => client.com.atproto.repo.getRecord(params, { signal }),
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
  }, [uri, cid, retryState]);

  return ret;
}
