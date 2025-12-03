import { AtpBaseClient } from '@atproto/api';
import { getHandle, getPds, HandleResolver } from '@atproto/identity';

import ActorFeed from '~/components/ActorFeed';
import Profile from '~/components/Profile';
import { allowed_dids } from '~/config';
import { didResolver } from '~/lib/atproto';
import { useProfile } from '~/state/profile';
import type { Route } from './+types/profile';

interface LoaderData {
  did: string;
  client: AtpBaseClient;
  handle: string | undefined;
}

const handleResolver = new HandleResolver();

export async function clientLoader({
  params: { id },
}: Route.LoaderArgs): Promise<LoaderData> {
  let did, handle;
  if (id.startsWith('@')) {
    handle = id.slice(1);
    did = await handleResolver.resolve(handle);
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

  if (!handle) {
    const docHandle = getHandle(doc);
    if (docHandle) {
      const roundTripDid = await handleResolver.resolve(docHandle);
      if (roundTripDid === did) {
        handle = docHandle;
      }
    }
  }

  const client = new AtpBaseClient({ service });

  return { did, client, handle };
}

export default function ProfilePage({
  loaderData: { did, client, handle },
}: {
  loaderData: LoaderData;
}): React.ReactNode {
  const profileState = useProfile(did, client);

  return (
    <>
      <title>
        {profileState.status === 'resolved'
          ? `${profileState.value.displayName}${handle ? ` (@${handle})` : ''} — Okazu Diary`
          : 'Okazu Diary'}
      </title>
      <Profile did={did} profileState={profileState} />
      <ActorFeed did={did} client={client} />
    </>
  );
}
