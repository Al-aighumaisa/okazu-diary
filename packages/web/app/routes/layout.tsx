import type React from 'react';
import { Outlet } from 'react-router';

export default function Home(): React.ReactNode {
  return (
    <>
      <title>Okazu Diary</title>
      <link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml" />
      <link rel="icon" href="/icon-192.png" sizes="192x192" type="image/png" />
      <link rel="icon" href="/icon-128.png" sizes="128x128" type="image/png" />
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
      <Outlet />
    </>
  );
}
