// Lmk how to replace this with `import` without breaking the `declare`s nor `verbatimModuleSyntax`.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./types.d.ts" />

import type { Metadata } from './metadata.js';

export { USER_AGENT } from './consts/index.js';
export type { ResolveError, ResolveErrorOptions } from './error.js';
export type * from './metadata.js';

export interface ResolveResult<T extends Metadata = Metadata> {
  /**
   * The resolved metadata.
   */
  value: T | undefined;
  /**
   * Metadata about associated HTTP response, if any.
   */
  response?:
    | {
        status: number;
        headers: Headers;
      }
    | undefined;
}

/**
 * An async function that resolves `Metadata` from a given URL.
 *
 * @throws {ResolveError} when encountering a recoverable error. In case of a non-transient error
 * like HTTP 404, the resolver should try to extract as much metadata as possible anyway since
 * saying just "<title>Not Found</title>" is better than nothing. If the user doesn't like that,
 * they should consult the `ResolveResult.response.status` value.
 */
export type ResolveFunction<
  T extends Metadata = Metadata,
  Options extends ResolveOptions = ResolveOptions,
> = (
  url: string | URL,
  options?: Readonly<Options>,
) => ResolveResult<T> | PromiseLike<ResolveResult<T>>;

export interface ResolveOptions {
  fetch?:
    | ((url: string | URL, init?: RequestInit) => Promise<Response>)
    | undefined;
  preferDiscovered?: ('at-uri' | 'activity-streams')[] | undefined;
  headers?: HeadersInit | undefined;
  overrideHeaders?: HeadersInit | undefined;
}

export * as resolvers from './resolvers/index.js';

export { resolve } from './resolvers/generic/resolve.js';
