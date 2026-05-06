import fsPromises from 'node:fs/promises';
import process from 'node:process';

const base = process.env.OKAZU_DIARY_WEB_BASE_URL;
if (!base) {
  throw new Error('OKAZU_DIARY_WEB_BASE_URL environment variable must be set');
}

const base_parsed = new URL(base);

const metadata = {
  client_id:
    base_parsed.protocol === 'http:'
      ? `http://localhost?redirect_uri=${encodeURIComponent(base_parsed.href)}`
      : new URL('oauth-client-metadata.json', base).href,
  client_name: 'Okazu-Diary.org',
  client_uri: base_parsed,
  logo_uri: new URL('icon.svg', base),
  application_type: 'web',
  grant_types: ['authorization_code', 'refresh_token'],
  scope: [
    'atproto',
    // 'include:org.okazu-diary.authFull',
  ].join(' '),
  response_types: ['code'],
  redirect_uris: [base_parsed],
  token_endpoint_auth_method: 'none',
  dpop_bound_access_tokens: true,
};

await fsPromises.mkdir('public', { recursive: true });

await fsPromises.writeFile(
  'app/config/oauth-client-metadata.json',
  JSON.stringify(
    metadata,
    null,
    process.env.NODE_ENV === 'development' ? 2 : 0,
  ),
);
