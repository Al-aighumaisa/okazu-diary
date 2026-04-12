/**
 * Syncs local record dumps to the PDS.
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';

import { OrgOkazuDiaryFeedEntry } from '@okazu-diary/api';
import { AtpBaseClient, AtUri, ComAtprotoRepoApplyWrites } from '@atproto/api';

import { FsExportMaterialStore } from './common.js';

const [did, service, jwtPath] = process.argv.slice(2);

const materials = await FsExportMaterialStore.create(
  path.join(did, 'materials'),
);

const entryDir = path.join(did, 'org.okazu-diary.feed.entry');
await fsPromises.mkdir(entryDir, { recursive: true });

const [
  [exportedEntries, exportedEntryListFile],
  [outdatedEntries, outdatedEntriyListFile],
  [exportedMaterials, exportedMaterialListFile],
  [outdatedMaterials, outdatedMaterialListFile],
] = await Promise.all(
  [
    'exported-entries.txt',
    'outdated-entries.txt',
    'exported-materials.txt',
    'outdated-materials.txt',
  ].map((name) =>
    fsPromises
      .open(
        path.join(did, name),
        fsPromises.constants.O_RDWR | fsPromises.constants.O_CREAT,
      )
      .then(async (f) => {
        const set = new Set<string>();
        for await (const l of readline.createInterface({
          input: f.createReadStream({ autoClose: false }),
        })) {
          const rkey = l.trim();
          if (rkey.length) {
            set.add(rkey);
          }
        }
        return [set, f] as const;
      }),
  ),
);

const writes: ((
  | ComAtprotoRepoApplyWrites.Create
  | ComAtprotoRepoApplyWrites.Update
) & {
  $type: string;
  collection:
    | 'org.okazu-diary.material.external'
    | 'org.okazu-diary.feed.entry';
})[] = [];

const MAX_WRITES = 100;
const MAX_PTS = 3000;
let usedPoints = 0;
outer: for (const dirEntry of await fsPromises.readdir(entryDir, {
  withFileTypes: true,
})) {
  if (!dirEntry.isFile()) {
    continue;
  }

  const match = /^(.*)\.json$/.exec(dirEntry.name);
  if (!match) {
    continue;
  }
  const rkey = match[1];

  const text = await fsPromises.readFile(
    path.join(dirEntry.parentPath, dirEntry.name),
    'utf8',
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const entry: OrgOkazuDiaryFeedEntry.Main = JSON.parse(text);

  for (const subject of entry.subjects ?? []) {
    const atUri = new AtUri(subject.uri);
    if (!exportedMaterials.has(atUri.rkey)) {
      if (writes.length >= MAX_WRITES) {
        break outer;
      } else if (usedPoints + 3 > MAX_PTS) {
        continue outer;
      }

      writes.push({
        $type: 'com.atproto.repo.applyWrites#create',
        collection: 'org.okazu-diary.material.external',
        rkey: atUri.rkey,
        value: (await materials.getRkey(atUri.rkey))!.record,
      });
      usedPoints += 3;
      exportedMaterials.add(atUri.rkey);
    } else if (outdatedMaterials.has(atUri.rkey)) {
      if (writes.length >= MAX_WRITES || usedPoints + 2 > MAX_PTS) {
        break outer;
      }

      writes.push({
        $type: 'com.atproto.repo.applyWrites#update',
        collection: 'org.okazu-diary.material.external',
        rkey: atUri.rkey,
        value: (await materials.getRkey(atUri.rkey))!.record,
      });
      usedPoints += 2;
      outdatedMaterials.delete(atUri.rkey);
    }
  }

  if (!exportedEntries.has(rkey)) {
    if (writes.length >= MAX_WRITES) {
      break;
    }

    if (usedPoints + 3 > MAX_PTS) {
      continue;
    }

    writes.push({
      $type: 'com.atproto.repo.applyWrites#create',
      collection: 'org.okazu-diary.feed.entry',
      rkey,
      value: entry,
    });
    usedPoints += 3;
    exportedEntries.add(rkey);
  } else if (outdatedEntries.has(rkey)) {
    if (writes.length >= MAX_WRITES) {
      break;
    }

    if (usedPoints + 2 > MAX_PTS) {
      break;
    }

    writes.push({
      $type: 'com.atproto.repo.applyWrites#update',
      collection: 'org.okazu-diary.feed.entry',
      rkey,
      value: entry,
    });
    usedPoints += 2;
    outdatedEntries.delete(rkey);
  }
}

const client = new AtpBaseClient({ service });

const jwt = await fsPromises.readFile(jwtPath, 'utf8');

if (writes.length) {
  console.log(`Making ${writes.length} writes (${usedPoints} pts):`);

  const groups = Object.groupBy(
    writes,
    (w) => `${w.$type}:${w.collection}` as const,
  );

  for (const [key, heading] of [
    [
      'com.atproto.repo.applyWrites#create:org.okazu-diary.material.external',
      '- Creating materials:',
    ],
    [
      'com.atproto.repo.applyWrites#create:org.okazu-diary.feed.entry',
      '- Creating entries:',
    ],
    [
      'com.atproto.repo.applyWrites#update:org.okazu-diary.material.external',
      '- Updating materials:',
    ],
    [
      'com.atproto.repo.applyWrites#update:org.okazu-diary.feed.entry',
      '- Updating entries:',
    ],
  ] as const) {
    if (key in groups) {
      console.log(
        heading,
        groups[key]!.map((w) => w.rkey),
      );
    }
  }

  try {
    const res = await client.com.atproto.repo.applyWrites(
      {
        repo: did,
        writes,
      },
      {
        headers: {
          authorization: `Bearer ${jwt}`,
        },
      },
    );

    console.log(res);
  } catch (e) {
    console.error(e);
    throw e;
  }
}

await Promise.all(
  [
    [exportedEntryListFile, exportedEntries] as const,
    [outdatedEntriyListFile, outdatedEntries] as const,
    [exportedMaterialListFile, exportedMaterials] as const,
    [outdatedMaterialListFile, outdatedMaterials] as const,
  ].map(([f, set]) =>
    f
      .truncate()
      .then(() => f.write([...set].join('\n'), 0))
      .then(() => f.close()),
  ),
);
