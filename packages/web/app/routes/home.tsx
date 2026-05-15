import { getHandle } from '@atproto/identity';
import type React from 'react';
import { Link } from 'react-router';

import { allowed_dids } from '~/config';
import { didResolver, getPrefetchedDid } from '~/lib/identity';
import styles from './home.module.css';

const actors = await Promise.all(
  allowed_dids.map(async (did) => {
    const didDoc = getPrefetchedDid(did) ?? (await didResolver.resolve(did));
    if (!didDoc) {
      return { did };
    }
    const handle = getHandle(didDoc);
    return handle ? { did, handle } : { did };
  }),
);

const items = actors.map((actor) => {
  const link =
    'handle' in actor ? (
      <Link lang="" to={`/@${actor.handle}`}>
        @{actor.handle}
      </Link>
    ) : (
      <Link lang="zxx" to={`/${actor.did}`}>
        {actor.did}
      </Link>
    );
  return <li key={actor.did}>{link}</li>;
});
export default function Home(): React.ReactNode {
  return (
    <>
      <title>Okazu Diary</title>
      <main>
        <h1>Okazu Diary</h1>
        <ul className={styles.list}>{items}</ul>
      </main>
    </>
  );
}
