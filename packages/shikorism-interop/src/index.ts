import {
  OrgOkazuDiaryEmbedExternal,
  OrgOkazuDiaryEmbedRecord,
  OrgOkazuDiaryFeedDefs,
  OrgOkazuDiaryFeedEntry,
} from '@okazu-diary/api';
import { AtUri, ComAtprotoLabelDefs } from '@atproto/api';

export interface FromShikorismOptions {
  privateAs?: 'public' | 'unlisted' | undefined;
}

export interface FromCSVRowOptions extends FromShikorismOptions {}

export async function fromCSVRow(
  row: string[],
  options?: FromCSVRowOptions,
): Promise<OrgOkazuDiaryFeedEntry.Record | void> {
  const [
    datetime,
    note,
    link,
    isPrivate,
    isTooSensitive,
    discardElapsedTime,
    ...tags
  ] = row;
  const is_too_sensitive = isTooSensitive === 'true';
  const privateAs = options?.privateAs;

  const ret: OrgOkazuDiaryFeedEntry.Record = {
    $type: 'org.okazu-diary.feed.entry',
    datetime: datetime.replaceAll('/', '-').replaceAll(' ', 'T') + '+09:00',
    tags: tags.map((value) => ({ value })),
    labels: {
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: is_too_sensitive ? 'porn' : 'sexual' }],
    } satisfies ComAtprotoLabelDefs.SelfLabels,
    hadHiatus: discardElapsedTime === 'true',
    visibility: (isPrivate === 'true' && privateAs) || 'public',
  };

  if (note) {
    ret.note = note;
  }

  if (link) {
    ret.subjects = [await subjectFromLink(link, is_too_sensitive)];
  }

  return ret;
}

export interface Checkin {
  checked_in_at: string;
  tags?: string[];
  link?: string;
  note?: string;
  is_private?: boolean;
  is_too_sensitive?: boolean;
  discard_elapsed_time?: boolean;
}

export interface FromCheckinOptions extends FromShikorismOptions {}

export async function fromCheckin(
  checkin: Checkin,
  options?: FromCheckinOptions,
): Promise<OrgOkazuDiaryFeedEntry.Record | undefined> {
  const privateAs = options?.privateAs;

  const ret: OrgOkazuDiaryFeedEntry.Record = {
    $type: 'org.okazu-diary.feed.entry',
    datetime: checkin.checked_in_at,
    labels: {
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: checkin.is_too_sensitive ? 'porn' : 'sexual' }],
    } satisfies ComAtprotoLabelDefs.SelfLabels,
    hadHiatus: checkin.discard_elapsed_time ?? false,
    visibility: (checkin.is_private && privateAs) || 'public',
  };

  if (checkin.tags) {
    ret.tags = checkin.tags.map((value) => ({ value }));
  }

  if (checkin.link) {
    ret.subjects = [
      await subjectFromLink(checkin.link, checkin.is_too_sensitive),
    ];
  }

  if (checkin.note) {
    ret.note = checkin.note;
  }

  if (checkin.is_private) {
    if (!privateAs) {
      return;
    }
    ret.visibility = privateAs;
  }

  if (checkin.discard_elapsed_time) {
    ret.hadHiatus = true;
  }

  return ret;
}

export function toCheckin(record: OrgOkazuDiaryFeedEntry.Record): Checkin {
  const ret: Checkin = {
    checked_in_at: record.datetime,
  };

  if (record.tags) {
    ret.tags = record.tags.map(({ value }) => value);
  }

  let note = record.note;
  if (record.subjects) {
    const [first, ...rest] = record.subjects.reduce((acc: string[], s) => {
      const link = subjectToLink(s);
      if (link) {
        acc.push(link);
      }
      return acc;
    }, []);
    if (first) {
      ret.link = first;
      if (rest.length) {
        note = rest.join('\n') + (note ? '\n\n' + note : '');
      }
    }
  }

  if (note !== undefined) {
    ret.note = note;
  }

  if (record.visibility && record.visibility !== 'public') {
    ret.is_private = true;
  }

  const is_too_sensitive = record.subjects?.some((s) => {
    if (!s.labels) return;
    const result = ComAtprotoLabelDefs.validateSelfLabels(s.labels);
    if (result.success) {
      return result.value.values.some(({ val }) =>
        [
          '!hide',
          '!warn',
          'porn',
          'sexual',
          'graphic-media',
          'nudity',
        ].includes(val),
      );
    }
  });
  if (is_too_sensitive) {
    ret.is_too_sensitive = true;
  }

  if (record.hadHiatus) {
    ret.discard_elapsed_time = true;
  }

  return ret;
}

// TODO: Optionally extract link previews and `Link: <at://…>; rel="alternate"`.
// eslint-disable-next-line @typescript-eslint/require-await
async function subjectFromLink(
  link: string,
  sensitive?: boolean,
): Promise<OrgOkazuDiaryFeedDefs.Subject> {
  const value: OrgOkazuDiaryEmbedExternal.Main = {
    $type: 'org.okazu-diary.embed.external',
    uri: link,
  };
  const ret: OrgOkazuDiaryFeedDefs.Subject = { value };

  if (sensitive) {
    ret.labels = {
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: 'porn' }],
    } satisfies ComAtprotoLabelDefs.SelfLabels;
  }

  return ret;
}

function subjectToLink(
  subject: OrgOkazuDiaryFeedDefs.Subject,
): string | undefined {
  const value = subject.value;
  switch (value.$type) {
    case 'org.okazu-diary.embed.external': {
      const result = OrgOkazuDiaryEmbedExternal.validateMain(value);
      if (result.success) {
        return result.value.uri;
      }
      break;
    }
    case 'org.okazu-diary.embed.record': {
      const result = OrgOkazuDiaryEmbedRecord.validateMain(value);
      if (result.success) {
        const uri = new AtUri(result.value.record.uri);
        if (uri.collection === 'app.bsky.feed.post') {
          return `https://bsky.app/profile/${uri.host}/post/${uri.rkey}`;
        }
      }
    }
  }
}
