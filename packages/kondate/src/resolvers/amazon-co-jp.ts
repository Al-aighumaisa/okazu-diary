import { CookieJar } from 'tough-cookie';

import type { ResolveOptions, ResolveResult } from '../index.js';
import { isTemporaryHTTPError, ResolveError } from '../error.js';
import * as util from '../util.js';
import { html, http } from './generic/index.js';
import { registerHosts } from './generic/extensions.js';

const hosts = ['amazon.co.jp', 'www.amazon.co.jp'];

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (!hosts.includes(url.host)) {
    return { value: undefined, response: undefined };
  }

  url.protocol = 'https';
  url.host = 'www.amazon.co.jp';

  let match;
  if (
    !(match = /^\/+(?:-\/[^/]+\/)*(?:[^/]+\/)?dp\/([^/]+)/.exec(url.pathname))
  ) {
    return http.resolve(url, options);
  }

  const asin = match[1];
  const canonical = `https://www.amazon.co.jp/dp/${asin}`;

  let res = await util.fetch(options, canonical, {
    headers: {
      'accept-language': 'ja-JP, ja',
    },
    redirect: 'manual',
  });

  let location, labels;
  if (
    300 <= res.status &&
    res.status < 400 &&
    (location = res.headers.get('location'))
  ) {
    location = new URL(location, canonical);
    if (location.pathname.includes('/black-curtain/')) {
      labels = [{ val: 'sexual' }];

      // Get session cookie via age gate:
      const initSessionUrl = `https://www.amazon.co.jp/-/ja/black-curtain/save-eligibility/black-curtain?returnUrl=%2Fdp%2F${asin}`;
      const initSessionRes = await util.fetch(options, initSessionUrl, {
        headers: {
          'accept-language': 'ja-JP, ja',
        },
        redirect: 'manual',
      });

      if (isTemporaryHTTPError(initSessionRes.status)) {
        throw new ResolveError(undefined, { response: initSessionRes });
      }

      const cookieJar = new CookieJar();
      await Promise.all(
        initSessionRes.headers
          .getSetCookie()
          .map((cookie) => cookieJar.setCookie(cookie, initSessionUrl)),
      );
      const cookie = await cookieJar.getCookieString(url.href);

      res = await util.fetch(options, canonical, {
        headers: {
          'accept-language': 'ja-JP, ja',
          cookie,
        },
      });
    } else {
      res = await util.fetch(options, location, {
        headers: {
          'accept-language': 'ja-JP, ja',
        },
      });
    }
  }

  if (isTemporaryHTTPError(res.status)) {
    throw new ResolveError(undefined, { response: res });
  }

  const value = (await html.extract(res, options)).value ?? {};

  // Overwrite Amazon's `canonical` URL, which contains unnecessary slug.
  value.url = canonical;
  value.identifier = asin;
  value.labels ??= labels;

  return {
    value,
    response: { status: res.status, headers: res.headers },
  };
}

registerHosts(hosts, resolve);
