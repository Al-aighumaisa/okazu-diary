import type { Metadata, ResolveOptions, ResolveResult } from '../index.js';
import { isTemporaryHTTPError, ResolveError } from '../error.js';
import * as util from '../util.js';
import { extensions, html } from './generic/index.js';

const hosts = ['ec.toranoana.jp', 'ecs.toranoana.jp'];

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (!hosts.includes(url.host)) {
    return { value: undefined, response: undefined };
  }

  const match = /^\/+(tora|joshi)(?:_r)?\/+ec\/+item\/+([^/]+)\/*$/.exec(
    url.pathname,
  );

  let reqUrl;
  if (match) {
    // The adult-only floor ((tora|joshi)_r) page may represent an all-age item, so try to normalize
    // it as all-age URL first. It will redirect to adult-only floor if the item is age-restricted.
    reqUrl = `https://ecs.toranoana.jp/${match[1]}/ec/item/${match[2]}/`;
  } else {
    url.protocol = 'https';
    reqUrl = url;
  }

  const res = await util.fetch(options, reqUrl, {
    headers: {
      'accept-language': 'ja-JP, ja',
      cookie: 'adflg=0; language=0',
    },
  });

  if (isTemporaryHTTPError(res.status)) {
    throw new ResolveError(undefined, { response: res });
  }

  const response = { status: res.status, headers: res.headers };

  const { value, document } = await html.extract(res, options);

  // Special extraction logic for the item detail page.
  if (res.ok && match) {
    value.identifier = match[2];

    const image = [];
    for (const div of document.querySelectorAll<HTMLElement>(
      '#thumbs > .product-detail-image-thumb-item[data-src]',
    )) {
      image.push({ contentUrl: div.dataset.src! });
    }
    if (image.length) {
      value.image = image;
    }

    const title = document
      .querySelector('#main .product-detail-desc-title')
      ?.textContent.trim();
    if (title) {
      value.name = { textValue: title };
    }

    const creator: Metadata['creator'] = [];
    for (const div of document.querySelectorAll<HTMLElement>(
      '#main .sub-circle .sub-p',
    )) {
      const a = div.querySelector<HTMLAnchorElement>(':scope > a');
      creator.push({
        type: 'Organization',
        name: { textValue: (a ?? div).textContent.trim() },
        url: a ? a.href : undefined,
      });
    }
    for (const a of document.querySelectorAll<HTMLAnchorElement>(
      '#main .sub-name .sub-p > a',
    )) {
      creator.push({
        type: 'Person',
        name: { textValue: a.textContent.trim() },
        url: a.href,
      });
    }
    if (creator.length) {
      value.creator = creator;
    }

    const description = document
      .querySelector('#main .item-detail .page-headline ~ * p')
      ?.innerHTML.trim();
    if (description) {
      value.description = description;
    }

    const keywords = new Set<string>();

    for (const tr of document.querySelectorAll(
      '#main .product-detail-table tr',
    )) {
      const [k, v] = tr.querySelectorAll<HTMLTableCellElement>(':scope > td');
      if (!k || !v) {
        continue;
      }

      switch (k.textContent.trim()) {
        // case 'サークル名':
        // case '出版社':
        //   // Same as `.sub-circle`
        // case '作家':
        // case '著者':
        //   // Same as `sub-name`
        case 'ジャンル/サブジャンル':
          for (const a of v.querySelectorAll(
            '.product-detail-spec-alert > a:first-of-type',
          )) {
            keywords.add(a.textContent.trim());
          }
          break;
        case '発行日': {
          const match = /(\d{4})\/(\d{1,2})\/(\d{1,2})/.exec(
            v.textContent.trim(),
          );
          if (!match) {
            continue;
          }
          value.datePublished = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}+09:00`;
          break;
        }
        case 'シリーズ（同人）': {
          const a = v.querySelector<HTMLAnchorElement>(':scope > a');
          if (a) {
            value.isPartOf = {
              name: { textValue: a.textContent.trim() },
              url: a.href,
            };
          }
          break;
        }
        case '初出イベント': {
          keywords.add(
            v.textContent
              .trim()
              .replace(/^(?:\d{4})\/(?:\d{1,2})\/(?:\d{1,2})\s*/, ''),
          );
        }
      }
    }

    for (const span of document.querySelectorAll(
      '#main .pc > .product-detail-tag .hash ~ span',
    )) {
      keywords.add(span.textContent.trim());
    }

    value.keywords = [...keywords].map((name) => ({
      name: { textValue: name },
    }));
  }

  return {
    value,
    response,
  };
}

extensions.registerHosts(hosts, resolve);
