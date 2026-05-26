import { getPds } from '@atproto/identity';
import { type default as React, useContext } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import Entry from '~/components/Entry';
import Profile from '~/components/Profile';
import { useOAuthContext } from '~/contexts/OAuthContext';
import {
  PrimaryProfileContext,
  type PrimaryProfileContextValue,
} from '~/contexts/PrimaryProfileContext';
import { getPrefetchedDid } from '~/lib/identity';
import { useDeferredQueryError } from '~/lib/useDeferredQueryError';
import { useActorFeedQuery } from '~/queries/actorFeed';
import { parseProfileParams } from './common';
import styles from './home.module.css';

export default function ProfileHome(): React.ReactNode {
  const params = parseProfileParams(useParams());
  const did = params?.did;

  const [search] = useSearchParams();
  const cursor = search.get('cursor');
  const reverse = search.get('reverse') === '1';

  const profileCtx: Partial<PrimaryProfileContextValue> =
    useContext(PrimaryProfileContext) ?? {};
  const profileQuery = useDeferredQueryError(profileCtx.query);
  const handle = profileCtx.handleQuery?.data;
  const feedQuery = useDeferredQueryError(
    useActorFeedQuery(did, cursor, reverse),
  );

  const { session } = useOAuthContext();
  const isAuthenticated = did && session?.sub === did;

  const prefetchedDidDoc = did && getPrefetchedDid(did);
  const preloadPds = prefetchedDidDoc && getPds(prefetchedDidDoc);

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
          <ul aria-label="Entries" aria-busy="true">
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
        <ul aria-label="Entries">
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
      {preloadPds && (
        <link
          rel="preload"
          as="fetch"
          crossOrigin=""
          href={
            new URL(
              `/xrpc/com.atproto.repo.listRecords?repo=${did}&collection=org.okazu-diary.feed.entry${cursor ? `&cursor=${cursor}` : ''}${reverse ? '&reverse=1' : ''}`,
              preloadPds,
            ).href
          }
        />
      )}
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
