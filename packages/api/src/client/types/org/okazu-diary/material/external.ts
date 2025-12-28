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
import type * as OrgOkazuDiaryMaterialDefs from './defs.js'
import type * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'org.okazu-diary.material.external'

export interface Main {
  $type: 'org.okazu-diary.material.external'
  /** URI of the material, typically an HTTP(S) URL. If the URL is of a Web interface for an AT resource (such as a `bsky.app` URL), the record should also include the `record` property referencing the AT resource. */
  uri?: string
  record?: ComAtprotoRepoStrongRef.Main
  /** Title of the material, typically taken from the material's HTML `<title>` element. */
  title?: string
  /** Description of the material, typically taken from the material's HTML metadata. */
  description?: string
  thumb?: Thumb
  /** User-specified tags for the material. */
  tags?: OrgOkazuDiaryMaterialDefs.Tag[]
  labels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string }
  genericLabels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string }
  via?: ComAtprotoRepoStrongRef.Main
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

export interface Thumb {
  $type?: 'org.okazu-diary.material.external#thumb'
  cid?: string
  url: string
}

const hashThumb = 'thumb'

export function isThumb<V>(v: V) {
  return is$typed(v, id, hashThumb)
}

export function validateThumb<V>(v: V) {
  return validate<Thumb & V>(v, id, hashThumb)
}
