import type {
  BrowserOAuthClient,
  OAuthSession,
} from '@atproto/oauth-client-browser';
import { createContext, useContext } from 'react';

export interface OAuthContextValue {
  session: OAuthSession | undefined;
  isLoading: boolean;
  isSignedIn: boolean;
  signIn: SignInFunction;
  signOut: SignOutFunction;
}

export type SignInFunction = (
  ...args: Parameters<typeof BrowserOAuthClient.prototype.signIn>
) => Promise<void>;

export type SignOutFunction = typeof OAuthSession.prototype.signOut;

export const OAuthContext = createContext<OAuthContextValue | undefined>(
  undefined,
);

export function useOAuthContext(): OAuthContextValue {
  const value = useContext(OAuthContext);
  if (!value) {
    throw new Error('OAuthContext must be used within an OAuthProvider');
  }
  return value;
}
