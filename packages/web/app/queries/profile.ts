import { Client } from '@atproto/lex-client';
import type { BlobRef } from '@atproto/lex-data';
import type { $Typed } from '@atproto/lex-schema';
import type { AtIdentifierString } from '@atproto/syntax';
import { XRPCError } from '@atproto/xrpc';
import { appBsky, comAtproto, orgOkazuDiary } from '@okazu-diary/api';
import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useDidQuery } from './did';

export type UseProfileQueryResult = UseQueryResult<UseProfileQueryValue | null>;

export interface UseProfileQueryValue {
  displayName?: string | null | undefined;
  description?: string | null | undefined;
  website?: string | null | undefined;
  avatar?: BlobRef | null | undefined;
  labels?:
    | $Typed<comAtproto.label.defs.SelfLabels>
    | { $type: string }
    | null
    | undefined;
  lang?: string | undefined;
  alsoKnownAs?: string[] | undefined;
  createdAt?: string | null | undefined;
}

export function useProfileQuery(
  did: AtIdentifierString | undefined,
): UseProfileQueryResult {
  const didQuery = useDidQuery(did);

  const pds = didQuery.data?.pds;
  let client: Client | undefined;
  if (pds) {
    client = new Client({ service: pds });
  }

  const odQuery = useQuery(
    // `client` is derived from `pds`.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryOptions({
      enabled: !!pds,
      queryKey: ['org.okazu-diary.actor.profile', did, pds] as const,
      async queryFn({ queryKey: [_key, did_, _pds], signal }) {
        const did = did_!;

        let res;
        try {
          res = await client!.get(orgOkazuDiary.actor.profile, {
            repo: did,
            signal,
          });
        } catch (e) {
          if (e instanceof XRPCError && e.error === 'RecordNotFound') {
            return null;
          }
          throw e;
        }

        return res.value;
      },
    }),
  );

  const bskyQuery = useQuery(
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryOptions({
      enabled: !!pds && !odQuery.isError,
      queryKey: ['app.bsky.actor.profile', did, pds] as const,
      async queryFn({ queryKey: [_key, did_, _pds], signal }) {
        const did = did_!;

        let res;
        try {
          res = await client!.get(appBsky.actor.profile, {
            repo: did,
            signal,
          });
        } catch (e) {
          if (e instanceof XRPCError && e.error === 'RecordNotFound') {
            return null;
          }
          throw e;
        }

        return res.value;
      },
    }),
  );

  if (odQuery.data) {
    return odQuery;
  } else if (odQuery.data === null) {
    // Using rest destructuring to keep the type consistent with the other branches.
    // eslint-disable-next-line @tanstack/query/no-rest-destructuring
    const { data, ...rest } = bskyQuery;
    const ret: typeof rest & { data?: UseProfileQueryValue | null } = rest;
    if (data !== undefined) {
      ret.data = data && profileFromBsky(data);
    }
    return ret as UseProfileQueryResult;
  } else {
    return odQuery as UseQueryResult<null>;
  }
}

function profileFromBsky(
  profile: appBsky.actor.profile.Main,
): UseProfileQueryValue {
  return {
    displayName: profile.displayName,
    description: profile.description,
    website: profile.website,
    avatar: profile.avatar,
    // Explicitly ignoring `labels` and `createdAt` values from bsky profiles.
  };
}
