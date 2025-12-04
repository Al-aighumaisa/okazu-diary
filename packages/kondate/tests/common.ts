import fsPromises from 'node:fs/promises';
import path from 'node:path';

import { isTemporaryHTTPError } from '../src/error';

declare global {
  // TODO: Remove this when https://github.com/microsoft/TypeScript/pull/61696 is released.
  interface Uint8Array {
    toHex(): string;
  }

  // https://github.com/microsoft/TypeScript/issues/61321
  interface RegExpConstructor {
    escape(str: string): string;
  }
}

interface RequestMeta {
  headers: Record<string, string>;
  redirect?: 'manual' | undefined;
  body?: string | undefined;
}

interface ResponseMeta
  extends Pick<Response, 'redirected' | 'status' | 'statusText' | 'url'> {
  headers: Record<string, string>;
  setCookie: string[];
}

const update_fixture = new Set(process.env.UPDATE_FIXTURE?.split(' '));

const actualFetch = fetch;

export function mockFetch(suite: string): jest.SpyInstance {
  const usedFixtures = new Set<string>();

  const spy = jest
    .spyOn(global, 'fetch')
    .mockImplementation(function fetch(input, init) {
      return fetchFixture(suite, usedFixtures, input, init);
    });

  afterAll(async () => {
    spy.mockRestore();
    await teardownFixture(suite, usedFixtures);
  });

  return spy;
}

// `(tests/suite/path/to/resource)/(METHOD.01234abcd).fixture(.header.json)?`
const FIXTURE_PATH_REGEX = new RegExp(
  `^(.*)${RegExp.escape(path.sep)}([A-Z]+\\.[0-9a-f]{64})\\.fixture(?:\\.header\\.json)?$`,
);

async function teardownFixture(
  suite: string,
  usedFixtures: Set<string>,
): Promise<void> {
  // Scan the fixtures directory for unused fixtures:

  const stack: string[] = [];
  stack.push(path.join('tests', 'fixtures', suite));

  let dir;
  while ((dir = stack.pop())) {
    for (const entry of await fsPromises.readdir(dir, {
      withFileTypes: true,
    })) {
      const entryPath = path.join(entry.parentPath, entry.name);

      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      const match = FIXTURE_PATH_REGEX.exec(entryPath);
      if (!match) {
        if (!entry.name.startsWith('.')) {
          console.warn('Unexpected file in fixtures directory:', entryPath);
        }
        continue;
      }

      if (!usedFixtures.has(`${match[1]}#${match[2]}`)) {
        console.warn('Unused fixture:', entryPath);
      }
    }
  }
}

async function fetchFixture(
  suite: string,
  usedFixtures: Set<string>,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  let method, url, redirect, reqMeta: RequestMeta;
  if (input instanceof Request) {
    method = input.method;
    url = new URL(input.url);
    redirect = input.redirect;
    reqMeta = {
      headers: Object.fromEntries(input.headers),
      body: input.body ? await input.clone().text() : undefined,
    };
  } else {
    method = init?.method ?? 'GET';
    url = new URL(input);
    redirect = init?.redirect;
    reqMeta = {
      headers: Object.fromEntries(new Headers(init?.headers)),
      body: init?.body ? await new Response(init.body).text() : undefined,
    };
  }

  switch (redirect) {
    case 'error':
      throw new Error('redirect="error" request is unsupported');
    case 'follow':
      redirect = undefined;
  }
  reqMeta.redirect = redirect;

  const dir = fixtureDir(suite, url);
  const fingerprint = await fingerprintOfRequest(reqMeta);
  const headerPath = path.join(
    dir,
    `${method}.${fingerprint}.fixture.header.json`,
  );
  const bodyPath = path.join(dir, `${method}.${fingerprint}.fixture`);
  const key = `${dir}#${method}.${fingerprint}`;

  if (
    (update_fixture.has('*') || update_fixture.has(url.href)) &&
    !usedFixtures.has(key)
  ) {
    console.info(
      'Updating fixture:',
      url.href,
      ...(fingerprint ? [`(${fingerprint})`] : []),
    );

    const res = await actualFetch(input, init);

    if (isTemporaryHTTPError(res.status)) {
      throw new Error(`Upstream responded with HTTP ${res.status}`, {
        cause: res,
      });
    }

    const header: ResponseMeta = {
      headers: Object.fromEntries(res.headers),
      setCookie: res.headers.getSetCookie(),
      redirected: res.redirected,
      status: res.status,
      statusText: res.statusText,
      url: res.url,
    };

    await fsPromises.mkdir(dir, { recursive: true });
    await Promise.all([
      fsPromises.writeFile(headerPath, JSON.stringify(header, undefined, 2)),
      res
        .arrayBuffer()
        .then((body) => fsPromises.writeFile(bodyPath, Buffer.from(body))),
    ]);

    // Will read the files again instead of stingily reusing `res` to keep the conditions of the
    // test same regardless of the environment variable.
  }

  usedFixtures.add(key);

  let headerBytes, body;
  try {
    [headerBytes, body] = await Promise.all([
      fsPromises.readFile(headerPath),
      fsPromises.readFile(bodyPath),
    ]);
  } catch (e) {
    if (typeof e === 'object' && e && 'code' in e && e.code === 'ENOENT') {
      console.warn('Missing fixture for URL:', url.href);
    }
    throw e;
  }

  const header: ResponseMeta = JSON.parse(
    new TextDecoder().decode(headerBytes),
  );

  const ret = new Response(body, {
    status: header.status,
    statusText: header.statusText,
    headers: header.headers,
  });
  const { redirected, url: fixtureUrl, setCookie } = header;

  Object.defineProperty(ret.headers, 'getSetCookie', {
    configurable: true,
    writable: true,
    value: function (): string[] {
      return [...(setCookie ?? [])];
    },
  });

  return Object.defineProperties(ret, {
    redirected: {
      configurable: true,
      get() {
        return redirected;
      },
    },
    url: {
      configurable: true,
      get() {
        return fixtureUrl;
      },
    },
  });
}

async function fingerprintOfRequest(request: RequestMeta): Promise<string> {
  const canonish = JSON.stringify([
    Object.entries(request.headers)
      .filter(([, v]) => v !== undefined)
      .sort(),
    request.redirect ?? null,
    request.body ?? null,
  ]);
  const digestBuf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonish),
  );
  return new Uint8Array(digestBuf).toHex();
}

function fixtureDir(suite: string, url: URL): string {
  return path.join(
    'tests',
    'fixtures',
    suite,
    url.protocol.slice(0, -1),
    url.host,
    ...(
      url.pathname +
      (url.pathname.endsWith('/') ? ':index' : '') +
      url.search
    ).split('/'),
  );
}
