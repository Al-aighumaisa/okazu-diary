import type { ResolveOptions, ResolveResult } from '../../index.js';
import { http } from './index.js';
import { extensions } from './index.js';

export async function resolve(
  url: string | URL,
  options?: Readonly<ResolveOptions>,
): Promise<ResolveResult> {
  url = new URL(url);

  const matched = extensions.lookup(url);
  if (matched) {
    const ret = await matched(url, options);
    if (ret) {
      return ret;
    }
  }

  return http.resolve(url, options);
}
