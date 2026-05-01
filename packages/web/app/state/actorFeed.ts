import { AtpBaseClient, type ComAtprotoRepoListRecords } from '@atproto/api';
import { OrgOkazuDiaryFeedEntry } from '@okazu-diary/api';
import { useEffect, useReducer, useState } from 'react';

import type * as didHook from './did';

export type State =
  | { status: 'pending'; error: unknown }
  | {
      status: 'resolved';
      items: {
        uri: string;
        cid: string;
        value: OrgOkazuDiaryFeedEntry.Main;
      }[];
      next: string | undefined;
      error?: never;
    }
  | { status: 'error'; error: unknown };

export interface HookResponse {
  state: State;
  retry: () => void;
}

export function useActorFeed(
  did: string,
  didRes: didHook.HookResponse,
  cursor: string | null,
  reverse: boolean,
): HookResponse {
  const [state, setState] = useState<State>({
    status:
      didRes.state.status === 'resolved' ? 'pending' : didRes.state.status,
    error: didRes.state.error,
  });
  const [retryState, retry] = useReducer((x) => !x, true);

  const pds = didRes.state.pds;

  useEffect(() => {
    if (!pds) {
      return;
    }

    const client = new AtpBaseClient({ service: pds });

    const abort = new AbortController();
    const signal = abort.signal;

    (async () => {
      const params: ComAtprotoRepoListRecords.QueryParams = {
        repo: did,
        collection: 'org.okazu-diary.feed.entry',
      };
      if (cursor) {
        params.cursor = cursor;
      }
      if (reverse) {
        params.reverse = reverse;
      }
      const res = await client.com.atproto.repo.listRecords(params, { signal });

      const items = res.data.records.map((r) => {
        const result = OrgOkazuDiaryFeedEntry.validateMain(r.value);
        if (!result.success) {
          throw result.error;
        }
        return { uri: r.uri, cid: r.cid, value: result.value };
      });
      if (reverse) {
        items.reverse();
      }

      setState({
        status: 'resolved',
        items,
        next: res.data.cursor,
      });
    })().catch((error) => {
      if (!signal.aborted) {
        setState({ status: 'error', error });
      }
    });

    return () => abort.abort();
  }, [did, pds, cursor, reverse, retryState]);

  return {
    state,
    retry: () => {
      const error = didRes.state.error ?? state.error ?? null;
      setState({ status: 'pending', error });
      if (didRes.state.status === 'error') {
        didRes.retry();
      } else {
        retry();
      }
    },
  };
}
