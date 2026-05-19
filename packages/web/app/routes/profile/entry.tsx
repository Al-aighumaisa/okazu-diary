import { OrgOkazuDiaryFeedEntry } from '@okazu-diary/api';
import { type default as React, useContext } from 'react';
import { useParams, useSearchParams } from 'react-router';

import Entry from '~/components/Entry';
import Profile from '~/components/Profile';
import { PrimaryProfileProvider } from '~/contexts/PrimaryProfileProvider';
import {
  PrimaryProfileContext,
  type PrimaryProfileContextValue,
} from '~/contexts/PrimaryProfileContext';
import { useDeferredQueryError } from '~/lib/useDeferredQueryError';
import { useRecordQuery } from '~/queries/record';
import type { Route } from './+types/entry';
import { parseParams } from './common';
import {
  clientLoader as homeClientLoader,
  type LoaderData as HomeLoaderData,
} from './home';
import homeStyles from './home.module.css';

interface LoaderData extends HomeLoaderData {
  urlId: string | undefined;
}

export async function clientLoader(
  args: Route.LoaderArgs,
): Promise<LoaderData> {
  return {
    ...(await homeClientLoader(args)),
    urlId: args.params.id,
  };
}

export default function EntryPage({
  loaderData: { did, paramHandle: prefetchedHandle, urlId },
}: Pick<Route.ComponentProps, 'loaderData'>): React.ReactNode {
  const [search] = useSearchParams();

  return (
    <PrimaryProfileProvider did={did} prefetchedHandle={prefetchedHandle}>
      <EntryPageView did={did} urlId={urlId} rkey={search.get('id')} />
    </PrimaryProfileProvider>
  );
}

export function HydrateFallback(): React.ReactNode {
  const unparsedParams = useParams();
  const params = parseParams(unparsedParams);
  const [search] = useSearchParams();

  return (
    <EntryPageView
      did={params?.did}
      urlId={unparsedParams.id}
      rkey={search.get('id')}
    />
  );
}

interface EntryPageViewProps {
  did: string | undefined;
  urlId: string | undefined;
  rkey: string | null;
}

function EntryPageView({
  did,
  urlId,
  rkey,
}: EntryPageViewProps): React.ReactNode {
  const profileCtx: Partial<PrimaryProfileContextValue> =
    useContext(PrimaryProfileContext) ?? {};
  const profileQuery = useDeferredQueryError(profileCtx.query);
  const handle = profileCtx.handleQuery?.data;
  const entryQuery = useRecordQuery(
    did,
    'org.okazu-diary.feed.entry',
    rkey,
    OrgOkazuDiaryFeedEntry.validateMain,
  );

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
