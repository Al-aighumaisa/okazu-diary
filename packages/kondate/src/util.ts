import { parse as parseJSON, AST as jsonAST } from 'json-ast';

import type { ResolveOptions } from './index.js';
import { USER_AGENT } from './consts/index.js';

export function encodingFormatFromFileExt(path: string): string | undefined {
  const match = /\.[^./]+$/.exec(path);
  if (!match) {
    return;
  }

  switch (match[0].slice(1)) {
    case 'gif':
      return 'image/gif';
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
  }
}

/**
 * Parses a potentially malformed JSON string, that e.g. contains unescaped newlines in strings.
 *
 * (Surprisingly many sites out there such as Nijie and Bluesky Social App serve such JSON.)
 */
export function robustParseJSON(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    // skip
  }
  try {
    const document = parseJSON(input);
    return jsonAST.JsonNode.toJSON(document);
  } catch {
    // skip
  }
}

async function fetch_(
  options: Readonly<ResolveOptions> | undefined,
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(options?.headers);
  for (const [name, value] of new Headers(init?.headers)) {
    headers.append(name, value);
  }
  for (const [name, value] of new Headers(options?.overrideHeaders)) {
    headers.set(name, value);
  }

  return (options?.fetch ?? fetch)(url, {
    ...init,
    headers: {
      'user-agent': USER_AGENT,
      ...(options?.headers &&
        (Symbol.iterator in options.headers
          ? Object.fromEntries(options.headers)
          : options.headers)),
      ...init?.headers,
      ...(options?.overrideHeaders &&
        (Symbol.iterator in options.overrideHeaders
          ? Object.fromEntries(options.overrideHeaders)
          : options.overrideHeaders)),
    },
  });
}

export { fetch_ as fetch };
