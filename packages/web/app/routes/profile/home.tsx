import { HandleResolver } from '@atproto/identity';
import { Link, useSearchParams } from 'react-router';

import Entry from '~/components/Entry';
import Profile from '~/components/Profile';
import { allowed_dids } from '~/config';
import { useActorFeed } from '~/state/actorFeed';
import type * as actorFeedHook from '~/state/actorFeed';
import { useDid } from '~/state/did';
import { useHandle } from '~/state/handle';
import { useProfile } from '~/state/profile';
import type * as profileHook from '~/state/profile';
import type { Route } from './+types/home';
import styles from './home.module.css';

export interface LoaderData {
  did: string;
  prefetchedHandle: string | undefined;
}

const handleResolver = new HandleResolver();

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
    did = allowed_dids[0]!;
  }

  return { did, prefetchedHandle };
}

export default function ProfilePage({
  loaderData: { did, prefetchedHandle },
}: Pick<Route.ComponentProps, 'loaderData'>): React.ReactNode {
  const didRes = useDid(did);
  const handle = useHandle(didRes, prefetchedHandle);

  const [search] = useSearchParams();

  const cursor = search.get('cursor');
  const reverse = search.get('reverse') === '1';

  return ProfilePageView(
    did,
    handle,
    cursor,
    reverse,
    useProfile(did, didRes),
    useActorFeed(did, didRes, cursor, reverse),
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
  profileRes: profileHook.HookResponse,
  feedRes: actorFeedHook.HookResponse,
): React.ReactNode;
function ProfilePageView(
  did?: string,
  handle?: string,
  cursor?: string | null,
  reverse?: boolean,
  profileRes?: profileHook.HookResponse,
  feedRes?: actorFeedHook.HookResponse,
): React.ReactNode {
  let prevPage, nextPage;
  if (cursor) {
    if (reverse) {
      nextPage = `?cursor=${cursor}`;
    } else {
      prevPage = `?cursor=${cursor}&reverse=1`;
    }
  }

  let feedContent;
  switch (feedRes?.state.status) {
    case 'pending':
    case undefined:
      if (!feedRes?.state.error) {
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
          <p style={{ color: '#F00' }}>{`${feedRes.state.error}`}</p>
          <button
            onClick={feedRes.retry}
            disabled={feedRes.state.status === 'pending'}
          >
            Retry
          </button>
        </>
      );
      break;
    case 'resolved':
      feedContent = (
        <ul>
          {feedRes.state.items.map(
            (record) =>
              (!record.value.visibility ||
                record.value.visibility === 'public') && (
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
      if (feedRes.state.next) {
        if (reverse) {
          prevPage = `?cursor=${feedRes.state.next}&reverse=1`;
        } else {
          nextPage = `?cursor=${feedRes.state.next}`;
        }
      }
      break;
  }

  return (
    <>
      <title>
        {profileRes?.state.status === 'resolved'
          ? `${profileRes.state.value.displayName}${handle ? ` (@${handle})` : ''} — Okazu Diary`
          : 'Okazu Diary'}
      </title>
      {did && (
        <link
          rel="alternate"
          href={`at://${did}/org.okazu-diary.actor.profile/self`}
        />
      )}
      <header className={styles.header}>
        <Profile did={did} profileRes={profileRes} handle={handle} />
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
