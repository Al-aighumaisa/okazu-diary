import {
  AtpBaseClient,
  AtUri,
  ComAtprotoLabelDefs,
  ComAtprotoRepoStrongRef,
} from '@atproto/api';
import { cidForCbor } from '@atproto/common';
import { TID } from '@atproto/common-web';
import { isDid } from '@atproto/did';
import {
  DidResolver,
  getPds,
  HandleResolver,
  MemoryCache,
} from '@atproto/identity';
import { cidForRawBytes } from '@atproto/lex-cbor';
import { lexToIpld } from '@atproto/lexicon';
import {
  OrgOkazuDiaryMaterialExternal,
  OrgOkazuDiaryFeedEntry,
} from '@okazu-diary/api';
import * as kondate from '@okazu-diary/kondate';

import type {
  ExportMaterialStore,
  ImportMaterialStore,
} from './material-store.js';
import * as util from './util.js';

export * from './material-store.js';

export interface FromShikorismOptions {
  privateAs?: 'public' | 'unlisted' | undefined;
  resolveLink?: boolean | undefined;
}

export interface Material {
  rkey: string;
  record: OrgOkazuDiaryMaterialExternal.Main;
  cid?: string | undefined;
  resolution: ResolutionStatuses | undefined;
}

export interface ResolutionStatuses {
  uri: ResolutionStatus;
  record: ResolutionStatus;
  thumb: ResolutionStatus;
}

export type ResolutionStatus = 'resolved' | 'error' | undefined;

export interface ImportedRecord {
  rkey: string;
  record: OrgOkazuDiaryFeedEntry.Main;
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
  const { privateAs, resolveLink } = options ?? {};

  const isoDatetime =
    datetime.replaceAll('/', '-').replaceAll(' ', 'T') + '+09:00';

  const rkey = TID.fromTime(Date.parse(isoDatetime) * 1000, 0).toString();
  const record: OrgOkazuDiaryFeedEntry.Record = {
    $type: 'org.okazu-diary.feed.entry',
    datetime: isoDatetime,
    tags: tags.map((value) => ({ value })),
    labels: {
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: is_too_sensitive ? 'porn' : 'sexual' }],
    } satisfies ComAtprotoLabelDefs.SelfLabels,
    hadHiatus: discardElapsedTime === 'true',
    visibility: (isPrivate === 'true' && privateAs) || 'public',
  };

  if (note) {
    record.note = note;
  }

  if (link) {
    const material = await getOrUpdateMaterial(
      materials,
      link,
      rkey,
      tags,
      is_too_sensitive,
      resolveLink,
    );
    record.subjects = [await materialToStrongRef(material, actorDid)];
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
  const { privateAs, resolveLink } = options ?? {};

  const rkey = TID.fromTime(
    Date.parse(checkin.checked_in_at) * 1000,
    0,
  ).toString();
  const record: OrgOkazuDiaryFeedEntry.Record = {
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
    record.tags = checkin.tags.map((value) => ({ value }));
  }

  if (checkin.link) {
    const material = await getOrUpdateMaterial(
      materials,
      checkin.link,
      rkey,
      checkin.tags,
      checkin.is_too_sensitive,
      resolveLink,
    );
    record.subjects = [await materialToStrongRef(material, actorDid)];
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
  record: OrgOkazuDiaryFeedEntry.Record,
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
    const result = ComAtprotoLabelDefs.validateSelfLabels(s.record.labels);
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

export interface ResolveMaterialOptions {
  overwrite?: 'error' | boolean | undefined;
}

export async function resolveMaterial(
  material: Material,
  options?: ResolveMaterialOptions,
): Promise<void> {
  const link = material.record.uri;
  if (!link) {
    return;
  }

  const { overwrite } = options ?? {};

  material.resolution ??= {
    uri: undefined,
    record: undefined,
    thumb: undefined,
  };

  const writeUriMeta =
    !material.resolution.uri ||
    overwrite === true ||
    (overwrite === 'error' && material.resolution.uri === 'error');
  const resolveRecord =
    overwrite === true ||
    (overwrite === 'error' && material.resolution.record === 'error');
  if (writeUriMeta || resolveRecord) {
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

    let meta;
    if (result) {
      material.resolution.uri = 'resolved';
      meta = result.value;
    }

    let atUri;
    if (meta) {
      atUri = meta.resolver?.at?.uri;

      if (writeUriMeta) {
        if (meta.name) {
          material.record.title = meta.name.textValue;
        }

        if (meta.description) {
          material.record.description = meta.description;
        }

        const image = meta.image?.[0];
        if (image) {
          material.record.thumb = {
            url: image.contentUrl,
          };
        }
      }
    }

    if (atUri && (!material.resolution.record || resolveRecord)) {
      const ref = await freezeATRef(atUri, material.resolution);
      if (ref) {
        material.record.record = ref;
      }
    }
  }

  const thumb = material.record.thumb;
  if (
    thumb &&
    (!material.resolution.thumb ||
      overwrite === true ||
      (overwrite === 'error' && material.resolution.thumb === 'error'))
  ) {
    let res;
    try {
      res = await util.fetch(thumb.url);
    } catch (e) {
      console.error(`Error while fetching thumbnail of ${thumb.url}:`, e);
      material.resolution.thumb = 'error';
    }
    if (res) {
      if (!res.ok) {
        console.error(
          `HTTP status ${res.status} from thumbnail of ${thumb.url}`,
        );
        material.resolution.thumb = 'error';
      } else {
        let bytes;
        try {
          bytes = await res.bytes();
        } catch (e) {
          console.error(`Unable to read thumbnail of ${thumb.url}:`, e);
          material.resolution.thumb = 'error';
        }
        if (bytes) {
          thumb.cid = (await cidForRawBytes(bytes)).toString();
          material.resolution.thumb = 'resolved';
        }
      }
    }
  }
}

async function getOrUpdateMaterial(
  materials: ImportMaterialStore,
  link: string,
  rkey: string,
  tags: string[] | undefined,
  sensitive: boolean | undefined,
  resolveLink: boolean | undefined,
) {
  let material;

  const ms = materials.getUri(link);
  if (ms) {
    for await (material of ms) {
      // Iterate until taking the last material.
    }
  }

  if (material) {
    let updated;

    const unstoredTags = new Set(tags).difference(
      new Set(material.record.tags?.map(({ value }) => value)),
    );
    if (unstoredTags.size) {
      updated = true;
      (material.record.tags ??= []).push(
        ...unstoredTags.values().map((value) => ({ value })),
      );
    }

    if (sensitive && !material.record.labels) {
      updated = true;
      material.record.labels = {
        $type: 'com.atproto.label.defs#selfLabels',
        values: [{ val: 'porn' }],
      } satisfies ComAtprotoLabelDefs.SelfLabels;
    }

    if (updated) {
      materials.add(material);
    }
  } else {
    material = await materialFromLink(link, rkey, tags, sensitive, resolveLink);
    await materials.add(material);
  }

  return material;
}

async function materialFromLink(
  link: string,
  rkey: string,
  tags: string[] | undefined,
  sensitive: boolean | undefined,
  resolveLink: boolean | undefined,
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
    await resolveMaterial(ret);
  }

  if (tags?.length) {
    ret.record.tags = tags.map((value) => ({ value }));
  }

  if (sensitive) {
    ret.record.labels = {
      $type: 'com.atproto.label.defs#selfLabels',
      values: [{ val: 'porn' }],
    } satisfies ComAtprotoLabelDefs.SelfLabels;
  }

  return ret;
}

async function materialToStrongRef(
  material: Material,
  repo: string,
): Promise<ComAtprotoRepoStrongRef.Main> {
  return {
    uri: `at://${repo}/org.okazu-diary.material.external/${material.rkey}`,
    cid:
      material.cid ?? (await cidForCbor(lexToIpld(material.record))).toString(),
  };
}

const didResolver = new DidResolver({
  didCache: new MemoryCache(5 * 60 * 1000, 60 * 60 * 1000),
});
const handleResolver = new HandleResolver();

async function freezeATRef(
  uri: string,
  resolutionState: ResolutionStatuses,
): Promise<ComAtprotoRepoStrongRef.Main | undefined> {
  let parsed;
  try {
    parsed = new AtUri(uri);
  } catch {
    console.error(`URI is not valid AT URI: ${uri}`);
    // Mark the irrecoverable error as `resolved`.
    resolutionState.record = 'resolved';
    return;
  }

  const rkey = parsed.rkey;
  if (!rkey) {
    console.error(`URI is not record URI: ${uri}`);
    resolutionState.record = 'resolved';
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
      resolutionState.record = 'error';
      return;
    }
    id = resolved;
  }

  let didDoc;
  try {
    didDoc = await didResolver.resolve(id);
  } catch (e) {
    console.error(`Error while resolving DID ${id}:`, e);
    resolutionState.record = 'error';
    return;
  }
  if (!didDoc) {
    console.error(`Unable to resolve DID: ${id}`);
    resolutionState.record = 'error';
    return;
  }

  const pds = getPds(didDoc);
  if (!pds) {
    console.error(`DID ${id} does not have atproto PDS`);
    resolutionState.record = 'error';
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

  const cid =
    res.data.cid ?? (await cidForCbor(lexToIpld(res.data.value))).toString();

  return {
    $type: 'com.atproto.repo.strongRef',
    uri,
    cid,
  };
}
