import type { ContextDefinition } from 'jsonld';

import activityStreams_ from './activitystreams.json' with { type: 'json' };
import identity from './identity-v1.json' with { type: 'json' };
import schemaOrg from './schemaorgcontext.json' with { type: 'json' };
import sec from './security-v1.json' with { type: 'json' };

export { default as miscellany } from './miscellany.json' with { type: 'json' };

// TODO: Remove the unsafe casting when JSON modules becomes importable as `const`:
// https://github.com/microsoft/TypeScript/issues/32063
export const activityStreams = activityStreams_ as {
  '@context': ContextDefinition;
};

export const PRELOADED: Record<string, { '@context': ContextDefinition }> = {
  'https://www.w3.org/ns/activitystreams': activityStreams,
  'http://www.w3.org/ns/activitystreams': activityStreams,
  'https://w3id.org/security/v1': sec,
  'http://w3id.org/security/v1': sec,
  // Although Schema.org contexts updates frequently, it's fine to use a fixed context because we
  // are only interested in processing terms that we know.
  'https://schema.org/': schemaOrg,
  'http://schema.org/': schemaOrg,
  'https://schema.org': schemaOrg,
  'http://schema.org': schemaOrg,
  'https://w3id.org/identity/v1': identity,
  'http://w3id.org/identity/v1': identity,
};
