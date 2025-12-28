/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from '@atproto/lexicon'
import { CID } from 'multiformats/cid'
import { validate as _validate } from '../../../../lexicons'
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from '../../../../util'
import type * as ComAtprotoRepoStrongRef from '../../../com/atproto/repo/strongRef.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'org.okazu-diary.material.collectionItem'

export interface Main {
  $type: 'org.okazu-diary.material.collectionItem'
  /** Reference to the collection record (`org.okazu-diary.feed.collection`). */
  collection: string
  /** Reference(s) to a material or set of materials (`org.okazu-diary.material.external`) to be included in the collection. */
  subjects: string[]
  /** Remarks on the collection item. */
  note?: string
  via?: ComAtprotoRepoStrongRef.Main
  createdAt: string
  [k: string]: unknown
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain, true)
}

export {
  type Main as Record,
  isMain as isRecord,
  validateMain as validateRecord,
}
