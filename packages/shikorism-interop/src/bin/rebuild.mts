/**
 * Rebuilds materials from locally cached Kondate metadata.
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { cidForRecord } from '@atproto/repo';
import * as tissue from '../index.js';

const [did] = process.argv.slice(2);

const materialsDir = path.join(did, 'materials');
const updatedMaterials = [];

for (const dirEntry of await fsPromises.readdir(materialsDir, {
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

  const f = await fsPromises.open(
    path.join(dirEntry.parentPath, dirEntry.name),
    fsPromises.constants.O_RDWR | fsPromises.constants.O_CREAT,
  );

  try {
    const material: tissue.Material = JSON.parse(
      await f.readFile({ encoding: 'utf8' }),
    );

    const [oldCid] = await Promise.all([
      cidForRecord(material.record),
      // Calling `hydrateMaterial` without `resolveLink` will refresh the record with existing data.
      tissue.hydrateMaterial(material),
    ]);
    const newCid = await cidForRecord(material.record);

    if (oldCid.equals(newCid)) {
      continue;
    }

    updatedMaterials.push(rkey);

    await f.truncate();
    await f.write(JSON.stringify(material, null, 2), 0);
  } finally {
    f.close();
  }
}

if (updatedMaterials.length) {
  await fsPromises.appendFile(
    path.join(did, 'outdated-materials.txt'),
    updatedMaterials.map((k) => `${k}\n`),
    { encoding: 'utf8' },
  );
}
