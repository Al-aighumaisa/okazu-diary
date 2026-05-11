import {
  AtpBaseClient,
  AtUri,
  type ComAtprotoRepoGetRecord,
} from '@atproto/api';
import type { ValidationResult } from '@atproto/lexicon';
import {
  queryOptions,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { useDidQuery } from './did';

export type UseRecordQueryResult<T> = UseQueryResult<UseRecordQueryValue<T>>;

export interface UseRecordQueryValue<T> {
  value: T;
  cid: string | undefined;
}

export interface UseRecordOptions {
  cid?: string | undefined;
}

export function useRecordQuery<T>(
  uri: string | null | undefined,
  validate: (v: Record<string, unknown>) => ValidationResult<T>,
  opts?: UseRecordOptions,
): UseRecordQueryResult<T>;
export function useRecordQuery<T>(
  repo: string | null | undefined,
  collection: string | null | undefined,
  rkey: string | null | undefined,
  validate: (v: Record<string, unknown>) => ValidationResult<T>,
  opts?: UseRecordOptions,
): UseRecordQueryResult<T>;
export function useRecordQuery<T>(
  repoOrUri: string | null | undefined,
  collectionOrValidate:
    | string
    | null
    | undefined
    | ((v: Record<string, unknown>) => ValidationResult<T>),
  rkeyOrOpts: string | null | undefined | UseRecordOptions | void,
  maybeValidate: ((v: Record<string, unknown>) => ValidationResult<T>) | void,
  opts?: UseRecordOptions | void,
): UseRecordQueryResult<T> {
  let repo: string | null | undefined,
    collection: string | null | undefined,
    rkey: string | null | undefined,
    validate,
    uriStr,
    uri: AtUri | undefined,
    error: unknown;
  if (maybeValidate) {
    repo = repoOrUri;
    collection = collectionOrValidate as typeof collectionOrValidate & string;
    rkey = rkeyOrOpts as typeof rkeyOrOpts & string;
    validate = maybeValidate!;
    uriStr = `at://${repo}/${collection}/${rkey}`;
  } else {
    uriStr = repoOrUri;
    if (uriStr) {
      try {
        uri = new AtUri(uriStr);
        repo = uri.host;
        collection = uri.collection;
        rkey = uri.rkey;
      } catch (e) {
        error = e;
      }
    }
    validate = collectionOrValidate as NonNullable<
      typeof collectionOrValidate & typeof maybeValidate
    >;
    opts = rkeyOrOpts as typeof rkeyOrOpts & object;
  }
  const cid = opts?.cid;

  const didQuery = useDidQuery(repo);

  return useQuery(
    // `uriStr` corresponds to `[repo, collection, rkey, error]`.
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryOptions({
      enabled: !!(didQuery.data && ((collection && rkey) || uriStr)),
      queryKey: [uriStr, cid, validate, didQuery.data?.pds] as const,
      queryFn: async ({ queryKey: [_uri, cid, validate, pds_], signal }) => {
        const pds = pds_!;

        if (error !== undefined) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw error;
        }
        // `repo`, `collection` and `rkey` is initialized now as the only case where they are
        // uninit is failure of `AtUri` ctor, in which case `error` is initialized (unless the ctor
        // were so silly to throw `undefined`).

        const client = new AtpBaseClient({ service: pds });

        const params: ComAtprotoRepoGetRecord.QueryParams = {
          repo: repo!,
          collection: collection!,
          rkey: rkey!,
        };
        if (cid) {
          params.cid = cid;
        }
        const res = await client.com.atproto.repo.getRecord(params, { signal });

        const result = validate(res.data.value);
        if (!result.success) {
          throw result.error;
        }

        return {
          value: result.value,
          cid: res.data.cid,
        };
      },
    }),
  );
}
