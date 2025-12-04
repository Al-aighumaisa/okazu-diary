import type { ResolveOptions, ResolveResult } from '../index.js';
import * as util from '../util.js';
import { extensions, html } from './generic/index.js';

const host = 'novel18.syosetu.com';

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (url.host !== host) {
    return { value: undefined, response: undefined };
  }

  url.protocol = 'https';

  const res = await util.fetch(options, url, {
    headers: {
      'accept-language': 'ja-JP, ja',
      cookie: 'over18=yes',
    },
  });
  const response = { status: res.status, headers: res.headers };

  // TODO: The OGP and meta descriptions are terrible. Needs a custom extractor.
  return {
    value: (await html.extract(res, options)).value,
    response,
  };
}

extensions.registerHosts([host], resolve);
