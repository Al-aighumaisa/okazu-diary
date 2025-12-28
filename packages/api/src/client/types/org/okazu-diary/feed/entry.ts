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
import type * as OrgOkazuDiaryMaterialDefs from '../material/defs.js'
import type * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'org.okazu-diary.feed.entry'

export interface Main {
  $type: 'org.okazu-diary.feed.entry'
  /** User-defined date and time associated with the activity, typically the datetime of the climax of the activity or simply of the record creation. The string format must satisfy all the requirements of the `datetime` format from the Lexicon language, except the requirement of whole seconds precision, but the datetime must at least specify up to the day (e.g. valid: `4545-07-21Z`, `1919-04-05T04:05+09:00`, invalid: `1919Z`). This is a subset of ISO 8601-1:2019 datetime format, but not RFC 3339 (whose time format requires whole seconds precision). */
  datetime: string
  /** References to `org.okazu-diary.material.external` records associated with the activity. Leave the array empty if it is known that there is no applicable material. Omit the property if the materials are uncertain. Although this property uses a `strongRef` to make a reference to an external repository reliable to some extent, it is recommended that you copy the record to your own repository if you want to reference a record from another repository. */
  subjects?: ComAtprotoRepoStrongRef.Main[]
  /** User-specified tags for the activity. */
  tags?: OrgOkazuDiaryMaterialDefs.Tag[]
  /** Remarks on the activity. */
  note?: string
  labels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string }
  /** If `true`, indicates that there may have been unrecorded activities since the last entry, so that the data in the meantime are not reliable for statistical purposes. */
  hadHiatus: boolean
  /** Indicates the intended audience of the entry. A `public` entry (default) is fully public. An `unlisted` entry should not be listed in public profile feeds. */
  visibility: 'public' | 'unlisted' | (string & {})
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
