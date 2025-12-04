import type { ResolveFunction } from '../../index.js';

type MatcherFunction = (url: URL) => boolean;

const match_hosts = Object.create(null) as Record<string, ResolveFunction>;

const matchers: [MatcherFunction, ResolveFunction][] = [];

export function registerHosts(
  hosts: Iterable<string>,
  resolve: ResolveFunction,
): void {
  for (const host of hosts) {
    match_hosts[host] = resolve;
  }
}

export function registerMatcherFunc(
  matcher: MatcherFunction,
  resolve: ResolveFunction,
): void {
  matchers.push([matcher, resolve]);
}

export function lookup(url: URL): ResolveFunction | undefined {
  const hostMatch = match_hosts[url.host];
  if (hostMatch) {
    return hostMatch;
  }

  for (const [matcher, resolve] of matchers) {
    if (matcher(url)) {
      return resolve;
    }
  }
}
