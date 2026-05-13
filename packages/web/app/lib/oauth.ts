// Reference: <https://github.com/bluesky-social/atproto/blob/@atproto/oauth-client-browser@0.3.42/packages/oauth/oauth-client-browser-example/src/oauthClient.ts>

import type {
  OAuthClientMetadataInput,
  AtprotoDid,
  Session,
  BrowserOAuthClient,
} from '@atproto/oauth-client-browser';

import clientMetadata_ from '~/config/oauth-client-metadata.json';
import * as config from '~/config';
import { identityResolver } from './identity';

export const clientMetadata = clientMetadata_ as OAuthClientMetadataInput;

// Dynamically import the module because the import fails if the UA blocks Indexed DB access in CSR,
// and imported constructor always fails in SSR.
let oauthClientBrowser;
if ('indexedDB' in globalThis && !import.meta.env.SSR) {
  try {
    oauthClientBrowser = await import('@atproto/oauth-client-browser');
  } catch (e) {
    console.error(e);
  }
}

interface OAuthEventTarget {
  addEventListener(
    type: 'deleted',
    listener: (event: DeletedEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: 'updated',
    listener: (event: UpdatedEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
}

type DeletedEvent = CustomEvent<{ sub: AtprotoDid; cause: unknown }>;
type UpdatedEvent = CustomEvent<{ sub: AtprotoDid; session: Session }>;

export const events = new EventTarget() as EventTarget & OAuthEventTarget;

export let client: BrowserOAuthClient | undefined;
// `indexedDB` may still be missing after successful import in SSR.
if (oauthClientBrowser) {
  const dev = import.meta.env.MODE === 'development';
  try {
    client = new oauthClientBrowser.BrowserOAuthClient({
      allowHttp: dev,
      identityResolver,
      plcDirectoryUrl: config.plc,
      clientMetadata,
      onDelete(sub, cause) {
        events.dispatchEvent(
          new CustomEvent('deleted', {
            detail: { sub, cause },
          }) satisfies DeletedEvent,
        );
      },
      onUpdate(sub, session) {
        events.dispatchEvent(
          new CustomEvent('updated', {
            detail: { sub, session },
          }) satisfies UpdatedEvent,
        );
      },
    });
  } catch (e) {
    console.error(e);
  }
}

export const initPromise = Promise.resolve(client?.init(false)).then(
  (result) => {
    if (result && result.state === undefined) {
      // Trigger token refresh in the background.
      void result.session.getTokenInfo(true);
    }
    return result;
  },
  (e) => {
    console.error(e);
  },
);
