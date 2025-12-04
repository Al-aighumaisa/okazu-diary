export interface ResolveErrorOptions extends ErrorOptions {
  response?: Response;
}

export class ResolveError extends Error {
  name: 'ResolveError';
  response: Response | undefined;

  constructor(message?: string, options?: ResolveErrorOptions) {
    const response = options?.response;

    message ??= defaultMessage(response);

    super(message, options);

    this.name = 'ResolveError';
    this.response = response;
  }
}

export function isTemporaryHTTPError(status: number): boolean {
  return [408, 429, 500, 502, 503, 504, 507].includes(status);
}

function defaultMessage(res: Response | undefined): string | undefined {
  if (!res) {
    return;
  }
  if (!res.url) {
    return defaultMessageForStatus(res.status);
  }

  let origin;
  try {
    origin = new URL(res.url).origin;
  } catch {
    return defaultMessageForStatus(res.status);
  }

  return defaultMessageForOrigin(origin, res);
}

function defaultMessageForStatus(status: number): string | undefined {
  if (status >= 400) {
    return `HTTP Error ${status}`;
  }
}

function defaultMessageForOrigin(
  origin: string,
  res: Response,
): string | undefined {
  let ret;

  if (res.status === 429) {
    ret = `Too Many Requests to ${origin}`;

    const retryAfter = res.headers.get('retry-after');
    if (retryAfter) {
      ret += `; retry after ${retryAfter}`;
    }
  } else if (res.status >= 500) {
    ret = `Server ${origin} is unavailable (HTTP ${res.status})`;
  }

  return ret;
}
