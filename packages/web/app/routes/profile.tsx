import { AtpBaseClient } from '@atproto/api';
import { getHandle, getPds, HandleResolver } from '@atproto/identity';
import { Link, useLocation } from 'react-router';

import FeedEntry from '~/components/FeedEntry';
import Profile from '~/components/Profile';
import { allowed_dids } from '~/config';
import { didResolver } from '~/lib/atproto';
import { useActorFeed } from '~/state/actorFeed';
import { useProfile } from '~/state/profile';
import type { Route } from './+types/profile';
import styles from './profile.module.css';

interface LoaderData {
  did: string;
  pds: string;
  handle: string | undefined;
}

const handleResolver = new HandleResolver();

export async function clientLoader({
  params: { id },
}: Route.LoaderArgs): Promise<LoaderData> {
  let did, handle;

  if (id) {
    if (id.startsWith('@')) {
      handle = id.slice(1);
      did = await handleResolver.resolve(handle);
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
    did = allowed_dids[0]!;
  }

  const doc = await didResolver.resolve(did);
  if (!doc) {
    throw new Response(null, { status: 404 });
  }

  const pds = getPds(doc);
  if (!pds) {
    throw new Error('DID document does not have atproto PDS service');
  }

  if (!handle) {
    const docHandle = getHandle(doc);
    if (docHandle) {
      const roundTripDid = await handleResolver.resolve(docHandle);
      if (roundTripDid === did) {
        handle = docHandle;
      }
    }
  }

  return { did, pds, handle };
}

export default function ProfilePage({
  loaderData: { did, pds, handle },
}: {
  loaderData: LoaderData;
}): React.ReactNode {
  const client = new AtpBaseClient({ service: pds });
  const { search } = useLocation();

  const [profileState, retryProfile] = useProfile(did, client);

  const query = new URLSearchParams(search);
  const cursor = query.get('cursor');
  const reverse = query.get('reverse') === '1';
  const [feedState, retryFeed] = useActorFeed(did, client, cursor, reverse);

  let prevPage, nextPage;
  if (cursor) {
    if (reverse) {
      nextPage = `?cursor=${cursor}`;
    } else {
      prevPage = `?cursor=${cursor}&reverse=1`;
    }
  }

  let feedContent, pending;
  switch (feedState.status) {
    case 'pending':
      if (!feedState.error) {
        feedContent = <p>Loading…</p>;
        break;
      }
      pending = true;
    // Fall through
    case 'error':
      feedContent ??= (
        <>
          <p style={{ color: '#F00' }}>{`${feedState.error}`}</p>
          <button onClick={retryFeed} disabled={pending}>
            Retry
          </button>
        </>
      );
      break;
    case 'resolved':
      feedContent = (
        <ul className={styles.feed}>
          {feedState.items.map((record) => (
            <li key={record.cid}>
              <FeedEntry actor={did} record={record.value} />
            </li>
          ))}
        </ul>
      );
      if (feedState.next) {
        if (reverse) {
          prevPage = `?cursor=${feedState.next}&reverse=1`;
        } else {
          nextPage = `?cursor=${feedState.next}`;
        }
      }
      break;
  }

  return (
    <>
      <title>
        {profileState.status === 'resolved'
          ? `${profileState.value.displayName}${handle ? ` (@${handle})` : ''} — Okazu Diary`
          : 'Okazu Diary'}
      </title>
      <header className={styles.header}>
        <Profile
          did={did}
          profileState={profileState}
          handle={handle ?? 'handle.invalid'}
          onRetry={retryProfile}
        />
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
