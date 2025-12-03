import type { AtpBaseClient, ComAtprotoRepoListRecords } from '@atproto/api';
import { OrgOkazuDiaryFeedEntry } from '@okazu-diary/api';
import { useEffect, useState } from 'react';

export type State =
  | { status: 'pending' }
  | {
      status: 'resolved';
      items: {
        cid: string;
        value: OrgOkazuDiaryFeedEntry.Main;
      }[];
      next: string | undefined;
    }
  | { status: 'error'; error: unknown };

export function useActorFeed(
  did: string,
  client: AtpBaseClient,
  cursor: string | null,
  reverse: boolean,
): State {
  const [state, setState] = useState<State>({ status: 'pending' });

  useEffect(() => {
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
        return { cid: r.cid, value: result.value };
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
      setState({ status: 'error', error });
    });

    return () => abort.abort();
  }, [did, cursor, reverse]);

  return state;
}
