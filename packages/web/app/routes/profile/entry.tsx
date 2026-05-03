import { OrgOkazuDiaryFeedEntry } from '@okazu-diary/api';
import { useSearchParams } from 'react-router';

import Entry from '~/components/Entry';
import Profile from '~/components/Profile';
import { useDid } from '~/state/did';
import { useHandle } from '~/state/handle';
import { useProfile } from '~/state/profile';
import type * as profileHook from '~/state/profile';
import { useDidRecord } from '~/state/record';
import type * as recordHook from '~/state/record';
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

  const didRes = useDid(did);
  const entryRes =
    rkey === null
      ? // eslint-disable-next-line react-hooks/rules-of-hooks
        useDidRecord(
          {
            state: {
              status: 'error',
              error: new Error('Missing `id` parameter in URL'),
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            retry: () => {},
          },
          undefined,
          undefined,
          OrgOkazuDiaryFeedEntry.validateMain,
        )
      : // eslint-disable-next-line react-hooks/rules-of-hooks
        useDidRecord(
          didRes,
          'org.okazu-diary.feed.entry',
          rkey,
          OrgOkazuDiaryFeedEntry.validateMain,
        );
  const handle = useHandle(didRes, prefetchedHandle);

  return EntryPageView(
    did,
    handle,
    urlId,
    rkey,
    entryRes,
    useProfile(did, didRes),
  );
}

export function HydrateFallback(): React.ReactNode {
  return EntryPageView();
}

function EntryPageView(
  did: string,
  handle: string | undefined,
  urlId: string | undefined,
  rkey: string | null,
  entryRes: recordHook.HookResponse<OrgOkazuDiaryFeedEntry.Main>,
  profileRes: profileHook.HookResponse,
): React.ReactNode;
function EntryPageView(): React.ReactNode;
function EntryPageView(
  did?: string,
  handle?: string,
  urlId?: string | undefined,
  rkey?: string | null,
  entryRes?: recordHook.HookResponse<OrgOkazuDiaryFeedEntry.Main>,
  profileRes?: profileHook.HookResponse,
): React.ReactNode {
  const userName = profileRes?.state.value?.displayName;
  const datetime = entryRes?.state.value?.datetime;

  const entryRecord = entryRes?.state.value;

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
          profileRes={profileRes}
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
