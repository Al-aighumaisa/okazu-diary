import type { AtpBaseClient, ComAtprotoRepoListRecords } from '@atproto/api';
import { OrgOkazuDiaryFeedEntry } from 'node_modules/@okazu-diary/api';
import React, { useEffect, useState, type JSX } from 'react';
import { Link } from 'react-router';

import FeedEntry from './FeedEntry';

interface ActorFeedProps {
  did: string;
  cursor?: string | undefined;
  reverse?: boolean | undefined;
  client: AtpBaseClient;
}

export default function ActorFeed({
  did,
  cursor,
  reverse,
  client,
}: ActorFeedProps): React.ReactNode {
  const [state, setState] = useState<
    | { status: 'pending' }
    | { status: 'resolved'; items: JSX.Element[]; next: string | undefined }
    | { status: 'error'; error: unknown }
  >({ status: 'pending' });

  useEffect(() => {
    const abort = new AbortController();
    const signal = abort.signal;

    (async () => {
      const params: ComAtprotoRepoListRecords.QueryParams = {
        repo: did,
        collection: 'org.okazu-diary.feed.entry',
      };
      if (cursor !== undefined) {
        params.cursor = cursor;
      }
      if (reverse) {
        params.reverse = reverse;
      }
      const res = await client.com.atproto.repo.listRecords(params, { signal });

      setState({
        status: 'resolved',
        items: res.data.records.map((r) => {
          const result = OrgOkazuDiaryFeedEntry.validateMain(r.value);
          if (!result.success) {
            throw result.error;
          }
          return (
            <li key={`${r.uri}#${r.cid}`}>
              <FeedEntry record={result.value} />
            </li>
          );
        }),
        next: res.data.cursor,
      });
    })().catch((error) => {
      setState({ status: 'error', error });
    });

    return () => {
      abort.abort();
    };
  }, [did, client, cursor, reverse]);

  let prevPage, nextPage;
  if (cursor) {
    if (reverse) {
      nextPage = `?cursor=${cursor}`;
    } else {
      prevPage = `?cursor=${cursor}&reverse=1`;
    }
  }

  let mainContent;
  switch (state.status) {
    case 'pending':
      mainContent = <p>Loading…</p>;
      break;
    case 'resolved':
      mainContent = <ul>{state.items}</ul>;
      if (state.next) {
        if (reverse) {
          prevPage = `?cursor=${state.next}&reverse=1`;
        } else {
          nextPage = `?cursor=${state.next}`;
        }
      }
      break;
    case 'error':
      mainContent = <p style={{ color: '#F00' }}>{`${state.error}`}</p>;
      break;
  }

  const prevText = <span title="Previous page">«</span>;
  const nextText = <span title="Next page">»</span>;

  return (
    <>
      <main>{mainContent}</main>
      <div>
        {prevPage ? (
          <Link to={prevPage} rel="prev">
            {prevText}
          </Link>
        ) : (
          prevText
        )}{' '}
        {nextPage ? (
          <Link to={nextPage} rel="next">
            {nextText}
          </Link>
        ) : (
          nextText
        )}
      </div>
    </>
  );
}
