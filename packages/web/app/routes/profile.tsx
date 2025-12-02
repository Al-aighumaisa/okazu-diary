import { AtpBaseClient } from '@atproto/api';
import { getPds, HandleResolver } from '@atproto/identity';
import type React from 'react';

import ActorFeed from '~/components/ActorFeed';
import Profile from '~/components/Profile';
import { allowed_dids } from '~/config';
import { didResolver } from '~/lib/atproto';
import type { Route } from './+types/profile';

interface LoaderData {
  did: string;
  client: AtpBaseClient;
}

const handleResolver = new HandleResolver();

export async function clientLoader({
  params: { id },
}: Route.LoaderArgs): Promise<LoaderData> {
  let did;
  if (id.startsWith('@')) {
    did = await handleResolver.resolve(id.slice(1));
    if (!did) {
      throw new Response(null, { status: 404 });
    }
  } else if (
    id.startsWith('did:') ||
    id.startsWith('did%3A') ||
    id.startsWith('did%3a')
  ) {
    did = decodeURIComponent(id);
  } else {
    throw new Response(null, { status: 404 });
  }

  if (allowed_dids.length && !allowed_dids.includes(did)) {
    throw new Response(null, { status: 404 });
  }

  const doc = await didResolver.resolve(did);
  if (!doc) {
    throw new Response(null, { status: 404 });
  }

  const service = getPds(doc);
  if (!service) {
    throw new Error('DID document does not have atproto PDS service');
  }

  const client = new AtpBaseClient({ service });

  return { did, client };
}

export default function ProfilePage({
  loaderData: { did, client },
}: {
  loaderData: LoaderData;
}): React.ReactNode {
  return (
    <>
      <Profile did={did} client={client} />
      <ActorFeed did={did} client={client} />
    </>
  );
}
