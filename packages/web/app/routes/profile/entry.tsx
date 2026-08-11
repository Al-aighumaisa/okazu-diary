import { getPds } from '@atproto/identity';
import { orgOkazuDiary } from '@okazu-diary/api';
import { type default as React, useContext } from 'react';
import { useParams, useSearchParams } from 'react-router';

import Entry from '~/components/Entry';
import Profile from '~/components/Profile';
import {
  PrimaryProfileContext,
  type PrimaryProfileContextValue,
} from '~/contexts/PrimaryProfileContext';
import { getPrefetchedDid } from '~/lib/identity';
import { useDeferredQueryError } from '~/lib/useDeferredQueryError';
import { useRecordQuery } from '~/queries/record';
import type { Route } from './+types/entry';
import { parseProfileParams } from './common';
import homeStyles from './home.module.css';

export default function EntryPage({
  params: { id: urlId },
}: Pick<Route.ComponentProps, 'params'>): React.ReactNode {
  const params = parseProfileParams(useParams());
  const did = params?.did;

  const [search] = useSearchParams();
  const rkey = search.get('id');

  const profileCtx: Partial<PrimaryProfileContextValue> =
    useContext(PrimaryProfileContext) ?? {};
  const profileQuery = useDeferredQueryError(profileCtx.query);
  const handle = profileCtx.handleQuery?.data;
  const entryQuery = useRecordQuery(orgOkazuDiary.feed.entry, did, rkey);

  const prefetchedDidDoc = did && getPrefetchedDid(did);
  const preloadPds = prefetchedDidDoc && getPds(prefetchedDidDoc);

  const userName = profileQuery?.data?.displayName;
  const datetime = entryQuery?.data?.value.datetime;

  const entryRecord = entryQuery?.data?.value;

  return (
    <>
      <title>
        {userName
          ? datetime
            ? `${userName}’s entry at ${datetime} — Okazu Diary`
            : `${userName}’s entry — Okazu Diary`
          : datetime
            ? `Entry at ${datetime} — Okazu Diary`
            : `Entry — Okazu Diary`}
      </title>
      {preloadPds && (
        <link
          rel="preload"
          as="fetch"
          crossOrigin=""
          href={
            new URL(
              `/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=org.okazu-diary.feed.entry&rkey=${rkey}`,
              preloadPds,
            ).href
          }
        />
      )}
      {did && rkey && (
        <link
          rel="alternate"
          href={`at://${did}/org.okazu-diary.feed.entry/${rkey}`}
        />
      )}
      <header className={homeStyles.header}>
        <Profile
          did={did}
          profileQuery={profileQuery}
          handle={handle}
          url={urlId ? `/${urlId}/` : '/'}
        />
      </header>
      <main className={homeStyles.feedItem}>
        {entryRecord ? (
          <Entry actor={did!} record={entryRecord} url={`?id=${rkey!}`} />
        ) : (
          <Entry />
        )}
      </main>
    </>
  );
}
