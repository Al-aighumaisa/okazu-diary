import { type comAtproto, orgOkazuDiary } from '@okazu-diary/api';
import { type default as React, useId, useContext } from 'react';
import Skeleton from 'react-loading-skeleton';
import { Link } from 'react-router';

import {
  PrimaryProfileContext,
  type PrimaryProfileContextValue,
} from '~/contexts/PrimaryProfileContext';
import {
  useDeferredQueryError,
  type UseDeferredQueryErrorResult,
} from '~/lib/useDeferredQueryError';
import { useDelayedInView } from '~/lib/useDelayedInView';
import { useRecordQuery, type UseRecordQueryValue } from '~/queries/record';
import styles from './Entry.module.css';

interface EntryProps {
  actor: string;
  record: orgOkazuDiary.feed.entry.Main;
  url: string;
}

export default function Entry(props: EntryProps): React.ReactNode;
export default function Entry(): React.ReactNode;
export default function Entry({
  actor,
  record,
  url,
}: Partial<EntryProps> = {}): React.ReactNode {
  const profileCtx: Partial<PrimaryProfileContextValue> =
    useContext(PrimaryProfileContext) ?? {};

  const datetime = record?.datetime;

  const visibility = record?.visibility;
  const unlisted = visibility && visibility !== 'public';

  const lang = record?.lang ?? profileCtx.query?.data?.lang ?? '';

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
        {record?.tags?.length ? (
          // FIXME: The list is not very distinguishable from material tags. One idea is to mix the
          // entry tags and material tags in a single list and give the items different styling
          // (e.g. different colors or `::before` content) based on their kind, but how should we
          // handle multiple subjects then?
          <ul className={styles.tags} aria-label="Tags">
            {tagList(record.tags, lang)}
          </ul>
        ) : null}
        {record ? (
          <Subjects actor={actor} subjects={record.subjects} />
        ) : (
          <Subjects skeleton={true} />
        )}
        {record?.note ? (
          <p className={styles.note} lang={lang}>
            {record.note}
          </p>
        ) : record ? null : (
          <Skeleton style={{ inlineSize: '30em' }} />
        )}
      </div>
    </>
  );
}

interface SubjectsProps {
  actor: string | undefined;
  subjects: comAtproto.repo.strongRef.Main[] | undefined;
  skeleton?: boolean;
}

function Subjects(props: SubjectsProps & { skeleton?: false }): React.ReactNode;
function Subjects(props: { skeleton: true }): React.ReactNode;
function Subjects({
  actor,
  subjects,
  skeleton,
}: Partial<SubjectsProps>): React.ReactNode {
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
        content = (
          <ul className={styles.subjectList} aria-label="Materials">
            {items}
          </ul>
        );
      } else {
        content = <Subject actor={actor_} subject={first} />;
      }
    } else {
      content = <SubjectView />;
    }
    return (
      <div className={styles.subjectContainer} ref={ref}>
        {content}
      </div>
    );
  } else {
    return <p className={styles.subject}>No materials used</p>;
  }
}

function Subject({
  actor,
  subject,
}: {
  actor: string;
  subject: comAtproto.repo.strongRef.Main;
}): React.ReactNode {
  const cid = subject.uri.startsWith(`at://${actor}/`)
    ? undefined
    : subject.cid;
  return (
    <SubjectView
      materialQuery={useDeferredQueryError(
        useRecordQuery(orgOkazuDiary.material.external, subject.uri, { cid }),
      )}
    />
  );
}

function SubjectView({
  materialQuery,
}: {
  materialQuery?:
    | UseDeferredQueryErrorResult<
        UseRecordQueryValue<typeof orgOkazuDiary.material.external.main>
      >
    | undefined;
}): React.ReactNode {
  const profileCtx: Partial<PrimaryProfileContextValue> =
    useContext(PrimaryProfileContext) ?? {};

  const tags = materialQuery?.data
    ? materialQuery.data.value.tags
    : [...Array<void>(3)];

  const lang =
    materialQuery?.data?.value.lang ?? profileCtx.query?.data?.lang ?? '';

  const authorNameId = useId();
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
        <figure lang={lang}>
          {materialQuery?.data?.value ? (
            <>
              {materialQuery.data.value.thumb && (
                <img
                  src={materialQuery.data.value.thumb.url}
                  className={styles.subjectThumb}
                  aria-labelledby={materialQuery.data.value.title && titleId}
                  data-nosnippet="true"
                />
              )}
              {(materialQuery.data.value.author ||
                materialQuery.data.value.title ||
                materialQuery.data.value.description) && (
                <figcaption data-nosnippet="true">
                  {materialQuery.data.value.author && (
                    <a
                      href={materialQuery.data.value.author.uri}
                      className={styles.subjectAuthorName}
                    >
                      {materialQuery.data.value.author.avatar && (
                        <img
                          src={materialQuery.data.value.author.avatar.image.url}
                          className={styles.subjectAuthorAvatar}
                          aria-labelledby={
                            materialQuery.data.value.author.name && authorNameId
                          }
                        />
                      )}
                      {materialQuery.data.value.author.name && (
                        <bdi>
                          <strong id={authorNameId}>
                            {materialQuery.data.value.author.name}
                          </strong>
                        </bdi>
                      )}
                    </a>
                  )}
                  {materialQuery.data.value.title && (
                    <h2>
                      <cite id={titleId}>{materialQuery.data.value.title}</cite>
                    </h2>
                  )}
                  {materialQuery.data.value.description && (
                    <p>{materialQuery.data.value?.description}</p>
                  )}
                </figcaption>
              )}
            </>
          ) : (
            <>
              <Skeleton className={styles.subjectThumb} />
              <div style={{ flex: 1 }}>
                <Skeleton count={3} />
              </div>
            </>
          )}
        </figure>
      ) : (
        materialQuery.data.value.uri
      );

    const container = materialQuery?.data?.value.uri ? (
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

    return (
      <>
        {container}
        {tags?.length ? (
          <ul className={styles.tags} aria-label="Tags">
            {tagList(tags, lang)}
          </ul>
        ) : null}
      </>
    );
  }
}

function tagList(
  tags: orgOkazuDiary.material.defs.Tag[] | void[],
  entryLang: string,
): React.ReactNode[] {
  const counter = new Map<string, number>();
  return tags.map((tag, i) => {
    if (tag) {
      // Items are basically keyed by the tag name (plus lang), but with the number of
      // appearance of the tag as well, in case the user puts a same tag multiple times.
      const lang = tag.lang ?? entryLang;
      const keyStem = `${lang}-${tag.value}`;
      const count = counter.get(keyStem) ?? 0;
      counter.set(keyStem, count + 1);
      return (
        <li key={`${count}-${keyStem}`}>
          {/* Add extra `<div>` (`display: block`) in attempt to limit the span of the triple-click
            selection behavior. */}
          <div data-nosnippet="true" lang={lang}>
            {tag.value}
          </div>
        </li>
      );
    } else {
      return (
        <li key={`skeleton-${i}`}>
          <Skeleton style={{ inlineSize: '5em' }} />
        </li>
      );
    }
  });
}
