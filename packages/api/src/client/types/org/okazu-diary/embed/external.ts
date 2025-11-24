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
const id = 'org.okazu-diary.embed.external'

export interface Main {
  $type?: 'org.okazu-diary.embed.external'
  uri: string
  title?: string
  description?: string
  thumb?: Thumb
}

const hashMain = 'main'

export function isMain<V>(v: V) {
  return is$typed(v, id, hashMain)
}

export function validateMain<V>(v: V) {
  return validate<Main & V>(v, id, hashMain)
}

export interface Thumb {
  $type?: 'org.okazu-diary.embed.external#thumb'
  cid: string
  uri: string
}

const hashThumb = 'thumb'

export function isThumb<V>(v: V) {
  return is$typed(v, id, hashThumb)
}

export function validateThumb<V>(v: V) {
  return validate<Thumb & V>(v, id, hashThumb)
}
