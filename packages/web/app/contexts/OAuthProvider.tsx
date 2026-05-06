// Reference: <https://github.com/bluesky-social/atproto/blob/@atproto/oauth-client-browser@0.3.42/packages/oauth/oauth-client-browser-example/src/providers/OAuthProvider.tsx>

import type { OAuthSession } from '@atproto/oauth-client-browser';
import { type default as React, useCallback, useEffect, useState } from 'react';

import * as oauth from '~/lib/oauth';
import {
  OAuthContext,
  type SignInFunction,
  type SignOutFunction,
} from './OAuthContext';

export function OAuthProvider({
  children,
}: React.PropsWithChildren): React.ReactNode {
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<OAuthSession | undefined>();
  const [isSignedIn, setIsSignedIn] = useState<boolean>(false);

  useEffect(() => {
    const abort = new AbortController();
    const signal = abort.signal;

    void oauth.initPromise
      .then((result) => {
        if (!signal.aborted && result) {
          setSession(result.session);
          setIsSignedIn(true);
        }
      })
      .finally(() => {
        if (!signal.aborted) {
          setInitialized(true);
        }
      });

    return () => abort.abort();
  }, []);

  // Sync the session with other tabs.
  useEffect(() => {
    const abort = new AbortController();
    const signal = abort.signal;

    if (session) {
      oauth.events.addEventListener(
        'deleted',
        (e) => {
          if (e.detail.sub === session.sub) {
            setSession(undefined);
            setIsSignedIn(false);
          }
        },
        { signal },
      );
    } else {
      oauth.events.addEventListener(
        'updated',
        (e) => {
          void oauth.client!.restore(e.detail.sub, false).then((session) => {
            if (!signal.aborted) {
              setSession(session);
              setIsSignedIn(true);
            }
          });
        },
        { signal },
      );
    }

    return () => abort.abort();
  }, [session]);

  useEffect(() => {
    if (!session || navigator.onLine) {
      return;
    }

    const abort = new AbortController();
    const signal = abort.signal;

    // Refresh the session when getting back online, triggering the `deleted` event if revoked.
    addEventListener(
      'online',
      () => {
        session.getTokenInfo(true).catch((err) => {
          console.warn('Failed to refresh OAuth session:', err);
        });
      },
      { signal },
    );

    return () => abort.abort();
  }, [session]);

  const signIn = useCallback<SignInFunction>(
    (input, options) =>
      Promise.resolve(oauth.client?.restore(input, true))
        .catch(() => oauth.client!.signIn(input, options))
        .then((session) => {
          setSession(session);
          setIsSignedIn(true);
        })
        .finally(() => setLoading(false)),
    [],
  );

  const signOut = useCallback<SignOutFunction>(async () => {
    if (session) {
      setSession(undefined);
      setLoading(true);
      try {
        await session.signOut();
      } finally {
        setLoading(false);
        setIsSignedIn(false);
      }
    }
  }, [session]);

  return (
    <OAuthContext
      value={{
        session,
        isLoading: !initialized || loading,
        isSignedIn,
        signIn,
        signOut,
      }}
    >
      {children}
    </OAuthContext>
  );
}
