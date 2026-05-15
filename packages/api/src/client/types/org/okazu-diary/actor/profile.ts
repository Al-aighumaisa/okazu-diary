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
import type * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs.js'

const is$typed = _is$typed,
  validate = _validate
const id = 'org.okazu-diary.actor.profile'

export interface Main {
  $type: 'org.okazu-diary.actor.profile'
  displayName?: string | null
  /** Free-form profile description text. */
  description?: string | null
  website?: string | null
  /** Small image to be displayed on the profile. AKA, 'profile picture'. Even though the Okazu-Diary.org applications are primarily intended for sharing sensitive materials, the profile picture must be safe for general audience. */
  avatar?: BlobRef | null
  labels?: $Typed<ComAtprotoLabelDefs.SelfLabels> | { $type: string } | null
  /** Indicates the user's primary human language, used in the profile and entries. */
  lang?: string
  /** List of references to profile records from external Lexicons to link from this profile, such as Bluesky profile. These links are intended to be displayed separately from the `website` link as "trusted" links, so the application should only display links to profiles that can be verified to be controlled by the same actor as the owner of this record. Typically, those are records that belong to the same repository as this record. */
  alsoKnownAs?: string[]
  createdAt?: string | null
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
