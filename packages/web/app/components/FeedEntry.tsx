import type { ComAtprotoRepoStrongRef } from '@atproto/api';
import type { OrgOkazuDiaryFeedEntry } from '@okazu-diary/api';
import type React from 'react';
import { useId } from 'react';
import { useInView } from 'react-intersection-observer';

import { useMaterial } from '~/state/material';
import styles from './FeedEntry.module.css';

interface ActorFeedProps {
  actor: string;
  record: OrgOkazuDiaryFeedEntry.Main;
}

export default function FeedEntry({
  actor,
  record,
}: ActorFeedProps): React.ReactNode {
  return (
    <article className={styles.article}>
      <header>
        <time dateTime={record.datetime}>{record.datetime}</time>
      </header>
      {record.tags?.length ? (
        <ul className={styles.tags}>
          {record.tags.map((tag) => (
            <li>
              {/* Add extra `<div>` (`display: block`) in attempt to limit the span of the
             triple-click selection behavior. */}
              <div>{tag.value}</div>
            </li>
          ))}
        </ul>
      ) : null}
      <Subjects actor={actor} subjects={record.subjects} />
      <p>{record.note}</p>
    </article>
  );
}

function Subjects({
  actor,
  subjects,
}: {
  actor: string;
  subjects: ComAtprotoRepoStrongRef.Main[] | undefined;
}): React.ReactNode {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  });

  if (!subjects) {
    return null;
  }

  const [first, ...rest] = subjects;
  if (first) {
    let content;
    if (inView) {
      if (rest.length) {
        const items = subjects.map((subject) => (
          <li key={subject.cid}>
            <Subject actor={actor} subject={subject} />
          </li>
        ));
        content = <ul className={styles.subjectList}>{items}</ul>;
      } else {
        content = <Subject actor={actor} subject={first} />;
      }
    } else {
      content = null;
    }
    return <div ref={ref}>{content}</div>;
  } else {
    return <p className={styles.subject}>No materials used</p>;
  }
}

function Subject({
  actor,
  subject,
}: {
  actor: string;
  subject: ComAtprotoRepoStrongRef.Main;
}): React.ReactNode {
  const titleId = useId();

  const cid = subject.uri.startsWith(`at://${actor}/`)
    ? undefined
    : subject.cid;
  const [materialState, retryMaterial] = useMaterial(subject.uri, cid);

  let content, pending;
  switch (materialState.status) {
    case 'pending':
      if (!materialState.error) {
        content = <p>Loading…</p>;
      }
      pending = true;
    // Fall through
    case 'error':
      content ??= (
        <div className={styles.error}>
          <p>{`${materialState.error}`}</p>
          <button onClick={retryMaterial} disabled={pending}>
            Retry
          </button>
        </div>
      );
      return <div className={styles.subject}>{content}</div>;
    case 'resolved':
      return (
        <a href={materialState.value.uri} className={styles.subject}>
          {materialState.value.thumb ||
          materialState.value.title ||
          materialState.value.description ? (
            <figure>
              {materialState.value.thumb && (
                <img
                  src={materialState.value.thumb.url}
                  aria-labelledby={materialState.value.title && titleId}
                />
              )}
              {(materialState.value.title ||
                materialState.value.description) && (
                <figcaption>
                  {materialState.value.title && (
                    <cite id={titleId}>{materialState.value.title}</cite>
                  )}
                  {materialState.value.description && (
                    <p>{materialState.value.description}</p>
                  )}
                </figcaption>
              )}
            </figure>
          ) : (
            materialState.value.uri
          )}
        </a>
      );
  }
}
