declare module 'jsonld' {
  function compact(
    input: jsonld.JsonLdDocument,
    ctx:
      | jsonld.ContextDefinition
      | string
      | (jsonld.ContextDefinition | string)[],
    options: jsonld.Options.Compact,
  ): Promise<jsonld.NodeObject>;

  const documentLoader: (
    url: string,
    callback?: (err: Error, remoteDoc: RemoteDocument) => void,
  ) => Promise<RemoteDocument>;
}

import jsonld from 'jsonld';

import { contexts } from './index.js';
import { isTemporaryHTTPError } from '../../../error.js';

export * as contexts from './contexts/index.js';

interface RemoteDocument {
  contextUrl?: string | undefined;
  documentUrl: string;
  document: jsonld.NodeObject | jsonld.NodeObject[];
}

type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

type ExcludeArray<T> = T extends readonly any[] ? never : T;

export function firstOfSet<T>(set: T): ArrayElement<T> | ExcludeArray<T>;
export function firstOfSet<T>(set: T | T[]): T {
  return Array.isArray(set) ? set[0] : set;
}

// The returned value is actually more like
// `(T extends any[] ? T : never) | (T extends any[] ? never : T[])`, but the latter would make
// `Array#includes()` hard to use, because the argument of `(X[] | Y[] | ...).includes()` is
// `X & Y & ...` so `setAsArray(NodeObject).includes(x)` would require
// `x: ContextDefinition & string & ...`, which is virtually `never`.
export function setAsArray<T>(
  set: T,
): (ArrayElement<T> | NonNullable<ExcludeArray<T>>)[];
export function setAsArray<T>(value: T | T[]): T[] {
  if (value === undefined || value === null) {
    return [];
  } else if (Array.isArray(value)) {
    return value;
  } else {
    return [value];
  }
}

export interface MaybeLangString {
  value: string;
  language: string | undefined;
}

export function firstOfLanguageMap(
  value: jsonld.NodeObject[string],
): MaybeLangString | undefined {
  value = firstOfSet(value);

  switch (typeof value) {
    case 'string':
      return { language: undefined, value };
    case 'object':
      if (value) {
        break;
      }
    // Fall through
    default:
      return;
  }

  const entries: [string, unknown][] = Object.entries(value);

  for (const [lang, values] of entries) {
    const value = firstOfSet(values);
    if (typeof value === 'string') {
      return { language: lang === '@none' ? undefined : lang, value };
    }
  }
}

/**
 * Determines (or makes a best guess) whether an `@id` term value is a `jsonld.NodeObject`.
 */
export function isNodeObject(
  value: jsonld.NodeObject[string],
): value is jsonld.NodeObject {
  return (
    typeof value === 'object' &&
    !!value &&
    !(
      Array.isArray(value) ||
      '@set' in value ||
      '@list' in value ||
      '@value' in value
    )
  );
}

export function makeDocumentLoader(): (url: string) => Promise<RemoteDocument> {
  return async function documentLoader(url: string): Promise<RemoteDocument> {
    const preloaded = contexts.PRELOADED[url];
    if (preloaded) {
      return {
        documentUrl: url,
        document: preloaded,
        contextUrl: undefined,
      };
    }

    // XXX: Ideally we'd let `ResolveOptions.fetch` to pass through, but it's not trivial to inject
    // the Fetch interface into `jsonld`'s default document loader which only accepts XHR i/f.
    return jsonld.documentLoader(url);
  };
}

export function isTemporaryJsonLdError(error: unknown): boolean {
  if (error instanceof Error && error.name === 'jsonld.InvalidUrl') {
    // `jsonld` library doesn't expose the `JsonLdError` class so we need to duck test.
    let outerDetails, cause, details;
    if (
      'details' in error &&
      typeof (outerDetails = error.details) === 'object' &&
      outerDetails &&
      'cause' in outerDetails &&
      (cause = outerDetails.cause) instanceof Error &&
      cause.name === 'jsonld.LoadDocumentError' &&
      'details' in cause &&
      typeof (details = cause.details) === 'object' &&
      details
    ) {
      let code;
      if (
        'httpStatusCode' in details &&
        typeof (code = details.httpStatusCode) === 'number'
      ) {
        return isTemporaryHTTPError(code);
      } else if ('cause' in details && details.cause) {
        // Maybe network error.
        return true;
      }
    }
  }

  return false;
}
