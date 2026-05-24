import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type default as React, useState } from 'react';
import 'react-loading-skeleton/dist/skeleton.css';
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import { AuthenticatedClientProvider } from '~/contexts/AuthenticatedClientProvider';
import { useOAuthContext } from '~/contexts/OAuthContext';
import AgeGate from '~/components/AgeGate';
import SignInDialog from '~/components/SignInDialog';
import GitIcon from '~/icon/Git-Icon-Black.svg?react';
import type { Route } from './+types/root';
import './app.css';
import noscriptCssUrl from './noscript.css?url';
import styles from './root.module.css';

const queryClient = new QueryClient();

export function Layout({ children }: React.PropsWithChildren): React.ReactNode {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml" />
        <link
          rel="icon"
          href="/icon-192.png"
          sizes="192x192"
          type="image/png"
        />
        <link
          rel="icon"
          href="/icon-128.png"
          sizes="128x128"
          type="image/png"
        />
        <link
          rel="icon apple-touch-icon"
          href="/apple-touch-icon.png"
          sizes="1024x1024"
          type="image/png"
        />
        <link
          rel="icon apple-touch-icon"
          href="/icon-60@3x.png"
          sizes="180x180"
          type="image/png"
        />
        <link
          rel="icon apple-touch-icon"
          href="/icon-60@2x.png"
          sizes="120x120"
          type="image/png"
        />
        <link
          rel="icon apple-touch-icon"
          href="/icon-167.png"
          sizes="167x167"
          type="image/png"
        />
        <link
          rel="icon"
          href="/favicon.ico"
          sizes="16x16 32x32 48x48"
          type="image/vnd.microsoft.icon"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <AgeGate>
          <QueryClientProvider client={queryClient}>
            <AuthenticatedClientProvider>
              <div className={styles.container}>
                <div className={styles.content}>
                  <div className="no-noscript">{children}</div>
                  <noscript>
                    <p>This page requires JavaScript.</p>
                  </noscript>
                </div>
                <Footer />
              </div>
            </AuthenticatedClientProvider>
          </QueryClientProvider>
        </AgeGate>
        <ScrollRestoration />
        <Scripts />
        <noscript>
          <link rel="stylesheet" href={noscriptCssUrl} />
        </noscript>
      </body>
    </html>
  );
}

export default function App(): React.ReactNode {
  return <Outlet />;
}

export function ErrorBoundary({
  error,
}: Route.ErrorBoundaryProps): React.ReactNode {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details =
      error.status === 404
        ? 'The requested page could not be found.'
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

function Footer(): React.ReactNode {
  const { isLoading, isSignedIn, signIn, signOut } = useOAuthContext();

  const openState = useState<boolean>(false);
  const [_, setSignInDialogOpened] = openState;

  return (
    <>
      <footer className={styles.footer}>
        <div className={styles.footerIntro}>
          <h2 className={styles.footerSiteName}>
            <img
              src="/icon.svg"
              width="32px"
              height="32px"
              aria-labelledby="footer-title"
            />
            <span id="footer-title">Okazu Diary</span>
          </h2>
          <nav>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                {isSignedIn ? (
                  <button
                    className="appearance-none"
                    disabled={isLoading}
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </button>
                ) : (
                  <button
                    className="appearance-none"
                    disabled={isLoading}
                    aria-controls="sign-in-dialog"
                    aria-haspopup="dialog"
                    onClick={() => setSignInDialogOpened(true)}
                    // TODO: Remove this when the JSX typedef learns the Invoker Commands API.
                    // @ts-expect-error
                    commandfor="sign-in-dialog"
                    command="show-modal"
                  >
                    Sign in
                  </button>
                )}
              </li>
            </ul>
          </nav>
        </div>
        <div className={styles.footerAppendix}>
          <h3>Links</h3>
          <ul>
            <li>
              <a
                href="https://okazu-diary.org/"
                target="_blank"
                rel="noopener"
                className={styles.footerLinkItem}
              >
                <GitIcon role="img" aria-label="Git" />
              </a>
            </li>
          </ul>
        </div>
      </footer>
      <SignInDialog
        id="sign-in-dialog"
        openState={openState}
        isLoading={isLoading}
        signIn={signIn}
      />
    </>
  );
}
