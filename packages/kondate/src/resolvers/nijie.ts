import type { ResolveOptions, ResolveResult } from '../index.js';
import { isTemporaryHTTPError, ResolveError } from '../error.js';
import * as util from '../util.js';
import { extensions, html, schemaOrg } from './generic/index.js';

const hosts = ['nijie.info', 'sp.nijie.info', 'www.nijie.info'];

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (!hosts.includes(url.host)) {
    return { value: undefined, response: undefined };
  }

  let id;
  switch (url.pathname) {
    case '/view_popup.php':
      if (!url.hash) {
        url.pathname = '/view.php';
      }
    // Fall through
    case '/view.php':
      id = url.searchParams.get('id');
  }

  let reqUrl;
  if (id) {
    url.search = `?id=${id}`;
    // `view_popup.php` redirects to `/login.php` (after an age gate), so fetch `view.php` instead.
    reqUrl = `https://nijie.info/view.php?id=${id}`;
  } else {
    url.host = 'nijie.info';
    reqUrl = url;
  }

  const res = await util.fetch(options, reqUrl, {
    headers: {
      'accept-language': 'ja-JP, ja',
    },
  });

  if (isTemporaryHTTPError(res.status)) {
    throw new ResolveError(undefined, { response: res });
  }

  let { value, document } = await html.extract(res, options);

  if (res.ok && id) {
    // The Schema.org metadata of the artwork is under `<body>`, which the `html` extractor doesn't
    // look for.
    const script = document.querySelector(
      'body > script[type="application/ld+json"]',
    );
    if (script) {
      const json = util.robustParseJSON(script.innerHTML);
      if (json) {
        const schemaOrgMeta = await schemaOrg.extractMaybeSchemaOrg(json);
        if (schemaOrgMeta) {
          value = schemaOrgMeta;
        }
      }
    }

    value.identifier = id;
    value.keywords = [];
    for (const a of document.querySelectorAll(
      '#view-tag .tag_name > a:nth-child(1)',
    )) {
      value.keywords.push({ name: { textValue: a.textContent } });
    }
    value.labels = [{ val: 'sexual' }];
  }

  return {
    value,
    response: { status: res.status, headers: res.headers },
  };
}

extensions.registerHosts(hosts, resolve);
