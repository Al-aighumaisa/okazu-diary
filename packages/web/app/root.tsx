import 'react-loading-skeleton/dist/skeleton.css';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import type { Route } from './+types/root';
import './app.css';
import type React from 'react';

import AgeGate from '~/components/AgeGate';

export function Layout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactNode {
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
        <AgeGate>{children}</AgeGate>
        <ScrollRestoration />
        <Scripts />
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
