import fsPromises from 'node:fs/promises';
import path from 'node:path';

// import * as tissue from '@okazu-diary/shikorism-interop';
import * as tissue from '../index.js';

export class FsExportMaterialStore
  implements tissue.ExportMaterialStore, tissue.ImportMaterialStore
{
  base: string;
  uriMap: Map<string, Set<string>>;

  constructor(base: string, uriMap: Map<string, Set<string>>) {
    this.base = base;
    this.uriMap = uriMap;
  }

  static async create(base: string): Promise<FsExportMaterialStore> {
    const uriMap = new Map<string, Set<string>>();
    const ret = new this(base, uriMap);

    await fsPromises.mkdir(base, { recursive: true });

    for (const entry of await fsPromises.readdir(base, {
      withFileTypes: true,
    })) {
      if (!entry.isFile()) {
        continue;
      }

      const match = /^(.*)\.json$/.exec(entry.name);
      if (!match) {
        continue;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const material: tissue.Material = await readJSON(
        path.join(entry.parentPath, entry.name),
      );

      const uri = material.record.uri;
      if (uri) {
        const rkey = match[1];
        const set = uriMap.get(uri);
        if (set) {
          set.add(rkey);
        } else {
          uriMap.set(uri, new Set([rkey]));
        }
      }
    }

    return ret;
  }

  async add(material: tissue.Material): Promise<void> {
    await fsPromises.writeFile(
      materialFilePath(this.base, material.rkey),
      JSON.stringify(material, null, 2),
    );
  }

  async getRkey(rkey: string): Promise<tissue.Material | undefined> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return readJSON(materialFilePath(this.base, rkey));
  }

  async *getUri(uri: string): AsyncGenerator<tissue.Material> {
    const set = this.uriMap.get(uri);
    if (!set) {
      return;
    }
    for (const rkey of set) {
      const material = await this.getRkey(rkey);
      if (material) {
        yield material;
      }
    }
  }
}

function materialFilePath(base: string, rkey: string): string {
  return path.join(base, `${rkey}.json`);
}

async function readJSON(path: string): Promise<any> {
  let text;
  try {
    text = await fsPromises.readFile(path, 'utf8');
  } catch (e) {
    if (typeof e === 'object' && e && 'code' in e && e.code === 'ENOENT') {
      return;
    }
    throw e;
  }

  return JSON.parse(text);
}
