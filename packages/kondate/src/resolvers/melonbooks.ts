import type { ResolveOptions, ResolveResult } from '../index.js';
import * as util from '../util.js';
import { extensions, html } from './generic/index.js';

const hosts = ['melonbooks.co.jp', 'www.melonbooks.co.jp'];

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (!hosts.includes(url.host)) {
    return { value: undefined, response: undefined };
  }

  url.protocol = 'https';
  url.host = 'www.melonbooks.co.jp';

  let productId;
  if (url.pathname === '/detail/detail.php') {
    productId = url.searchParams.get('product_id') || undefined;
    if (productId) {
      url.search = `?product_id=${productId}`;
    }
  }

  const res = await util.fetch(options, url, {
    headers: {
      'accept-language': 'ja-JP, ja',
      cookie: 'AUTH_ADULT=1',
    },
  });

  const { value, document } = await html.extract(res, options);

  value.identifier = productId;

  // Special extraction logic for the item detail page.
  if (res.ok && productId) {
    value.creator = [];

    const publisher =
      document.querySelector<HTMLAnchorElement>('.author-name a');
    if (publisher) {
      value.creator.push({
        type: 'Organization',
        name: { textValue: publisher.textContent.trim() },
        url: publisher.href,
      });
    }

    const image = [];
    for (const img of document.querySelectorAll<HTMLImageElement>(
      '.item-img img',
    )) {
      image.push({ contentUrl: img.src });
    }
    if (image.length) {
      value.image = image;
    }

    const description = document
      .querySelector('.item-detail .page-headline ~ * p')
      ?.innerHTML.trim();
    if (description) {
      value.description = description;
    }

    const keywords = new Set<string>();

    for (const tr of document.querySelectorAll('.item-detail tr')) {
      const [k, v] = tr.querySelectorAll<HTMLTableCellElement>(
        ':scope > th, :scope > td',
      );
      if (!k || !v) {
        continue;
      }

      switch (k.textContent.trim()) {
        // case 'サークル名':
        //   // Same as `publisher`
        case '作家名':
          for (const a of v.querySelectorAll<HTMLAnchorElement>(
            'a:not([href="#"])',
          )) {
            const name = a.textContent.trim().replace(/(?:^|\/)他$/, '');
            if (name) {
              value.creator.push({
                type: 'Person',
                name: { textValue: name },
                url: a.href,
              });
            }
          }
          break;
        case 'ジャンル':
          for (const a of v.querySelectorAll('a')) {
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
        case 'イベント':
          keywords.add(v.textContent.trim());
      }
    }

    // Tags:
    for (const a of document.querySelectorAll('.item-detail2 a')) {
      const hashName = a.textContent.trim();
      if (hashName.startsWith('#')) {
        const name = hashName.slice(1);
        if (name) {
          keywords.add(name);
        }
      }
    }

    if (keywords.size) {
      value.keywords = [...keywords].map((name) => ({
        name: { textValue: name },
      }));
    }
  }

  return {
    value,
    response: { status: res.status, headers: res.headers },
  };
}

extensions.registerHosts(hosts, resolve);
