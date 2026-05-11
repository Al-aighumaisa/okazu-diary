import { AtpBaseClient, type ComAtprotoRepoListRecords } from '@atproto/api';
import { OrgOkazuDiaryFeedEntry } from '@okazu-diary/api';
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
    value: OrgOkazuDiaryFeedEntry.Main;
  }[];
  next: string | undefined;
}

export function useActorFeedQuery(
  did: string | undefined,
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

        const client = new AtpBaseClient({ service: pds });

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
        const res = await client.com.atproto.repo.listRecords(params, {
          signal,
        });

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

        return {
          items,
          next: res.data.cursor,
        };
      },
    }),
  );
}
