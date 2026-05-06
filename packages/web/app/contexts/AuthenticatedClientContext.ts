import type { Client, DidString } from '@atproto/lex';
import { createContext, useContext } from 'react';

export type AuthenticatedClient = Client & { did: DidString };

export const AuthenticatedClientContext = createContext<
  AuthenticatedClient | undefined
>(undefined);

export function useAuthenticatedClient(): AuthenticatedClient {
  const value = useContext(AuthenticatedClientContext);
  if (!value) {
    throw new Error(
      'AuthenticatedClientContext must be used within an AuthenticatedClientProvider',
    );
  }
  return value;
}
