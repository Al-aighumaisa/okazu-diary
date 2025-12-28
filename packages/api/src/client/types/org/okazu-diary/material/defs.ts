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

const is$typed = _is$typed,
  validate = _validate
const id = 'org.okazu-diary.material.defs'

export interface Tag {
  $type?: 'org.okazu-diary.material.defs#tag'
  value: string
}

const hashTag = 'tag'

export function isTag<V>(v: V) {
  return is$typed(v, id, hashTag)
}

export function validateTag<V>(v: V) {
  return validate<Tag & V>(v, id, hashTag)
}
