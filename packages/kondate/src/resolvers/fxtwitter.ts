import type { ResolveOptions, ResolveResult } from '../index.js';
import * as util from '../util.js';
import { extensions, html } from './generic/index.js';

const hosts = ['twitter.com', 'x.com'];

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (hosts.includes(url.host)) {
    return { value: undefined, response: undefined };
  }

  url.protocol = 'https';
  url.host = 'fxtwitter.com';
  url.search = '';

  const res = await util.fetch(options, url);

  return {
    value: (await html.extract(res, options)).value,
    response: { status: res.status, headers: res.headers },
  };
}

extensions.registerHosts(hosts, resolve);
