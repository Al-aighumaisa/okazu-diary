import type { ComAtprotoRepoStrongRef } from '@atproto/api';
import {
  OrgOkazuDiaryMaterialExternal,
  type OrgOkazuDiaryFeedEntry,
} from '@okazu-diary/api';
import { type default as React, useId } from 'react';
import Skeleton from 'react-loading-skeleton';
import { Link } from 'react-router';

import {
  useDeferredQueryError,
  type UseDeferredQueryErrorResult,
} from '~/lib/useDeferredQueryError';
import { useDelayedInView } from '~/lib/useDelayedInView';
import { useRecordQuery, type UseRecordQueryValue } from '~/queries/record';
import styles from './Entry.module.css';

interface EntryProps {
  actor: string;
  record: OrgOkazuDiaryFeedEntry.Main;
  url: string;
}

export default function Entry(props: EntryProps): React.ReactNode;
export default function Entry(): React.ReactNode;
export default function Entry({
  actor,
  record,
  url,
}: Partial<EntryProps> = {}): React.ReactNode {
  const datetime = record?.datetime;
  const tags = record ? record.tags : [...Array<void>(3)];

  const visibility = record?.visibility;
  const unlisted = visibility && visibility !== 'public';

  const tagCounter = new Map<string, number>();
  return (
    <>
      {unlisted && <meta name="robots" content="noindex" />}
      <div className={styles.container}>
        <header>
          {unlisted && <span className={styles.unlisted}>Unlisted</span>}
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
            {tags.map((tag, i) => {
              const value = tag?.value;
              let count;
              if (value !== undefined) {
                count = tagCounter.get(value) ?? 0;
                tagCounter.set(value, count + 1);
              }
              return (
                // Items are basically keyed by the tag name, but with the number of appearance of
                // the tag as well, in case the user puts a same tag multiple times.
                <li
                  key={
                    value === undefined ? `skeleton-${i}` : `${count}-${value}`
                  }
                >
                  {value === undefined ? (
                    <Skeleton style={{ inlineSize: '5em' }} />
                  ) : (
                    // Add extra `<div>` (`display: block`) in attempt to limit the span of the
                    // triple-click selection behavior.
                    <div data-nosnippet="true">{value}</div>
                  )}
                </li>
              );
            })}
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
    </>
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
  let ref, inView;
  /* eslint-disable react-hooks/rules-of-hooks */
  if (!import.meta.env.SSR) {
    ({ ref, inView } = useDelayedInView({
      rootMargin: '200px',
    }));
  }
  /* eslint-enable */

  if (!subjects) {
    return skeleton && <SubjectView />;
  }

  const [first, ...rest] = subjects;
  if (first) {
    const actor_ = actor!;
    let content;
    if (import.meta.env.SSR || inView) {
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
      content = <SubjectView />;
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
      materialQuery={useDeferredQueryError(
        useRecordQuery(
          subject.uri,
          OrgOkazuDiaryMaterialExternal.validateMain,
          { cid },
        ),
      )}
    />
  );
}

function SubjectView({
  materialQuery,
}: {
  materialQuery?:
    | UseDeferredQueryErrorResult<
        UseRecordQueryValue<OrgOkazuDiaryMaterialExternal.Main>
      >
    | undefined;
}): React.ReactNode {
  const titleId = useId();

  if (materialQuery?.error) {
    return (
      <div className={styles.errorContainer}>
        <p className="error">{String(materialQuery.error)}</p>
        <button
          onClick={() => void materialQuery.refetch()}
          disabled={materialQuery.isFetching}
        >
          Retry
        </button>
      </div>
    );
  } else {
    const content =
      !materialQuery?.isSuccess ||
      materialQuery.data.value.thumb ||
      materialQuery.data.value.title ||
      materialQuery.data.value.description ? (
        <figure>
          {materialQuery?.data?.value ? (
            materialQuery.data.value.thumb && (
              <img
                src={materialQuery.data.value.thumb.url}
                className={styles.subjectThumb}
                aria-labelledby={materialQuery.data.value?.title && titleId}
                data-nosnippet="true"
              />
            )
          ) : (
            <Skeleton className={styles.subjectThumb} />
          )}
          {materialQuery?.data?.value ? (
            (materialQuery.data.value.title ||
              materialQuery.data.value.description) && (
              <figcaption data-nosnippet="true">
                {materialQuery.data.value?.title && (
                  <cite id={titleId}>{materialQuery.data.value?.title}</cite>
                )}
                {materialQuery.data.value?.description && (
                  <p>{materialQuery.data.value?.description}</p>
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
        materialQuery.data.value.uri
      );

    return materialQuery?.data?.value.uri ? (
      <a
        href={materialQuery.data.value.uri}
        target="_blank"
        rel="noopener"
        className={styles.subject}
      >
        {content}
      </a>
    ) : (
      <div
        className={styles.subject}
        aria-busy={!materialQuery || materialQuery.isPending}
      >
        {content}
      </div>
    );
  }
}
