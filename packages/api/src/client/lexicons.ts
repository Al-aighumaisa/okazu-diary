/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from '@atproto/lexicon'
import { type $Typed, is$typed, maybe$typed } from './util.js'

export const schemaDict = {
  ComAtprotoLabelDefs: {
    lexicon: 1,
    id: 'com.atproto.label.defs',
    defs: {
      label: {
        type: 'object',
        description:
          'Metadata tag on an atproto resource (eg, repo or record).',
        required: ['src', 'uri', 'val', 'cts'],
        properties: {
          ver: {
            type: 'integer',
            description: 'The AT Protocol version of the label object.',
          },
          src: {
            type: 'string',
            format: 'did',
            description: 'DID of the actor who created this label.',
          },
          uri: {
            type: 'string',
            format: 'uri',
            description:
              'AT URI of the record, repository (account), or other resource that this label applies to.',
          },
          cid: {
            type: 'string',
            format: 'cid',
            description:
              "Optionally, CID specifying the specific version of 'uri' resource this label applies to.",
          },
          val: {
            type: 'string',
            maxLength: 128,
            description:
              'The short string name of the value or type of this label.',
          },
          neg: {
            type: 'boolean',
            description:
              'If true, this is a negation label, overwriting a previous label.',
          },
          cts: {
            type: 'string',
            format: 'datetime',
            description: 'Timestamp when this label was created.',
          },
          exp: {
            type: 'string',
            format: 'datetime',
            description:
              'Timestamp at which this label expires (no longer applies).',
          },
          sig: {
            type: 'bytes',
            description: 'Signature of dag-cbor encoded label.',
          },
        },
      },
      selfLabels: {
        type: 'object',
        description:
          'Metadata tags on an atproto record, published by the author within the record.',
        required: ['values'],
        properties: {
          values: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:com.atproto.label.defs#selfLabel',
            },
            maxLength: 10,
          },
        },
      },
      selfLabel: {
        type: 'object',
        description:
          'Metadata tag on an atproto record, published by the author within the record. Note that schemas should use #selfLabels, not #selfLabel.',
        required: ['val'],
        properties: {
          val: {
            type: 'string',
            maxLength: 128,
            description:
              'The short string name of the value or type of this label.',
          },
        },
      },
      labelValueDefinition: {
        type: 'object',
        description:
          'Declares a label value and its expected interpretations and behaviors.',
        required: ['identifier', 'severity', 'blurs', 'locales'],
        properties: {
          identifier: {
            type: 'string',
            description:
              "The value of the label being defined. Must only include lowercase ascii and the '-' character ([a-z-]+).",
            maxLength: 100,
            maxGraphemes: 100,
          },
          severity: {
            type: 'string',
            description:
              "How should a client visually convey this label? 'inform' means neutral and informational; 'alert' means negative and warning; 'none' means show nothing.",
            knownValues: ['inform', 'alert', 'none'],
          },
          blurs: {
            type: 'string',
            description:
              "What should this label hide in the UI, if applied? 'content' hides all of the target; 'media' hides the images/video/audio; 'none' hides nothing.",
            knownValues: ['content', 'media', 'none'],
          },
          defaultSetting: {
            type: 'string',
            description: 'The default setting for this label.',
            knownValues: ['ignore', 'warn', 'hide'],
            default: 'warn',
          },
          adultOnly: {
            type: 'boolean',
            description:
              'Does the user need to have adult content enabled in order to configure this label?',
          },
          locales: {
            type: 'array',
            items: {
              type: 'ref',
              ref: 'lex:com.atproto.label.defs#labelValueDefinitionStrings',
            },
          },
        },
      },
      labelValueDefinitionStrings: {
        type: 'object',
        description:
          'Strings which describe the label in the UI, localized into a specific language.',
        required: ['lang', 'name', 'description'],
        properties: {
          lang: {
            type: 'string',
            description:
              'The code of the language these strings are written in.',
            format: 'language',
          },
          name: {
            type: 'string',
            description: 'A short human-readable name for the label.',
            maxGraphemes: 64,
            maxLength: 640,
          },
          description: {
            type: 'string',
            description:
              'A longer description of what the label means and why it might be applied.',
            maxGraphemes: 10000,
            maxLength: 100000,
          },
        },
      },
      labelValue: {
        type: 'string',
        knownValues: [
          '!hide',
          '!no-promote',
          '!warn',
          '!no-unauthenticated',
          'dmca-violation',
          'doxxing',
          'porn',
          'sexual',
          'nudity',
          'nsfl',
          'gore',
        ],
      },
    },
  },
  ComAtprotoRepoCreateRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.createRecord',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Create a single new repository record. Requires auth, implemented by PDS.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'collection', 'record'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              collection: {
                type: 'string',
                format: 'nsid',
                description: 'The NSID of the record collection.',
              },
              rkey: {
                type: 'string',
                format: 'record-key',
                description: 'The Record Key.',
                maxLength: 512,
              },
              validate: {
                type: 'boolean',
                description:
                  "Can be set to 'false' to skip Lexicon schema validation of record data, 'true' to require it, or leave unset to validate only for known Lexicons.",
              },
              record: {
                type: 'unknown',
                description: 'The record itself. Must contain a $type field.',
              },
              swapCommit: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous commit by CID.',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
              validationStatus: {
                type: 'string',
                knownValues: ['valid', 'unknown'],
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
            description:
              "Indicates that 'swapCommit' didn't match current repo commit.",
          },
        ],
      },
    },
  },
  ComAtprotoRepoDefs: {
    lexicon: 1,
    id: 'com.atproto.repo.defs',
    defs: {
      commitMeta: {
        type: 'object',
        required: ['cid', 'rev'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          rev: {
            type: 'string',
            format: 'tid',
          },
        },
      },
    },
  },
  ComAtprotoRepoDeleteRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.deleteRecord',
    defs: {
      main: {
        type: 'procedure',
        description:
          "Delete a repository record, or ensure it doesn't exist. Requires auth, implemented by PDS.",
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'collection', 'rkey'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              collection: {
                type: 'string',
                format: 'nsid',
                description: 'The NSID of the record collection.',
              },
              rkey: {
                type: 'string',
                format: 'record-key',
                description: 'The Record Key.',
              },
              swapRecord: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous record by CID.',
              },
              swapCommit: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous commit by CID.',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            properties: {
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
          },
        ],
      },
    },
  },
  ComAtprotoRepoGetRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.getRecord',
    defs: {
      main: {
        type: 'query',
        description:
          'Get a single record from a repository. Does not require auth.',
        parameters: {
          type: 'params',
          required: ['repo', 'collection', 'rkey'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
              description: 'The handle or DID of the repo.',
            },
            collection: {
              type: 'string',
              format: 'nsid',
              description: 'The NSID of the record collection.',
            },
            rkey: {
              type: 'string',
              description: 'The Record Key.',
              format: 'record-key',
            },
            cid: {
              type: 'string',
              format: 'cid',
              description:
                'The CID of the version of the record. If not specified, then return the most recent version.',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'value'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              value: {
                type: 'unknown',
              },
            },
          },
        },
        errors: [
          {
            name: 'RecordNotFound',
          },
        ],
      },
    },
  },
  ComAtprotoRepoListRecords: {
    lexicon: 1,
    id: 'com.atproto.repo.listRecords',
    defs: {
      main: {
        type: 'query',
        description:
          'List a range of records in a repository, matching a specific collection. Does not require auth.',
        parameters: {
          type: 'params',
          required: ['repo', 'collection'],
          properties: {
            repo: {
              type: 'string',
              format: 'at-identifier',
              description: 'The handle or DID of the repo.',
            },
            collection: {
              type: 'string',
              format: 'nsid',
              description: 'The NSID of the record type.',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 50,
              description: 'The number of records to return.',
            },
            cursor: {
              type: 'string',
            },
            reverse: {
              type: 'boolean',
              description: 'Flag to reverse the order of the returned records.',
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['records'],
            properties: {
              cursor: {
                type: 'string',
              },
              records: {
                type: 'array',
                items: {
                  type: 'ref',
                  ref: 'lex:com.atproto.repo.listRecords#record',
                },
              },
            },
          },
        },
      },
      record: {
        type: 'object',
        required: ['uri', 'cid', 'value'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
          value: {
            type: 'unknown',
          },
        },
      },
    },
  },
  ComAtprotoRepoPutRecord: {
    lexicon: 1,
    id: 'com.atproto.repo.putRecord',
    defs: {
      main: {
        type: 'procedure',
        description:
          'Write a repository record, creating or updating it as needed. Requires auth, implemented by PDS.',
        input: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['repo', 'collection', 'rkey', 'record'],
            nullable: ['swapRecord'],
            properties: {
              repo: {
                type: 'string',
                format: 'at-identifier',
                description:
                  'The handle or DID of the repo (aka, current account).',
              },
              collection: {
                type: 'string',
                format: 'nsid',
                description: 'The NSID of the record collection.',
              },
              rkey: {
                type: 'string',
                format: 'record-key',
                description: 'The Record Key.',
                maxLength: 512,
              },
              validate: {
                type: 'boolean',
                description:
                  "Can be set to 'false' to skip Lexicon schema validation of record data, 'true' to require it, or leave unset to validate only for known Lexicons.",
              },
              record: {
                type: 'unknown',
                description: 'The record to write.',
              },
              swapRecord: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous record by CID. WARNING: nullable and optional field; may cause problems with golang implementation',
              },
              swapCommit: {
                type: 'string',
                format: 'cid',
                description:
                  'Compare and swap with the previous commit by CID.',
              },
            },
          },
        },
        output: {
          encoding: 'application/json',
          schema: {
            type: 'object',
            required: ['uri', 'cid'],
            properties: {
              uri: {
                type: 'string',
                format: 'at-uri',
              },
              cid: {
                type: 'string',
                format: 'cid',
              },
              commit: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.defs#commitMeta',
              },
              validationStatus: {
                type: 'string',
                knownValues: ['valid', 'unknown'],
              },
            },
          },
        },
        errors: [
          {
            name: 'InvalidSwap',
          },
        ],
      },
    },
  },
  ComAtprotoRepoStrongRef: {
    lexicon: 1,
    id: 'com.atproto.repo.strongRef',
    description: 'A URI with a content-hash fingerprint.',
    defs: {
      main: {
        type: 'object',
        required: ['uri', 'cid'],
        properties: {
          uri: {
            type: 'string',
            format: 'at-uri',
          },
          cid: {
            type: 'string',
            format: 'cid',
          },
        },
      },
    },
  },
  OrgOkazuDiaryActorProfile: {
    lexicon: 1,
    id: 'org.okazu-diary.actor.profile',
    defs: {
      main: {
        type: 'record',
        description:
          'A declaration of an Okazu-Diary.org profile. If the repository has an `app.bsky.actor.profile` record, the application can substitute omitted properties of this record with the counterpart properties from that record, except for the `createdAt` and `labels` properties.',
        key: 'literal:self',
        record: {
          type: 'object',
          properties: {
            displayName: {
              type: 'string',
              maxGraphemes: 64,
              maxLength: 640,
            },
            description: {
              type: 'string',
              description: 'Free-form profile description text.',
              maxGraphemes: 256,
              maxLength: 2560,
            },
            website: {
              type: 'string',
              format: 'uri',
            },
            avatar: {
              type: 'blob',
              description:
                "Small image to be displayed on the profile. AKA, 'profile picture'.",
              accept: ['image/png', 'image/jpeg'],
              maxSize: 1000000,
            },
            labels: {
              type: 'union',
              description:
                'Self-label values, specific to the Okazu-Diary.org application, on the overall account.',
              refs: ['lex:com.atproto.label.defs#selfLabels'],
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  OrgOkazuDiaryFeedEntry: {
    lexicon: 1,
    id: 'org.okazu-diary.feed.entry',
    defs: {
      main: {
        type: 'record',
        description: 'A diary entry to record a self-gratification activity.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['datetime'],
          properties: {
            datetime: {
              type: 'string',
              description:
                'User-defined date and time associated with the activity, typically the datetime of the climax of the activity or simply of the record creation. The string format must satisfy all the requirements of the `datetime` format from the Lexicon language, except the requirement of whole seconds precision, but the datetime must at least specify up to the day (e.g. valid: `4545-07-21Z`, `1919-04-05T04:05+09:00`, invalid: `1919Z`). This is a subset of ISO 8601-1:2019 datetime format, but not RFC 3339 (whose time format requires whole seconds precision).',
            },
            subjects: {
              type: 'array',
              description:
                'References to `org.okazu-diary.material.external` records associated with the activity. Leave the array empty if it is known that there is no applicable material. Omit the property if the materials are uncertain. Although this property uses a `strongRef` to make a reference to an external repository reliable to some extent, it is recommended that you copy the record to your own repository if you want to reference a record from another repository.',
              maxLength: 16,
              items: {
                type: 'ref',
                ref: 'lex:com.atproto.repo.strongRef',
              },
            },
            tags: {
              type: 'array',
              description: 'User-specified tags for the activity.',
              maxLength: 64,
              items: {
                type: 'ref',
                ref: 'lex:org.okazu-diary.material.defs#tag',
              },
            },
            note: {
              type: 'string',
              description: 'Remarks on the activity.',
              maxLength: 5000,
              maxGraphemes: 500,
            },
            labels: {
              type: 'union',
              description:
                'Self-label values for this post. Effectively content warnings for the note and tags.',
              refs: ['lex:com.atproto.label.defs#selfLabels'],
            },
            hadHiatus: {
              type: 'boolean',
              default: false,
              description:
                'If `true`, indicates that there may have been unrecorded activities since the last entry, so that the data in the meantime are not reliable for statistical purposes.',
            },
            visibility: {
              type: 'string',
              default: 'public',
              description:
                'Indicates the intended audience of the entry. A `public` entry (default) is fully public. An `unlisted` entry should not be listed in public profile feeds.',
              knownValues: ['public', 'unlisted'],
            },
            via: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
              description:
                'Reference to another `org.okazu-diary.feed.entry` record or an `org.okazu-diary.material.collectionItem` record from this entry is derived.',
            },
          },
        },
      },
    },
  },
  OrgOkazuDiaryFeedLike: {
    lexicon: 1,
    id: 'org.okazu-diary.feed.like',
    defs: {
      main: {
        type: 'record',
        description:
          "Record declaring a 'like' of a piece of subject activity.",
        key: 'tid',
        record: {
          type: 'object',
          required: ['subject', 'createdAt'],
          properties: {
            subject: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
            via: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
            },
          },
        },
      },
    },
  },
  OrgOkazuDiaryMaterialCollection: {
    lexicon: 1,
    id: 'org.okazu-diary.material.collection',
    defs: {
      main: {
        type: 'record',
        description:
          'Record representing a user-curated colleciton of materials.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['createdAt'],
          properties: {
            name: {
              type: 'string',
              maxLength: 64,
              minLength: 1,
              description: 'Display name for the collection.',
            },
            description: {
              type: 'string',
              maxGraphemes: 300,
              maxLength: 3000,
            },
            labels: {
              type: 'union',
              description:
                'General-purpose self-label values primarily for consumption by generic AT clients. See the `labels` property of `org.okazu-diary.feed.entry` for details.',
              refs: ['lex:com.atproto.label.defs#selfLabels'],
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  OrgOkazuDiaryMaterialCollectionItem: {
    lexicon: 1,
    id: 'org.okazu-diary.material.collectionItem',
    defs: {
      main: {
        type: 'record',
        description:
          'Record declaring the inclusion of a single material or a set of materials in a specific collection.',
        key: 'tid',
        record: {
          type: 'object',
          required: ['collection', 'subjects', 'createdAt'],
          properties: {
            collection: {
              type: 'string',
              format: 'at-uri',
              description:
                'Reference to the collection record (`org.okazu-diary.feed.collection`).',
            },
            subjects: {
              type: 'array',
              description:
                'Reference(s) to a material or set of materials (`org.okazu-diary.material.external`) to be included in the collection.',
              minLength: 1,
              maxLength: 16,
              items: {
                type: 'string',
                format: 'at-uri',
              },
            },
            note: {
              type: 'string',
              description: 'Remarks on the collection item.',
              maxLength: 5000,
              maxGraphemes: 500,
            },
            via: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
              description:
                'Reference to an `org.okazu-diary.feed.entry` record or an `org.okazu-diary.material.collectionItem` of another collection from which this collection item is derived.',
            },
            createdAt: {
              type: 'string',
              format: 'datetime',
            },
          },
        },
      },
    },
  },
  OrgOkazuDiaryMaterialDefs: {
    lexicon: 1,
    id: 'org.okazu-diary.material.defs',
    defs: {
      tag: {
        type: 'object',
        required: ['value'],
        properties: {
          value: {
            type: 'string',
            minLength: 1,
            maxLength: 256,
          },
        },
      },
    },
  },
  OrgOkazuDiaryMaterialExternal: {
    lexicon: 1,
    id: 'org.okazu-diary.material.external',
    defs: {
      main: {
        type: 'record',
        description: 'A descriptor of a pornographic material.',
        key: 'tid',
        record: {
          type: 'object',
          properties: {
            uri: {
              type: 'string',
              format: 'uri',
              description:
                'URI of the material, typically an HTTP(S) URL. If the URL is of a Web interface for an AT resource (such as a `bsky.app` URL), the record should also include the `record` property referencing the AT resource.',
            },
            record: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
              description:
                'Reference to a record representing the material, such as a Bluesky post.',
            },
            title: {
              type: 'string',
              description:
                "Title of the material, typically taken from the material's HTML `<title>` element.",
            },
            description: {
              type: 'string',
              description:
                "Description of the material, typically taken from the material's HTML metadata.",
            },
            thumb: {
              type: 'ref',
              ref: 'lex:org.okazu-diary.material.external#thumb',
              description:
                "Link to a thumbnail of the material, typically taken from the material's HTML metadata.",
            },
            tags: {
              type: 'array',
              description: 'User-specified tags for the material.',
              maxLength: 64,
              items: {
                type: 'ref',
                ref: 'lex:org.okazu-diary.material.defs#tag',
              },
            },
            labels: {
              type: 'union',
              description:
                'User-specified self-label values for the material. While the Lexicon by its nature assumes the material to be possibly sensitive by default, these label values are intended to signal that a warning should be put on the material even for the explicit Okazu-Diary.org application users who are willing to see mature contents in general.',
              refs: ['lex:com.atproto.label.defs#selfLabels'],
            },
            genericLabels: {
              type: 'union',
              description:
                'General-purpose self-label values primarily for consumption by generic AT clients who may not expect the sensitive nature of this Lexicon. Publishers of this record are strongly recommended to always include at least one of the protocol-global label values; namely, `porn`, `sexual`, `graphic-media`, and `nudity`, unless the material and tags are all known to be safe by themselves. It is the safest to unconditionally include the `sexual` value, which has the `adultOnly` semantics, but it is acceptable to use a stronger (`porn`/`graphic-media`) or more moderate (`nudity`) value instead if the user decides so.',
              refs: ['lex:com.atproto.label.defs#selfLabels'],
            },
            via: {
              type: 'ref',
              ref: 'lex:com.atproto.repo.strongRef',
              description:
                'Reference to an `org.okazu-diary.feed.material` record from another repository from which this collection item is derived. Clients can use this property to offer the user to update this record if the original record have updated from the referenced version.',
            },
          },
        },
      },
      thumb: {
        type: 'object',
        required: ['url'],
        properties: {
          cid: {
            type: 'string',
            format: 'cid',
          },
          url: {
            type: 'string',
            format: 'uri',
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[]
export const lexicons: Lexicons = new Lexicons(schemas)

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === 'main' ? id : `${id}#${hash}`}" $type property`,
        ),
      }
}

export const ids = {
  ComAtprotoLabelDefs: 'com.atproto.label.defs',
  ComAtprotoRepoCreateRecord: 'com.atproto.repo.createRecord',
  ComAtprotoRepoDefs: 'com.atproto.repo.defs',
  ComAtprotoRepoDeleteRecord: 'com.atproto.repo.deleteRecord',
  ComAtprotoRepoGetRecord: 'com.atproto.repo.getRecord',
  ComAtprotoRepoListRecords: 'com.atproto.repo.listRecords',
  ComAtprotoRepoPutRecord: 'com.atproto.repo.putRecord',
  ComAtprotoRepoStrongRef: 'com.atproto.repo.strongRef',
  OrgOkazuDiaryActorProfile: 'org.okazu-diary.actor.profile',
  OrgOkazuDiaryFeedEntry: 'org.okazu-diary.feed.entry',
  OrgOkazuDiaryFeedLike: 'org.okazu-diary.feed.like',
  OrgOkazuDiaryMaterialCollection: 'org.okazu-diary.material.collection',
  OrgOkazuDiaryMaterialCollectionItem:
    'org.okazu-diary.material.collectionItem',
  OrgOkazuDiaryMaterialDefs: 'org.okazu-diary.material.defs',
  OrgOkazuDiaryMaterialExternal: 'org.okazu-diary.material.external',
} as const
