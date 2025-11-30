import { AtUri } from '@atproto/api';
import {
  OrgOkazuDiaryEmbedExternal,
  OrgOkazuDiaryEmbedRecord,
  OrgOkazuDiaryFeedDefs,
  OrgOkazuDiaryFeedEntry,
} from 'node_modules/@okazu-diary/api';
import React, { useId } from 'react';

interface ActorFeedProps {
  record: OrgOkazuDiaryFeedEntry.Main;
}

export default function FeedEntry({ record }: ActorFeedProps): React.ReactNode {
  return (
    <article>
      <header>
        <time dateTime={record.datetime}>{record.datetime}</time>
      </header>
      <Subjects subjects={record.subjects} />
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
  subjects,
}: {
  subjects: OrgOkazuDiaryFeedDefs.Subject[] | undefined;
}): React.ReactNode {
  if (!subjects) {
    return null;
  }

  const [first, ...rest] = subjects;
  if (first) {
    if (rest.length) {
      const items = subjects.map((subject) => (
        <li>
          <Subject subject={subject} />
        </li>
      ));
      return <ul>{items}</ul>;
    } else {
      return <Subject subject={first} />;
    }
  } else {
    return <p>No materials used</p>;
  }
}

function Subject({
  subject,
}: {
  subject: OrgOkazuDiaryFeedDefs.Subject;
}): React.ReactNode {
  const titleId = useId();

  switch (subject.value.$type) {
    case 'org.okazu-diary.embed.external': {
      const result = OrgOkazuDiaryEmbedExternal.validateMain(subject.value);
      if (result.success) {
        return (
          <>
            {(result.value.thumb ||
              result.value.title ||
              result.value.description) && (
              <a href={result.value.uri}>
                <figure>
                  {result.value.thumb && (
                    <img
                      src={result.value.thumb.uri}
                      aria-labelledby={result.value.title && titleId}
                    />
                  )}
                  {(result.value.title || result.value.description) && (
                    <figcaption>
                      {result.value.title && (
                        <cite id={titleId}>result.value.title</cite>
                      )}
                      {result.value.description && (
                        <p>result.value.description</p>
                      )}
                    </figcaption>
                  )}
                </figure>
              </a>
            )}
            <p>
              Link: <a href={result.value.uri}>{result.value.uri}</a>
            </p>
          </>
        );
      }
      break;
    }
    case 'org.okazu-diary.embed.record': {
      const result = OrgOkazuDiaryEmbedRecord.validateMain(subject.value);
      if (result.success) {
        const uri = new AtUri(result.value.record.uri);
        // TODO: Resolve record, verify CID, and check threadgate.
        switch (uri.collection) {
          case 'app.bsky.feed.post': {
            const url = `https://bsky.app/profile/${uri.host}/post/${uri.rkey}`;
            return (
              <p>
                Link: <a href={url}>{url}</a>
              </p>
            );
          }
        }
      }
    }
  }
  return <figure></figure>;
}
