import { TID } from '@atproto/common-web';
import { isDid, type Did } from '@atproto/did';
import {
  DidResolver,
  getPds,
  HandleResolver,
  MemoryCache,
} from '@atproto/identity';
import { cidForLex } from '@atproto/lex-cbor';
import { Client } from '@atproto/lex-client';
import { cidForRawBytes } from '@atproto/lex-data';
import {
  AtUri,
  isValidUri,
  type AtIdentifierString,
  type AtUriString,
  type UriString,
} from '@atproto/syntax';
import { comAtproto, orgOkazuDiary } from '@okazu-diary/api';
import * as kondate from '@okazu-diary/kondate';

import type {
  ExportMaterialStore,
  ImportMaterialStore,
} from './material-store.js';
import * as util from './util.js';

export * from './material-store.js';

export interface FromShikorismOptions {
  privateAs?: 'public' | 'unlisted' | undefined;
  resolveLink?: 'error' | 'force' | boolean | undefined;
  tagLangs?: Map<string, string | undefined> | undefined;
}

export interface Material {
  rkey: string;
  record: orgOkazuDiary.material.external.Main;
  kondate?: kondate.Metadata | undefined;
  cid?: string | undefined;
  resolution: ResolutionStatuses | undefined;
}

export interface ResolutionStatuses {
  uri: ResolutionStatus;
  record: ResolutionStatus;
  thumb: ResolutionStatus;
  authorAvatar: ResolutionStatus;
}

export type ResolutionStatus = 'resolved' | 'error' | undefined;

export interface ImportedRecord {
  rkey: string;
  record: orgOkazuDiary.feed.entry.Main;
}

export interface FromCSVRowOptions extends FromShikorismOptions {}

export async function fromCSVRow(
  row: string[],
  actorDid: string,
  materials: ImportMaterialStore,
  options?: FromCSVRowOptions,
): Promise<ImportedRecord | undefined> {
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
  const { privateAs, resolveLink, tagLangs } = options ?? {};

  let visibility;
  if (isPrivate === 'true') {
    if (!privateAs) {
      return;
    }
    visibility = privateAs;
  } else {
    visibility = 'public';
  }

  const isoDatetime =
    datetime.replaceAll('/', '-').replaceAll(' ', 'T') + '+09:00';

  const rkey = TID.fromTime(Date.parse(isoDatetime) * 1000, 0).toString();
  const record: orgOkazuDiary.feed.entry.Main = {
    $type: 'org.okazu-diary.feed.entry',
    datetime: isoDatetime,
    tags: tags.map((value) => ({ value })),
    labels: {
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: is_too_sensitive ? 'porn' : 'sexual' }],
    } satisfies comAtproto.label.defs.SelfLabels,
    hadHiatus: discardElapsedTime === 'true',
    visibility,
  };

  if (note) {
    record.note = note;
  }

  if (link) {
    if (!isValidUri(link)) {
      console.warn('Skipping invalid link:', link);
    } else {
      const material = await getOrMakeMaterial(
        materials,
        link,
        rkey,
        tags,
        is_too_sensitive,
        resolveLink,
        tagLangs,
      );
      record.subjects = [await materialToStrongRef(material, actorDid)];
    }
  }

  return { rkey, record };
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
  actorDid: string,
  materials: ImportMaterialStore,
  options?: FromCheckinOptions,
): Promise<ImportedRecord | undefined> {
  const { privateAs, resolveLink, tagLangs } = options ?? {};

  let visibility;
  if (checkin.is_private) {
    if (!privateAs) {
      return;
    }
    visibility = privateAs;
  } else {
    visibility = 'public';
  }

  const rkey = TID.fromTime(
    Date.parse(checkin.checked_in_at) * 1000,
    0,
  ).toString();
  const record: orgOkazuDiary.feed.entry.Main = {
    $type: 'org.okazu-diary.feed.entry',
    datetime: checkin.checked_in_at,
    labels: {
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: checkin.is_too_sensitive ? 'porn' : 'sexual' }],
    } satisfies comAtproto.label.defs.SelfLabels,
    hadHiatus: checkin.discard_elapsed_time ?? false,
    visibility,
  };

  if (checkin.tags) {
    record.tags = checkin.tags.map((value) => ({ value }));
  }

  if (checkin.link) {
    if (!isValidUri(checkin.link)) {
      console.warn('Skipping invalid link:', checkin.link);
    } else {
      const material = await getOrMakeMaterial(
        materials,
        checkin.link,
        rkey,
        checkin.tags,
        checkin.is_too_sensitive,
        resolveLink,
        tagLangs,
      );
      record.subjects = [await materialToStrongRef(material, actorDid)];
    }
  }

  if (checkin.note) {
    record.note = checkin.note;
  }

  if (checkin.is_private) {
    if (!privateAs) {
      return;
    }
    record.visibility = privateAs;
  }

  if (checkin.discard_elapsed_time) {
    record.hadHiatus = true;
  }

  return { rkey, record };
}

export async function toCheckin(
  record: orgOkazuDiary.feed.entry.Main,
  materials: ExportMaterialStore,
): Promise<Checkin> {
  const ret: Checkin = {
    checked_in_at: record.datetime,
  };

  const subjects =
    record.subjects &&
    (await Promise.all(
      record.subjects.map(async ({ uri }) => {
        const parsed = new AtUri(uri);
        const rkey = parsed.rkey;
        if (rkey) {
          throw new Error(`Missing rkey in subject URI: ${uri}`);
        }
        const subject = await materials.getRkey(rkey);
        if (!subject) {
          throw new Error(`Subject ${rkey} not found in the store`);
        }
        return subject;
      }),
    ));

  if (record.tags) {
    ret.tags = record.tags.map(({ value }) => value);
  }

  let note = record.note;
  if (subjects) {
    const [first, ...rest] = subjects.reduce((acc: string[], s) => {
      const link = s.record.uri;
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

  const is_too_sensitive = subjects?.some((s) => {
    if (!s.record.labels) return;
    const result = comAtproto.label.defs.selfLabels.safeValidate(
      s.record.labels,
    );
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

export interface HydrateMaterialOptions {
  /**
   * Whether to resolve link metadata.
   * - `true` - Resolve the link if not done yet.
   * - `'error'` - Resolve the link if not done yet, or retry previously failed resolution.
   * - `'force'` - Resolve the link and overwrite the metadata even if it has already been resolved.
   * - `false` (default) - Never resolve the link.
   */
  resolveLink?: 'error' | 'force' | boolean | undefined;
}

export async function hydrateMaterial(
  material: Material,
  options?: HydrateMaterialOptions,
): Promise<boolean> {
  const link = material.record.uri;
  if (!link) {
    return false;
  }

  const { resolveLink } = options ?? {};

  material.resolution ??= {
    uri: undefined,
    record: undefined,
    thumb: undefined,
    authorAvatar: undefined,
  };

  let updated = false;

  const updateUriMeta =
    (resolveLink && (!material.resolution.uri || !material.kondate)) ||
    resolveLink === 'force' ||
    (resolveLink === 'error' && material.resolution.uri === 'error');
  const resolveRecord =
    resolveLink === 'force' ||
    (resolveLink === 'error' && material.resolution.record === 'error');
  if (updateUriMeta || resolveRecord) {
    let result: kondate.ResolveResult | undefined;
    try {
      result = await kondate.resolve(link, {
        fetch: util.fetch,
        preferDiscovered: ['at-uri', 'activity-streams'],
      });
    } catch (e) {
      console.error(`Error while resolving link: ${link}\n`, e);
      material.resolution.uri = 'error';
    }

    if (result) {
      material.resolution.uri = 'resolved';
      material.kondate = result.value;
      updated = true;
    }
  }

  const meta = material.kondate;
  if (meta) {
    if (meta.name) {
      material.record.title = meta.name.textValue;
    } else {
      const creatorName = meta.creator?.[0].name;
      if (creatorName) {
        material.record.title = creatorName.textValue;
      }
    }

    if (meta.description) {
      material.record.description = meta.description;
    }

    const image = meta.image?.[0];
    if (image && isValidUri(image.contentUrl)) {
      material.record.thumb = {
        url: image.contentUrl,
      };
    }

    const atUri = meta.resolver?.at?.uri;
    if (
      atUri &&
      ((resolveLink && !material.resolution.record) || resolveRecord)
    ) {
      await freezeRecordRef(atUri, material);
      updated ||= material.resolution.record === 'resolved';
    }

    const creator = meta.creator?.filter(
      (c): c is typeof c & { url: UriString } => isValidUri(c.url),
    )[0];
    if (creator) {
      const author: orgOkazuDiary.material.external.Profile = {
        uri: creator.url,
      };
      const name = creator.name?.textValue;
      if (name !== undefined) {
        author.name = name;
      }
      const avatarUrl = creator.image?.contentUrl;
      if (isValidUri(avatarUrl)) {
        author.avatar = {
          image: {
            url: avatarUrl,
          },
        };
      }
      material.record.author = author;
    }
  }

  const thumb = material.record.thumb;
  if (
    thumb &&
    ((resolveLink && !material.resolution.thumb) ||
      resolveLink === 'force' ||
      (resolveLink === 'error' && material.resolution.thumb === 'error'))
  ) {
    updated =
      (await hydrateImage('thumb', thumb, material.resolution)) || updated;
  }

  const avatar = material.record.author?.avatar;
  if (
    avatar &&
    ((resolveLink && !material.resolution.authorAvatar) ||
      resolveLink === 'force' ||
      (resolveLink === 'error' && material.resolution.authorAvatar === 'error'))
  ) {
    updated =
      (await hydrateImage('authorAvatar', avatar.image, material.resolution)) ||
      updated;
  }

  return updated;
}

async function hydrateImage(
  kind: keyof ResolutionStatuses,
  image: orgOkazuDiary.material.external.Thumb,
  resolution: ResolutionStatuses,
): Promise<boolean | undefined> {
  let updated;

  let res;
  try {
    res = await util.fetch(image.url);
  } catch (e) {
    console.error(`Error while fetching image ${image.url}:`, e);
    resolution[kind] = 'error';
  }

  if (res) {
    if (!res.ok) {
      console.error(`HTTP status ${res.status} from image ${image.url}`);
      resolution[kind] = 'error';
    } else {
      let bytes;
      try {
        bytes = await res.bytes();
      } catch (e) {
        console.error(`Unable to read image ${image.url}:`, e);
        resolution[kind] = 'error';
      }
      if (bytes) {
        image.cid = (await cidForRawBytes(bytes)).toString();
        resolution[kind] = 'resolved';
        updated = true;
      }
    }
  }

  return updated;
}

async function getOrMakeMaterial(
  materials: ImportMaterialStore,
  link: UriString,
  rkey: string,
  tags: string[] | undefined,
  sensitive: boolean | undefined,
  resolveLink: 'error' | 'force' | boolean | undefined,
  tagLangs: Map<string, string | undefined> | undefined,
) {
  let material;

  const ms = materials.getUri(link);
  if (ms) {
    for await (material of ms) {
      // Iterate until taking the last material.
    }
  }

  if (material) {
    let updated = await hydrateMaterial(material, { resolveLink });

    const unstoredTags = new Set(tags).difference(
      new Set(material.record.tags?.map(({ value }) => value)),
    );
    if (unstoredTags.size) {
      updated = true;
      (material.record.tags ??= []).push(
        ...unstoredTags.values().map((value) => {
          const tag: orgOkazuDiary.material.defs.Tag = { value };
          const lang = tagLangs?.get(value);
          if (lang) {
            tag.lang = lang;
          }
          return tag;
        }),
      );
    }

    if (sensitive && !material.record.labels) {
      updated = true;
      material.record.labels = {
        $type: 'com.atproto.label.defs#selfLabels',
        values: [{ val: 'porn' }],
      } satisfies comAtproto.label.defs.SelfLabels;
    }

    if (updated) {
      materials.add(material);
    }
  } else {
    material = await materialFromLink(
      link,
      rkey,
      tags,
      sensitive,
      resolveLink,
      tagLangs,
    );
    await materials.add(material);
  }

  return material;
}

async function materialFromLink(
  link: UriString,
  rkey: string,
  tags: string[] | undefined,
  sensitive: boolean | undefined,
  resolveLink: 'error' | 'force' | boolean | undefined,
  tagLangs: Map<string, string | undefined> | undefined,
): Promise<Material> {
  const ret: Material = {
    rkey,
    record: {
      $type: 'org.okazu-diary.material.external',
      uri: link,
    },
    resolution: undefined,
  };

  if (resolveLink) {
    await hydrateMaterial(ret, { resolveLink });
  }

  if (tags?.length) {
    ret.record.tags = tags.map((value) => {
      const tag: orgOkazuDiary.material.defs.Tag = { value };
      const lang = tagLangs?.get(value);
      if (lang) {
        tag.lang = lang;
      }
      return tag;
    });
  }

  if (sensitive) {
    ret.record.labels = {
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: 'porn' }],
    } satisfies comAtproto.label.defs.SelfLabels;
  }

  ret.record.genericLabels = {
    $type: 'com.atproto.label.defs#selfLabels',
    values: [{ val: 'sexual' }],
  } satisfies comAtproto.label.defs.SelfLabels;

  return ret;
}

async function materialToStrongRef(
  material: Material,
  repo: string,
): Promise<NonNullable<orgOkazuDiary.feed.entry.Main['subjects']>[number]> {
  return {
    uri: `at://${repo}/org.okazu-diary.material.external/${material.rkey}` as const,
    cid: material.cid ?? (await cidForLex(material.record)).toString(),
  };
}

const didResolver = new DidResolver({
  didCache: new MemoryCache(5 * 60 * 1000, 60 * 60 * 1000),
});
const handleResolver = new HandleResolver();

async function freezeRecordRef(
  uri: AtUriString,
  material: Material,
): Promise<void> {
  material.resolution ??= {
    uri: undefined,
    record: undefined,
    thumb: undefined,
    authorAvatar: undefined,
  };

  let parsed;
  try {
    parsed = new AtUri(uri);
  } catch {
    console.error(`URI is not valid AT URI: ${uri}`);
    // Mark the irrecoverable error as `resolved`.
    material.resolution.record = 'resolved';
    return;
  }

  const rkey = parsed.rkey;
  if (!rkey) {
    console.error(`URI is not record URI: ${uri}`);
    material.resolution.record = 'resolved';
    return;
  }

  let id: AtIdentifierString = parsed.host;
  if (!isDid(id)) {
    let resolved;
    try {
      resolved = await handleResolver.resolve(parsed.host);
    } catch {
      // noop
    }
    if (!resolved) {
      console.error(`Unable to resolve handle: ${id}`);
      material.resolution.record = 'error';
      return;
    }
    id = resolved as Did;
  }

  let didDoc;
  try {
    didDoc = await didResolver.resolve(id);
  } catch (e) {
    console.error(`Error while resolving DID ${id}:`, e);
    material.resolution.record = 'error';
    return;
  }
  if (!didDoc) {
    console.error(`Unable to resolve DID: ${id}`);
    material.resolution.record = 'error';
    return;
  }

  const pds = getPds(didDoc);
  if (!pds) {
    console.error(`DID ${id} does not have atproto PDS`);
    material.resolution.record = 'error';
    return;
  }

  const client = new Client({
    service: pds,
  });

  let cid;
  try {
    const res = await client.getRecord(
      parsed.collection as typeof parsed.collection &
        `${string}.${string}.${string}`,
      rkey,
      { repo: id },
    );
    cid = res.body.cid ?? (await cidForLex(res.body.value)).toString();
  } catch (e) {
    console.error('Error while getting (CID of) record:', e);
    material.resolution.record = 'error';
    return;
  }

  material.record.record = {
    $type: 'com.atproto.repo.strongRef',
    uri,
    cid,
  };
  material.resolution.record = 'resolved';
}
