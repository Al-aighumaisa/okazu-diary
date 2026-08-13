/**
 * Imports Tissue checkins via the API and dumps them as Okazu-Diary.org records into a local
 * directory.
 */

import fsPromises from 'node:fs/promises';
import path from 'node:path';

import * as tissue from '../index.js';

import { FsExportMaterialStore } from './common.js';

let [did, tokenPath, me] = process.argv.slice(2);

const entryDir = path.join(did, 'org.okazu-diary.feed.entry');

const [authorization, [cursorDateFile, cursorDate], materials, tagLangs] =
  await Promise.all([
    fsPromises
      .readFile(tokenPath, { encoding: 'utf8' })
      .then((token) => `Bearer ${token.trimEnd()}`),
    fsPromises
      .open(
        path.join(did, 'shikorism-cursor.txt'),
        fsPromises.constants.O_RDWR | fsPromises.constants.O_CREAT,
      )
      .then(async (f) => [f, await f.readFile('utf8')] as const),
    FsExportMaterialStore.create(path.join(did, 'materials')),
    fsPromises.readFile(path.join(did, 'tags.tsv'), 'utf8').then(
      (text) =>
        new Map(
          text.split('\n').map((l) => {
            const [k, v] = l.trimEnd().split('\t');
            return [k, v || undefined];
          }),
        ),
    ),
    fsPromises.mkdir(entryDir, { recursive: true }),
  ]);

if (me === undefined) {
  const res = await fetch('https://shikorism.net/api/v1/me', {
    headers: {
      authorization,
    },
  });
  if (!res.ok) {
    throw new Error(
      `Unable to get username of authenticated user: HTTP ${res.status}`,
    );
  }
  const json: any = await res.json();
  me = json.name;
}

const per_page = cursorDate ? 10 : 100;
const url = new URL(
  `https://shikorism.net/api/v1/users/${me}/checkins?per_page=${per_page}`,
);
if (cursorDate) {
  url.searchParams.append('since', cursorDate);
}

let latestDate;
let page = 1;
outer: while (true) {
  if (page > 1) {
    url.searchParams.set('page', `${page}`);
  }

  const res = await fetch(url, {
    headers: {
      authorization,
    },
  });
  if (!res.ok) {
    throw new Error(`Error retrieving checkins: HTTP ${res.status}`);
  }

  const checkins = (await res.json()) as tissue.Checkin[];

  if (!checkins.length) {
    break;
  }

  for (const c of checkins) {
    latestDate ??= c.checked_in_at.split('T')[0];

    const imported = await tissue.fromCheckin(c, did, materials, {
      resolveLink: true,
      privateAs: 'unlisted',
      tagLangs,
    });

    if (imported) {
      const entryPath = path.join(entryDir, `${imported.rkey}.json`);
      let f;
      try {
        f = await fsPromises.open(
          entryPath,
          fsPromises.constants.O_WRONLY |
            fsPromises.constants.O_CREAT |
            fsPromises.constants.O_EXCL,
        );
      } catch (e) {
        if (typeof e === 'object' && e && 'code' in e && e.code === 'EEXIST') {
          break outer;
        }
        throw e;
      }
      await f.writeFile(JSON.stringify(imported.record, null, 2));
    }
  }

  page++;
}

if (latestDate) {
  await cursorDateFile.truncate();
  await cursorDateFile.write(latestDate, 0);
  await cursorDateFile.close();
}
