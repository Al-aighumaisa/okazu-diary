import {
  Client,
  type RecordSchema,
  type GetOutput,
  type Main,
  type XrpcRequestParams,
} from '@atproto/lex-client';
import { getMain } from '@atproto/lex-schema';
import {
  AtUri,
  type AtIdentifierString,
  type AtUriString,
} from '@atproto/syntax';
import { comAtproto } from '@okazu-diary/api';
import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useDidQuery } from './did';

export type UseRecordQueryResult<T extends RecordSchema> = UseQueryResult<
  UseRecordQueryValue<T>
>;

export type UseRecordQueryValue<T extends RecordSchema> = GetOutput<T>;

export interface UseRecordOptions {
  cid?: string | undefined;
}

export function useRecordQuery<const T extends RecordSchema>(
  ns: Main<T>,
  uri: AtUriString | null | undefined,
  opts?: UseRecordOptions,
): UseRecordQueryResult<T>;
export function useRecordQuery<const T extends RecordSchema>(
  ns: Main<T>,
  repo: AtIdentifierString | null | undefined,
  rkey: string | null,
  opts?: UseRecordOptions,
): UseRecordQueryResult<T>;
export function useRecordQuery<const T extends RecordSchema>(
  ns: Main<T>,
  repoOrUri: AtUriString | AtIdentifierString | null | undefined,
  rkeyOrOpts?: string | null | UseRecordOptions,
  opts?: UseRecordOptions,
): UseRecordQueryResult<T> {
  const schema = getMain(ns);

  let repo: AtIdentifierString | null | undefined,
    rkey: string | null | undefined,
    uriStr,
    uri: AtUri | undefined,
    error: unknown;
  if (rkeyOrOpts === null || typeof rkeyOrOpts === 'string') {
    repo = repoOrUri as Exclude<typeof repoOrUri, AtUriString>;
    rkey = rkeyOrOpts;
    uriStr = `at://${repo}/${schema.$type}/${rkey}`;
  } else {
    uriStr = repoOrUri;
    if (uriStr) {
      try {
        uri = new AtUri(uriStr);
        if (uri.collection !== schema.$type) {
          error = new Error(
            `Expected a ${schema.$type} URI, got ${uri.collection || 'no collection'}`,
          );
        } else {
          repo = uri.host;
          rkey = uri.rkey;
        }
      } catch (e) {
        error = e;
      }
    }
    opts = rkey as typeof rkey & object;
  }
  const cid = opts?.cid;

  const didQuery = useDidQuery(repo);

  return useQuery(
    // `uriStr` corresponds to `[repo, collection, rkey, error]`.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryOptions({
      enabled: !!(didQuery.data && (rkey || uriStr)),
      queryKey: [uriStr, cid, didQuery.data?.pds] as const,
      queryFn: async ({ queryKey: [_uri, cid, pds_], signal }) => {
        const pds = pds_!;

        if (error !== undefined) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw error;
        }
        // `repo`, `collection` and `rkey` is initialized now as the only case where they are
        // uninit is failure of `AtUri` ctor, in which case `error` is initialized (unless the ctor
        // were so silly to throw `undefined`).

        const client = new Client({ service: pds });

        schema.keySchema.validate(rkey);
        const params: XrpcRequestParams<typeof comAtproto.repo.getRecord.main> =
          {
            repo: repo!,
            collection: schema.$type,
            rkey: rkey!,
          };
        if (cid) {
          params.cid = cid;
        }

        const response = await client.xrpc(comAtproto.repo.getRecord, {
          params,
          signal,
        });
        const value = schema.validate(response.body.value);
        return { ...response.body, value };
      },
    }),
  );
}
