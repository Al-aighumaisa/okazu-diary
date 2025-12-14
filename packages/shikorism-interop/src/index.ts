import { AtpBaseClient, AtUri, ComAtprotoLabelDefs } from '@atproto/api';
import { isDid } from '@atproto/did';
import {
  DidResolver,
  getPds,
  HandleResolver,
  MemoryCache,
} from '@atproto/identity';
import { cidForRawBytes } from '@atproto/lex-cbor';
import { cidForRecord } from '@atproto/repo';
import {
  OrgOkazuDiaryEmbedExternal,
  OrgOkazuDiaryEmbedRecord,
  OrgOkazuDiaryFeedDefs,
  OrgOkazuDiaryFeedEntry,
} from '@okazu-diary/api';
import * as kondate from '@okazu-diary/kondate';

import * as util from './util.js';

export interface FromShikorismOptions {
  privateAs?: 'public' | 'unlisted' | undefined;
  linkResolution?: LinkResolutionOptions | boolean | undefined;
}

export interface LinkResolutionOptions {
  cache?: Map<string, OrgOkazuDiaryFeedDefs.Subject['value']>;
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
  const { privateAs, linkResolution: lr } = options ?? {};
  const linkResolution: LinkResolutionOptions | undefined =
    lr === true ? {} : lr ? { ...lr } : undefined;

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
    ret.subjects = [
      await subjectFromLink(link, is_too_sensitive, linkResolution),
    ];
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
  const { privateAs, linkResolution: lr } = options ?? {};
  const linkResolution: LinkResolutionOptions | undefined =
    lr === true ? {} : lr ? { ...lr } : undefined;

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
      await subjectFromLink(
        checkin.link,
        checkin.is_too_sensitive,
        linkResolution,
      ),
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

const didResolver = new DidResolver({
  didCache: new MemoryCache(5 * 60 * 1000, 60 * 60 * 1000),
});
const handleResolver = new HandleResolver();

async function subjectFromLink(
  link: string,
  sensitive: boolean | undefined,
  linkResolution: LinkResolutionOptions | undefined,
): Promise<OrgOkazuDiaryFeedDefs.Subject> {
  let result;
  if (linkResolution) {
    try {
      result = await kondate.resolve(link, {
        fetch: util.fetch,
        preferDiscovered: ['at-uri', 'activity-streams'],
      });
    } catch (e) {
      console.error(`Error while resolving link: ${link}\n`, e);
    }
  }

  let value;
  if (result?.value) {
    const atUri = result.value?.resolver?.at?.uri;
    if (atUri) {
      value = await resolveSubjectFromAtUri(atUri);
    }
    value ??= await embedFromKondate(link, result.value);
  }

  value ??= {
    $type: 'org.okazu-diary.embed.external',
    uri: link,
  } satisfies OrgOkazuDiaryEmbedExternal.Main;

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

async function embedFromKondate(
  url: string,
  meta: kondate.Metadata,
): Promise<OrgOkazuDiaryEmbedExternal.Main> {
  const ret: OrgOkazuDiaryEmbedExternal.Main = {
    $type: 'org.okazu-diary.embed.external',
    uri: meta.url ?? url,
  };

  if (meta.name) {
    ret.title = meta.name.textValue;
  }

  if (meta.description) {
    ret.description = meta.description;
  }

  if (meta.image?.[0]) {
    const image = meta.image[0];
    const thumb: OrgOkazuDiaryEmbedExternal.Thumb = {
      uri: image.contentUrl,
    };

    let res;
    try {
      res = await util.fetch(image.contentUrl);
    } catch (e) {
      console.error(`Error while fetching thumbnail of ${url}:`, e);
    }
    if (res) {
      if (!res.ok) {
        console.error(`HTTP status ${res.status} from thumbnail of ${url}`);
      } else {
        let bytes;
        try {
          bytes = await res.bytes();
        } catch (e) {
          console.error(`Unable to read thumbnail of ${url}:`, e);
        }
        if (bytes) {
          thumb.cid = (await cidForRawBytes(bytes)).toString();
        }
      }
    }

    ret.thumb = thumb;
  }

  return ret;
}

async function resolveSubjectFromAtUri(
  uri: string,
): Promise<OrgOkazuDiaryEmbedRecord.Main | undefined> {
  let parsed;
  try {
    parsed = new AtUri(uri);
  } catch {
    console.error(`URI is not valid AT URI: ${uri}`);
    return;
  }

  const rkey = parsed.rkey;
  if (!rkey) {
    console.error(`URI is not record URI: ${uri}`);
    return;
  }

  let id: string = parsed.host;
  if (!isDid(id)) {
    let resolved;
    try {
      resolved = await handleResolver.resolve(parsed.host);
    } catch {
      // noop
    }
    if (!resolved) {
      console.error(`Unable to resolve handle: ${id}`);
      return;
    }
    id = resolved;
  }

  let didDoc;
  try {
    didDoc = await didResolver.resolve(id);
  } catch (e) {
    console.error(`Error while resolving DID ${id}:`, e);
    return;
  }
  if (!didDoc) {
    console.error(`Unable to resolve DID: ${id}`);
    return;
  }

  const pds = getPds(didDoc);
  if (!pds) {
    console.error(`DID ${id} does not have atproto PDS`);
    return;
  }

  const client = new AtpBaseClient({
    service: pds,
  });

  const res = await client.com.atproto.repo.getRecord({
    repo: id,
    collection: parsed.collection,
    rkey,
  });

  const cid = res.data.cid ?? (await cidForRecord(res.data.value)).toString();

  return {
    $type: 'org.okazu-diary.embed.record',
    record: { uri, cid },
  };
}
