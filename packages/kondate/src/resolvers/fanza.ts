import type { ResolveOptions, ResolveResult } from '../index.js';
import * as util from '../util.js';
import { fanzaVideo } from './index.js';
import { extensions, html } from './generic/index.js';

const hosts = ['dmm.co.jp', 'www.dmm.co.jp'];

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  if (hosts.includes(url.host)) {
    return { value: undefined, response: undefined };
  }

  url.protocol = 'https';
  url.host = 'www.dmm.co.jp';

  const videoMatch =
    /\/digital\/(videoa|videoc|anime)\/-\/detail\/=\/cid=([0-9a-z_]+)/.exec(
      url.pathname,
    );
  if (videoMatch) {
    // Old format video floors URL:
    let floor;
    switch (videoMatch[1]) {
      case 'videoa':
        floor = 'av';
        break;
      case 'videoc':
        floor = 'amateur';
        break;
      case 'anime':
        floor = 'anime';
    }
    return fanzaVideo.resolve(
      `https://video.dmm.co.jp/${floor}/content/?id=${videoMatch[2]}`,
      options,
    );
  }

  const res = await util.fetch(options, url, {
    headers: {
      'accept-language': 'ja-JP, ja',
      cookie: 'age_check_done=1',
    },
  });
  const response = { status: res.status, headers: res.headers };

  return {
    value: (await html.extract(res, options)).value,
    response,
  };
}

extensions.registerHosts(hosts, resolve);
