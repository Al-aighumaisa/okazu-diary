import type React from 'react';
import { Outlet } from 'react-router';

import { isAllowedDid } from '~/config';
import { PrimaryProfileProvider } from '~/contexts/PrimaryProfileProvider';
import { handleResolver } from '~/lib/identity';
import type { Route } from './+types/profile';
import { parseProfileParams } from './profile/common';

export interface LoaderData {
  did: string;
  paramHandle: string | undefined;
}

export async function clientLoader({
  params: unparsedParams,
}: Pick<Route.LoaderArgs, 'params'>): Promise<LoaderData> {
  const params = parseProfileParams(unparsedParams);
  let did;
  if (!params) {
    throw new Response(null, { status: 404 });
  } else if (!(did = params.did)) {
    did = await handleResolver.resolve(params.handle);
    if (!did || !isAllowedDid(did)) {
      throw new Response(null, { status: 404 });
    }
  }

  return { did, paramHandle: params.handle };
}

export default function ProfilePage({
  loaderData: { did, paramHandle },
}: Pick<Route.ComponentProps, 'loaderData'>): React.ReactNode {
  return (
    <PrimaryProfileProvider did={did} prefetchedHandle={paramHandle}>
      <Outlet />
    </PrimaryProfileProvider>
  );
}

export function HydrateFallback(): React.ReactNode {
  // Basically the same as the main component, except skipping the handle resolution.
  // It might be neat if we could overthrow the loader and resolve the handle in the main component
  // itself, but it's better to keep the loader around as we want to determine if the ID is `404`.
  return <Outlet />;
}
