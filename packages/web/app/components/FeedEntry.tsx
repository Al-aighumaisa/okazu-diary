import type { ComAtprotoRepoStrongRef } from '@atproto/api';
import type { OrgOkazuDiaryFeedEntry } from '@okazu-diary/api';
import type React from 'react';
import { useId } from 'react';
import { useMaterial } from '~/state/material';

interface ActorFeedProps {
  actor: string;
  record: OrgOkazuDiaryFeedEntry.Main;
}

export default function FeedEntry({
  actor,
  record,
}: ActorFeedProps): React.ReactNode {
  return (
    <article>
      <header>
        <time dateTime={record.datetime}>{record.datetime}</time>
      </header>
      <p>{record.note}</p>
      <Subjects actor={actor} subjects={record.subjects} />
      {record.tags?.length && (
        <ul>
          {record.tags.map((tag) => (
            <li>{tag.value}</li>
          ))}
        </ul>
      )}
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
  if (!subjects) {
    return null;
  }

  const [first, ...rest] = subjects;
  if (first) {
    if (rest.length) {
      const items = subjects.map((subject) => (
        <li>
          <Subject actor={actor} subject={subject} />
        </li>
      ));
      return <ul>{items}</ul>;
    } else {
      return <Subject actor={actor} subject={first} />;
    }
  } else {
    return <p>No materials used</p>;
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
        <>
          <p style={{ color: '#F00' }}>{`${materialState.error}`}</p>
          <button onClick={retryMaterial} disabled={pending}>
            Retry
          </button>
        </>
      );
      break;
    case 'resolved':
      return (
        <>
          {
            // Using logical OR for consistency.
            // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
            (materialState.value.thumb ||
              materialState.value.title ||
              materialState.value.description) && (
              <a href={materialState.value.uri}>
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
              </a>
            )
          }
          <p>
            Link:{' '}
            <a href={materialState.value.uri}>{materialState.value.uri}</a>
          </p>
        </>
      );
  }
}
