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
import type * as OrgOkazuDiaryEmbedExternal from '../embed/external.js'
import type * as OrgOkazuDiaryEmbedRecord from '../embed/record.js'
import type * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'org.okazu-diary.feed.defs'

/** A descriptor of a material used to help self-gratification. */
export interface Subject {
  $type?: 'org.okazu-diary.feed.defs#subject'
  value:
    | $Typed<OrgOkazuDiaryEmbedExternal.Main>
    | $Typed<OrgOkazuDiaryEmbedRecord.Main>
    | { $type: string }
  labels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string }
}

const hashSubject = 'subject'

export function isSubject<V>(v: V) {
  return is$typed(v, id, hashSubject)
}

export function validateSubject<V>(v: V) {
  return validate<Subject & V>(v, id, hashSubject)
}

export interface Tag {
  $type?: 'org.okazu-diary.feed.defs#tag'
  value: string
}

const hashTag = 'tag'

export function isTag<V>(v: V) {
  return is$typed(v, id, hashTag)
}

export function validateTag<V>(v: V) {
  return validate<Tag & V>(v, id, hashTag)
}
