import {
  defs,
  isSignedOperationValid,
  normalizeOp,
  type CompatibleOperation,
  type Operation,
  type OperationOrTombstone,
} from '@atcute/did-plc';
import {
  DidResolver as BaseDidResolver,
  HandleResolver as BaseHandleResolver,
  getHandle,
  MemoryCache,
  type DidDocument,
} from '@atproto/identity';
import { cidForLex, type LexValue } from '@atproto/lex-cbor';
import { deepEqual } from 'fast-equals';

import * as config from '~/config';
import coalesce, { state as coalescerState } from './coalescer';
import {
  assertAtprotoDid,
  isAtprotoDid,
  type AtprotoDid,
  type AtprotoDidDocument,
} from '@atproto/did';

export interface PrefetchedPlc {
  op: CompatibleOperation;
  doc: DidDocument;
}

const DID_CONTEXT = [
  'https://www.w3.org/ns/did/v1',
  'https://w3id.org/security/multikey/v1',
];

const prefetchedDids = new Map<string, DidDocument | PrefetchedPlc>(
  [...config.prefetchedDids.entries()].map(([did, value]) => [
    did,
    did.startsWith('did:plc:')
      ? ({
          op: value as CompatibleOperation,
          doc: formatDidDoc(did, normalizeOp(value as CompatibleOperation)),
        } satisfies PrefetchedPlc)
      : (value as DidDocument),
  ]),
);

class DidResolver extends BaseDidResolver {
  override async resolveNoCheck(did: string): Promise<unknown> {
    if (prefetchedDids.has(did) && did.startsWith('did:plc:')) {
      const { op: prefetchedOp, doc: prefetchedDoc } = prefetchedDids.get(
        did,
      ) as PrefetchedPlc;

      const url = new URL(`/${did}/log`, config.plc);
      const ops = (await coalesce(
        coalescerState,
        url.href,
        async (signal, did, url): Promise<unknown> => {
          const res = await fetch(url, signal && { signal });

          if (!res.ok) {
            console.warn(
              `PLC server returned HTTP ${res.status} code for prefetched DID ${did}`,
            );
            // Treat all kinds of errors as `null`, assuming that the caller will fall back on the
            // prefetched document.
            return null;
          }

          return res.json();
        },
        [did, url],
      )) as Response;
      if (!ops) {
        return null;
      }

      if (!Array.isArray(ops)) {
        console.warn(
          `Invalid operation log for ${did}; expected array, got:`,
          ops,
        );
        return null;
      }

      // Ensure that the prefetched op is in the log.
      for (let i = ops.length - 1; i >= 0; i--) {
        if (deepEqual(ops[i], prefetchedOp)) {
          if (i === ops.length - 1) {
            // The prefetched op is fresh.
            return prefetchedDoc;
          }

          // Validate the operation log after the prefetched op.
          let prevOp: OperationOrTombstone = normalizeOp(prefetchedOp);
          let prev = (
            await cidForLex(prefetchedOp as unknown as LexValue)
          ).toString();
          for (i++; i < ops.length; i++) {
            // Legacy `create` op is impossible here since this is not the genesis op.
            const result = defs.operationOrTombstone.try(ops[i]);
            if (!result.ok) {
              console.warn(`Invalid op for ${did}:`, ops[i]);
              return null;
            }
            const op = result.value;

            if (op.prev !== prev) {
              console.warn(`Misordered op for ${did}`);
              return null;
            }

            if (op.type === 'plc_tombstone') {
              console.warn(
                `Prefetched DID ${did} is tombstoned on the PLC server`,
              );
              return null;
            }

            if (!(await isSignedOperationValid(prevOp.rotationKeys, op))) {
              console.warn(`Invalid signature on op for ${did}:`, op);
              return null;
            }

            prevOp = op;
            prev = (await cidForLex(op as unknown as LexValue)).toString();
          }

          const doc = formatDidDoc(did, prevOp);
          prefetchedDids.set(did, { op: prevOp, doc } satisfies PrefetchedPlc);

          return doc;
        }
      }

      console.warn(
        `Prefetched PLC op for ${did} is not found on the PLC server`,
      );
      return null;
    } else {
      return coalesce(
        coalescerState,
        did,
        (_, did) => super.resolveNoCheck(did),
        [did],
      );
    }
  }
}

export const didResolver = new DidResolver({
  plcUrl: config.plc,
  didCache: new MemoryCache(1 * 60 * 1000, 5 * 60 * 1000),
});

class HandleResolver extends BaseHandleResolver {
  override resolve(handle: string): Promise<string | undefined> {
    return coalesce(
      coalescerState,
      `at://${handle}`,
      (_signal, handle) => super.resolve(handle),
      [handle],
    );
  }
}

export const handleResolver = new HandleResolver();

interface ResolveIdentityOptions {
  signal?: AbortSignal;
  noCache?: boolean;
}

interface IdentityInfo {
  did: AtprotoDid;
  didDoc: AtprotoDidDocument;
  handle: string;
}

export const identityResolver = {
  async resolve(
    identifier: string,
    options?: ResolveIdentityOptions,
  ): Promise<IdentityInfo> {
    if (isAtprotoDid(identifier)) {
      const didDoc = await didResolver.resolve(identifier, options?.noCache);
      if (!didDoc) {
        throw new Error(`Unable to resolve DID: ${identifier}`);
      }

      const docHandle = getHandle(didDoc);
      const handle =
        docHandle && identifier === (await handleResolver.resolve(docHandle))
          ? docHandle
          : 'handle.invalid';

      return {
        did: identifier,
        // Let's hope this works.
        didDoc: didDoc as AtprotoDidDocument,
        handle,
      };
    } else {
      const did = await handleResolver.resolve(identifier);
      assertAtprotoDid(did);

      const didDoc = await didResolver.resolve(did, options?.noCache);
      if (!didDoc) {
        throw new Error(`Unable to resolve DID: ${did} (@${identifier})`);
      }

      return {
        did,
        didDoc: didDoc as AtprotoDidDocument,
        handle:
          getHandle(didDoc) === identifier ? identifier : 'handle.invalid',
      };
    }
  },
};

export function getPrefetchedDid(did: string): DidDocument | null {
  if (!prefetchedDids.has(did)) {
    return null;
  }

  const prefetched = prefetchedDids.get(did);
  if (did.startsWith('did:plc:')) {
    return (prefetched as PrefetchedPlc).doc;
  } else {
    return prefetched as DidDocument;
  }
}

// Re-implementing `formatDidDoc` from `@did-plc/lib` for browser compatibility.
function formatDidDoc(id: string, op: Operation): DidDocument {
  const verificationMethod = [];
  for (const [keyId, didKey] of Object.entries(op.verificationMethods)) {
    verificationMethod.push({
      id: `${id}#${keyId}`,
      type: 'Multikey',
      controller: id,
      publicKeyMultibase: didKey.slice('did:key:'.length),
    });
  }

  const service = [];
  for (const [serviceId, svc] of Object.entries(op.services)) {
    service.push({
      id: `#${serviceId}`,
      type: svc.type,
      serviceEndpoint: svc.endpoint,
    });
  }

  return {
    '@context': DID_CONTEXT,
    id,
    alsoKnownAs: op.alsoKnownAs,
    verificationMethod,
    service,
  };
}
