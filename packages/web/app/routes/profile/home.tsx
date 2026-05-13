import type React from 'react';
import { Link, useSearchParams } from 'react-router';

import Entry from '~/components/Entry';
import Profile from '~/components/Profile';
import { allowed_dids, primary_did } from '~/config';
import { handleResolver } from '~/lib/identity';
import { useDeferredQueryError } from '~/lib/useDeferredQueryError';
import { useActorFeedQuery } from '~/queries/actorFeed';
import { useHandle } from '~/queries/handle';
import { useProfileQuery } from '~/queries/profile';
import type { Route } from './+types/home';
import styles from './home.module.css';
import { useOAuthContext } from '~/contexts/OAuthContext';

export interface LoaderData {
  did: string;
  prefetchedHandle: string | undefined;
}

export async function clientLoader({
  params: { id },
}: Pick<Route.LoaderArgs, 'params'>): Promise<LoaderData> {
  let did, prefetchedHandle;

  if (id) {
    if (id.startsWith('@')) {
      prefetchedHandle = id.slice(1);
      did = await handleResolver.resolve(prefetchedHandle);
      if (!did) {
        throw new Response(null, { status: 404 });
      }
    } else if (/^did(?::|%3A)/i.test(id)) {
      did = decodeURIComponent(id);
    } else {
      throw new Response(null, { status: 404 });
    }

    if (allowed_dids.length && !allowed_dids.includes(did)) {
      throw new Response(null, { status: 404 });
    }
  } else {
    // TODO: Use a prefetched handle for this case.
    did = primary_did!;
  }

  return { did, prefetchedHandle };
}

export default function ProfilePage({
  loaderData: { did, prefetchedHandle },
}: Pick<Route.ComponentProps, 'loaderData'>): React.ReactNode {
  const [search] = useSearchParams();

  return ProfilePageView(
    did,
    useHandle(did, prefetchedHandle).data,
    search.get('cursor'),
    search.get('reverse') === '1',
  );
}

export function HydrateFallback(): React.ReactNode {
  return ProfilePageView();
}

function ProfilePageView(): React.ReactNode;
function ProfilePageView(
  did: string,
  handle: string | undefined,
  cursor: string | null,
  reverse: boolean,
): React.ReactNode;
function ProfilePageView(
  did?: string,
  handle?: string,
  cursor?: string | null,
  reverse?: boolean,
): React.ReactNode {
  const profileQuery = useDeferredQueryError(useProfileQuery(did));
  const feedQuery = useDeferredQueryError(
    useActorFeedQuery(did, cursor, reverse),
  );

  const { session } = useOAuthContext();
  const isAuthenticated = did && session?.sub === did;

  let prevPage, nextPage;
  if (cursor) {
    if (reverse) {
      nextPage = `?cursor=${cursor}`;
    } else {
      prevPage = `?cursor=${cursor}&reverse=1`;
    }
  }

  let feedContent;
  switch (feedQuery?.status) {
    case 'pending':
    case undefined:
      if (!feedQuery?.error) {
        feedContent = (
          <ul>
            {[...Array<void>(3)].map((_, i) => (
              <li key={`skeleton-${i}`} className={styles.feedItem}>
                <article>
                  <Entry />
                </article>
              </li>
            ))}
          </ul>
        );
        break;
      }
    // Fall through
    case 'error':
      feedContent ??= (
        <>
          <p className="error">{String(feedQuery.error)}</p>
          <button
            onClick={() => void feedQuery.refetch()}
            disabled={feedQuery.isFetching}
          >
            Retry
          </button>
        </>
      );
      break;
    case 'success':
      feedContent = (
        <ul>
          {feedQuery.data.items.map(
            (record) =>
              (record.value.visibility === undefined ||
                record.value.visibility === 'public' ||
                isAuthenticated) && (
                <li key={record.cid} className={styles.feedItem}>
                  <Entry
                    actor={did!}
                    record={record.value}
                    url={`entry/?id=${record.uri.split('/').at(-1)}`}
                  />
                </li>
              ),
          )}
        </ul>
      );
      if (feedQuery.data.next) {
        if (reverse) {
          prevPage = `?cursor=${feedQuery.data.next}&reverse=1`;
        } else {
          nextPage = `?cursor=${feedQuery.data.next}`;
        }
      }
      break;
  }

  return (
    <>
      <title>
        {profileQuery?.data?.displayName
          ? `${profileQuery.data.displayName}${handle ? ` (@${handle})` : ''} — Okazu Diary`
          : handle
            ? `@${handle} — Okazu Diary`
            : 'Okazu Diary'}
      </title>
      {did && (
        <link
          rel="alternate"
          href={`at://${did}/org.okazu-diary.actor.profile/self`}
        />
      )}
      <header className={styles.header}>
        <Profile did={did} profileQuery={profileQuery} handle={handle} />
      </header>
      <main>{feedContent}</main>
      <div className={styles.pageNav}>
        {prevPage ? (
          <Link
            to={prevPage}
            rel="prev"
            className="button"
            draggable="false"
            title="Previous page"
          >
            <span aria-hidden="true">«</span>
          </Link>
        ) : (
          <span
            role="button"
            aria-disabled="true"
            className="button"
            title="Previous page"
          >
            <span aria-hidden="true">«</span>
          </span>
        )}{' '}
        {nextPage ? (
          <Link
            className="button"
            to={nextPage}
            rel="next"
            draggable="false"
            title="Next page"
          >
            <span aria-hidden="true">»</span>
          </Link>
        ) : (
          <span
            role="button"
            aria-disabled="true"
            className="button"
            title="Next page"
          >
            <span aria-hidden="true">»</span>
          </span>
        )}
      </div>
    </>
  );
}
