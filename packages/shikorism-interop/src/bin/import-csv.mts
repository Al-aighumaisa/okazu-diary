/**
 * Imports Tissue checkins from the exported CSV file and dumps them as Okazu-Diary.org records
 * into a local directory.
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import * as tissue from '../index.js';
import * as csv from 'csv-parse';

import { FsExportMaterialStore } from './common.js';

const [csvPath, did] = process.argv.slice(2);

const materials = await FsExportMaterialStore.create(
  path.join(did, 'materials'),
);

const entryDir = path.join(did, 'org.okazu-diary.feed.entry');
await fsPromises.mkdir(entryDir, { recursive: true });

const f = await fsPromises.open(csvPath);
const parser = f
  .createReadStream()
  .pipe(csv.parse({ relax_column_count: true }));

const rows = parser[Symbol.asyncIterator]();

await rows.next();

for await (const row of rows) {
  const imported = await tissue.fromCSVRow(row, did, materials, {
    resolveLink: 'error',
    privateAs: 'unlisted',
  });

  if (imported) {
    await fsPromises.writeFile(
      path.join(entryDir, `${imported.rkey}.json`),
      JSON.stringify(imported.record, null, 2),
    );
  }
}
