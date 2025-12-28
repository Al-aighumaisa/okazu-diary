import { cidForCbor } from '@atproto/common';
import { lexToIpld } from '@atproto/lexicon';
import type { MST } from '@atproto/repo';

import type { Material } from './index.js';
import { OrgOkazuDiaryMaterialExternal } from '@okazu-diary/api';
import { CID } from 'multiformats/cid';

export interface MaterialStore {
  add(material: Material): CID | void | PromiseLike<CID> | PromiseLike<void>;
}

export interface ImportMaterialStore extends MaterialStore {
  getUri(uri: string): Iterable<Material> | undefined | AsyncIterable<Material>;
}

export interface ExportMaterialStore extends MaterialStore {
  getRkey(
    rkey: string,
  ): Material | undefined | PromiseLike<Material | undefined>;
}

export class InMemoryMaterialStore
  implements ImportMaterialStore, ExportMaterialStore
{
  uriMap: Map<string, Set<Material>>;
  rkeyMap: Map<string, Material>;

  constructor() {
    this.uriMap = new Map();
    this.rkeyMap = new Map();
  }

  add(material: Material): void {
    const uri = material.record.uri;
    if (uri) {
      const set = this.uriMap.get(uri);
      if (set) {
        set.add(material);
      } else {
        this.uriMap.set(uri, new Set([material]));
      }
    }

    this.rkeyMap.set(material.rkey, material);
  }

  clear(): void {
    this.uriMap.clear();
    this.rkeyMap.clear();
  }

  delete(material: Material): boolean {
    let ret = false;

    const uri = material.record.uri;
    if (uri) {
      const set = this.uriMap.get(uri);
      if (set) {
        ret = set.delete(material);
        if (!set.size) {
          this.uriMap.delete(uri);
        }
      }
    }

    const rkey = material.rkey;
    const rkeyValue = this.rkeyMap.get(rkey);
    if (rkeyValue === material) {
      ret ||= this.rkeyMap.delete(rkey);
    }

    return ret;
  }

  deleteUri(uri: string): boolean {
    const set = this.uriMap.get(uri);
    if (!set) {
      return false;
    }

    this.uriMap.delete(uri);

    for (const material of set) {
      const rkey = material.rkey;
      const rkeyValue = this.rkeyMap.get(rkey);
      if (rkeyValue === material) {
        this.rkeyMap.delete(rkey);
      }
    }

    return true;
  }

  deleteRkey(rkey: string): boolean {
    const material = this.rkeyMap.get(rkey);
    if (!material) {
      return false;
    }
    this.rkeyMap.delete(rkey);

    const uri = material.record.uri;
    if (uri) {
      const set = this.uriMap.get(uri);
      if (set) {
        set.delete(material);
        if (!set.size) {
          this.uriMap.delete(uri);
        }
      }
    }

    return true;
  }

  getRkey(rkey: string): Material | undefined {
    return this.rkeyMap.get(rkey);
  }

  getUri(uri: string): Set<Material> | undefined {
    return this.uriMap.get(uri);
  }
}

export class MSTExportMaterialStore implements ExportMaterialStore {
  constructor(public mst: MST) {}

  async add(material: Material): Promise<CID> {
    const cid = material.cid
      ? CID.parse(material.cid)
      : await cidForCbor(lexToIpld(material.record));
    this.mst = await this.mst.add(material.rkey, cid);
    return cid;
  }

  async getRkey(rkey: string): Promise<Material | undefined> {
    const cid = await this.mst.get(`org.okazu-diary.material.external/${rkey}`);
    if (!cid) {
      return;
    }
    const record = await this.mst.storage.readRecord(cid);
    const result = OrgOkazuDiaryMaterialExternal.validateMain(record);
    if (result.success) {
      return {
        rkey,
        record: result.value,
        cid: cid.toString(),
        resolution: undefined,
      };
    }
  }
}

export class MSTMaterialStore
  extends MSTExportMaterialStore
  implements ImportMaterialStore
{
  private uriMap: Map<string, Set<string>>;

  constructor(mst: MST, uriMap: Map<string, Set<string>>) {
    super(mst);
    this.uriMap = uriMap;
  }

  static async create(mst: MST): Promise<MSTExportMaterialStore> {
    const uriMap = new Map<string, Set<string>>();
    const ret = new this(mst, uriMap);

    for await (const entry of mst.walkFrom(
      'org.okazu-diary.material.external/',
    )) {
      if (!entry.isLeaf()) {
        continue;
      }
      if (!entry.key.startsWith('org.okazu-diary.material.external/')) {
        return ret;
      }

      const key = entry.key;
      const record = await mst.storage.readRecord(entry.value);
      const result = OrgOkazuDiaryMaterialExternal.validateMain(record);
      if (result.success) {
        const uri = result.value.uri;
        if (uri) {
          const rkey = key.split('/', 2)[1];
          const set = uriMap.get(uri);
          if (set) {
            set.add(rkey);
          } else {
            uriMap.set(uri, new Set([rkey]));
          }
        }
      }
    }

    return ret;
  }

  async add(material: Material): Promise<CID> {
    const uri = material.record.uri;
    const rkey = material.rkey;
    const cid = await super.add(material);

    if (uri) {
      const set = this.uriMap.get(uri);
      if (set) {
        set.add(rkey);
      } else {
        this.uriMap.set(uri, new Set([rkey]));
      }
    }

    return cid;
  }

  async *getUri(uri: string): AsyncGenerator<Material> {
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
