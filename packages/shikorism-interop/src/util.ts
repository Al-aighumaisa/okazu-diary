import pLimit from 'p-limit';

interface HostState {
  embargo: boolean;
  limit: ReturnType<typeof pLimit>;
}

const MAX_FETCH_ATTEMPTS = 6;

const hosts = new Map<string, HostState>();

async function fetch_(
  url: string | URL,
  init?: RequestInit,
): Promise<Response> {
  url = new URL(url);

  let host = hosts.get(url.host);
  if (!host) {
    host = {
      embargo: false,
      limit: pLimit(1),
    };
    hosts.set(url.host, host);
  }

  if (host.embargo) {
    throw new Error();
  }

  return host.limit(fetchBackoff, host, url, init);
}

async function fetchBackoff(
  state: HostState,
  url: string | URL,
  init: RequestInit | undefined,
): Promise<Response> {
  let href;
  const signal = init?.signal;

  let attempts = 0;
  let res;
  while (true) {
    res = await fetch(url, init);

    if (res.status !== 429) {
      return res;
    }

    if (++attempts === MAX_FETCH_ATTEMPTS) {
      state.embargo = true;
      throw new Error(`Giving up after ${MAX_FETCH_ATTEMPTS} attempts`, {
        cause: res,
      });
    }

    signal?.throwIfAborted();

    let wait = 2 ** attempts * 1000;
    const retryAfter = res.headers.get('retry-after');
    if (retryAfter) {
      if (/\d+/.test(retryAfter)) {
        const delaySeconds = +retryAfter;
        if (wait < delaySeconds) {
          wait = delaySeconds;
        }
      } else {
        const date = Date.parse(retryAfter);
        if (!Number.isNaN(date)) {
          const delaySeconds = Math.max(date - Date.now(), 0);
          if (wait < delaySeconds) {
            wait = delaySeconds;
          }
        }
      }
    }

    href ??= url.toString();
    console.warn(
      `Got HTTP 429 response from ${href}, waiting for ${wait / 1000}s (attepmt ${attempts}/${MAX_FETCH_ATTEMPTS}`,
    );

    await new Promise((resolve, reject) => {
      const id = setTimeout(resolve, wait);
      signal?.addEventListener('abort', () => {
        clearTimeout(id);
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(signal.reason);
      });
    });
  }
}

export { fetch_ as fetch };
