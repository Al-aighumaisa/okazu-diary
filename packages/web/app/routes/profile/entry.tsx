import { OrgOkazuDiaryFeedEntry } from '@okazu-diary/api';
import { useSearchParams } from 'react-router';

import Entry from '~/components/Entry';
import Profile from '~/components/Profile';
import { useHandle } from '~/queries/handle';
import { useProfileQuery } from '~/queries/profile';
import { useRecordQuery } from '~/queries/record';
import type { Route } from './+types/entry';
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
  loaderData: { did, prefetchedHandle, urlId },
}: Pick<Route.ComponentProps, 'loaderData'>): React.ReactNode {
  const [search] = useSearchParams();
  const rkey = search.get('id');

  return EntryPageView(did, useHandle(did, prefetchedHandle).data, urlId, rkey);
}

export function HydrateFallback(): React.ReactNode {
  return EntryPageView();
}

function EntryPageView(
  did: string,
  handle: string | undefined,
  urlId: string | undefined,
  rkey: string | null,
): React.ReactNode;
function EntryPageView(): React.ReactNode;
function EntryPageView(
  did?: string,
  handle?: string,
  urlId?: string,
  rkey?: string | null,
): React.ReactNode {
  const profileQuery = useProfileQuery(did);
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
