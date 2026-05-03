import type { ComAtprotoRepoStrongRef } from '@atproto/api';
import {
  OrgOkazuDiaryMaterialExternal,
  type OrgOkazuDiaryFeedEntry,
} from '@okazu-diary/api';
import type React from 'react';
import { useId } from 'react';
import { useInView } from 'react-intersection-observer';
import Skeleton from 'react-loading-skeleton';

import { useUriRecord } from '~/state/record';
import type * as recordHook from '~/state/record';
import styles from './Entry.module.css';
import { Link } from 'react-router';

interface ActorFeedProps {
  actor: string;
  record: OrgOkazuDiaryFeedEntry.Main;
  url: string;
}

export default function Entry(props: ActorFeedProps): React.ReactNode;
export default function Entry(): React.ReactNode;
export default function Entry({
  actor,
  record,
  url,
}: Partial<ActorFeedProps> &
  React.HTMLAttributes<Element> = {}): React.ReactNode {
  const datetime = record?.datetime;
  const tags = record ? record.tags : [...Array<void>(3)];

  return (
    <div className={styles.container}>
      <header>
        {datetime ? (
          <Link to={url!} className={styles.datetimeAnchor}>
            <time dateTime={datetime}>{datetime}</time>
          </Link>
        ) : (
          <Skeleton style={{ inlineSize: '13em' }} />
        )}
      </header>
      {tags?.length ? (
        <ul className={styles.tags}>
          {tags.map((tag, i) => (
            <li key={tag === undefined ? `skeleton-${i}` : `${i}-${tag.value}`}>
              {tag === undefined ? (
                <Skeleton style={{ inlineSize: '5em' }} />
              ) : (
                // Add extra `<div>` (`display: block`) in attempt to limit the span of the
                // triple-click selection behavior.
                <div data-nosnippet="true">{tag.value}</div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
      {record ? (
        <Subjects actor={actor} subjects={record.subjects} />
      ) : (
        <Subjects skeleton={true} />
      )}
      <p>
        {record ? (
          <span className={styles.note}>{record.note}</span>
        ) : (
          <Skeleton style={{ inlineSize: '30em' }} />
        )}
      </p>
    </div>
  );
}

function Subjects({
  actor,
  subjects,
  skeleton,
}: {
  actor: string | undefined;
  subjects: ComAtprotoRepoStrongRef.Main[] | undefined;
  skeleton?: false;
}): React.ReactNode;
function Subjects(_props: { skeleton: true }): React.ReactNode;
function Subjects({
  actor,
  subjects,
  skeleton,
}: {
  actor?: string | undefined;
  subjects?: ComAtprotoRepoStrongRef.Main[] | undefined;
  skeleton?: boolean;
}): React.ReactNode {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  });

  if (!subjects) {
    return (
      skeleton && (
        <SubjectView
          materialRes={{
            state: { status: 'pending' },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            retry: () => {},
          }}
        />
      )
    );
  }

  const [first, ...rest] = subjects;
  if (first) {
    const actor_ = actor!;
    let content;
    if (inView) {
      if (rest.length) {
        const items = subjects.map((subject) => (
          <li key={subject.cid}>
            <Subject actor={actor_} subject={subject} />
          </li>
        ));
        content = <ul className={styles.subjectList}>{items}</ul>;
      } else {
        content = <Subject actor={actor_} subject={first} />;
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
  const cid = subject.uri.startsWith(`at://${actor}/`)
    ? undefined
    : subject.cid;
  return (
    <SubjectView
      materialRes={useUriRecord(
        subject.uri,
        OrgOkazuDiaryMaterialExternal.validateMain,
        { cid },
      )}
    />
  );
}

function SubjectView({
  materialRes,
}: {
  materialRes: recordHook.HookResponse<OrgOkazuDiaryMaterialExternal.Main>;
}): React.ReactNode {
  const titleId = useId();

  if (materialRes.state.error) {
    return (
      <div className={styles.error}>
        <p>{`${materialRes.state.error}`}</p>
        <button
          onClick={materialRes.retry}
          disabled={materialRes.state.status === 'pending'}
        >
          Retry
        </button>
      </div>
    );
  } else {
    const content =
      materialRes.state.status !== 'resolved' ||
      materialRes.state.value.thumb ||
      materialRes.state.value.title ||
      materialRes.state.value.description ? (
        <figure>
          {materialRes.state.value ? (
            materialRes.state.value.thumb && (
              <img
                src={materialRes.state.value.thumb.url}
                className={styles.subjectThumb}
                aria-labelledby={materialRes.state.value?.title && titleId}
                data-nosnippet="true"
              />
            )
          ) : (
            <Skeleton className={styles.subjectThumb} />
          )}
          {materialRes.state.value ? (
            (materialRes.state.value?.title ||
              materialRes.state.value?.description) && (
              <figcaption data-nosnippet="true">
                {materialRes.state.value?.title && (
                  <cite id={titleId}>{materialRes.state.value?.title}</cite>
                )}
                {materialRes.state.value?.description && (
                  <p>{materialRes.state.value?.description}</p>
                )}
              </figcaption>
            )
          ) : (
            <div style={{ flex: 1 }}>
              <Skeleton count={3} />
            </div>
          )}
        </figure>
      ) : (
        materialRes.state.value.uri
      );
    return materialRes.state.value?.uri ? (
      <a
        href={materialRes.state.value.uri}
        target="_blank"
        rel="noopener"
        className={styles.subject}
      >
        {content}
      </a>
    ) : (
      <div className={styles.subject}>{content}</div>
    );
  }
}
