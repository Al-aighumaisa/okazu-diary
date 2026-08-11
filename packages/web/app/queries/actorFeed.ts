import {
  Client,
  type AtIdentifierString,
  type ListOptions,
} from '@atproto/lex-client';
import { orgOkazuDiary } from '@okazu-diary/api';
import {
  keepPreviousData,
  queryOptions,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useDidQuery } from './did';

export type UseActorFeedQueryResult = UseQueryResult<UseActorFeedQueryValue>;

export interface UseActorFeedQueryValue {
  items: {
    uri: string;
    cid: string;
    value: orgOkazuDiary.feed.entry.Main;
  }[];
  next: string | undefined;
}

export function useActorFeedQuery(
  did: AtIdentifierString | undefined,
  cursor: string | null | undefined,
  reverse: boolean | undefined,
): UseActorFeedQueryResult {
  const didQuery = useDidQuery(did);

  return useQuery(
    queryOptions({
      enabled: !!didQuery.data,
      queryKey: [
        'org.okazu-diary.feed.entry',
        did,
        didQuery.data?.pds,
        cursor,
        reverse,
      ] as const,
      placeholderData: keepPreviousData,
      async queryFn({ queryKey: [_key, did_, pds_, cursor, reverse], signal }) {
        const did = did_!;
        const pds = pds_!;

        const client = new Client({ service: pds });

        const params: ListOptions = {
          repo: did,
          signal,
        };
        if (cursor) {
          params.cursor = cursor;
        }
        if (reverse) {
          params.reverse = reverse;
        }
        const res = await client.list(orgOkazuDiary.feed.entry, params);

        const items = res.records.map((r) => {
          const result = orgOkazuDiary.feed.entry.main.safeValidate(r.value);
          if (!result.success) {
            throw result.error;
          }
          return { uri: r.uri, cid: r.cid, value: result.value };
        });
        if (reverse) {
          items.reverse();
        }

        return {
          items,
          next: res.cursor,
        };
      },
    }),
  );
}
