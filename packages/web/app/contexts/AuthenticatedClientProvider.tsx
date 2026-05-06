import { Client } from '@atproto/lex';
import { useMemo } from 'react';
import type React from 'react';

import { OAuthProvider } from './OAuthProvider';
import { useOAuthContext } from './OAuthContext';
import { AuthenticatedClientContext } from './AuthenticatedClientContext';

export function AuthenticatedClientProvider({
  children,
}: React.PropsWithChildren): React.ReactNode {
  return (
    <OAuthProvider>
      <AuthenticatedClientProviderInternal>
        {children}
      </AuthenticatedClientProviderInternal>
    </OAuthProvider>
  );
}

function AuthenticatedClientProviderInternal({
  children,
}: React.PropsWithChildren): React.ReactNode {
  const { session } = useOAuthContext();

  const client = useMemo(() => {
    if (session) {
      const client: Client = new Client(session);
      client.assertAuthenticated();
      return client;
    }
  }, [session]);

  return (
    <AuthenticatedClientContext value={client}>
      {children}
    </AuthenticatedClientContext>
  );
}
