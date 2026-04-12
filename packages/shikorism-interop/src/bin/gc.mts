import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { AtpBaseClient } from '@atproto/api';
import { OrgOkazuDiaryFeedEntry } from '@okazu-diary/api';

const [did, service, jwtPath] = process.argv.slice(2);

const usedMaterials = new Set();
for (const dirEnt of await fsPromises.readdir(
  path.join(did, 'org.okazu-diary.feed.entry'),
  {
    withFileTypes: true,
  },
)) {
  if (!(dirEnt.isFile() && dirEnt.name.endsWith('.json'))) {
    continue;
  }

  const text = await fsPromises.readFile(
    path.join(dirEnt.parentPath, dirEnt.name),
    'utf8',
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const entry: OrgOkazuDiaryFeedEntry.Main = JSON.parse(text);

  if (entry.subjects) {
    for (const s of entry.subjects) {
      usedMaterials.add(s.uri.split('/').at(-1));
    }
  }
}

const materialsDir = path.join(did, 'materials');

const MAX_WRITES = 100;

const toBeDeleted = [];
for (const dirEnt of await fsPromises.readdir(materialsDir, {
  withFileTypes: true,
})) {
  if (!dirEnt.isFile()) {
    continue;
  }

  const match = /^(.*)\.json$/.exec(dirEnt.name);
  if (!match) {
    continue;
  }
  const rkey = match[1];

  if (!usedMaterials.has(rkey)) {
    toBeDeleted.push(rkey);
    if (toBeDeleted.length >= MAX_WRITES) {
      break;
    }
  }
}

if (toBeDeleted.length) {
  const client = new AtpBaseClient({ service });

  const jwt = await fsPromises.readFile(jwtPath, 'utf8');

  console.log(`Deleting ${toBeDeleted.length} materials`);

  const res = await client.com.atproto.repo.applyWrites(
    {
      repo: did,
      writes: toBeDeleted.map((rkey) => ({
        $type: 'com.atproto.repo.applyWrites#delete',
        collection: 'org.okazu-diary.material.external',
        rkey,
      })),
    },
    {
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    },
  );

  console.log(res);

  await Promise.all(
    toBeDeleted.map((rkey) =>
      fsPromises.rm(path.join(materialsDir, `${rkey}.json`)),
    ),
  );
}
