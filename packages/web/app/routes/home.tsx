import { DidResolver, getHandle } from '@atproto/identity';
import { Link, redirect } from 'react-router';

import { allowed_dids } from '~/config';

const actors = await Promise.all(
  allowed_dids.map(async (did) => {
    const didDoc = await new DidResolver({}).resolve(did);
    if (!didDoc) {
      return { did };
    }
    const handle = getHandle(didDoc);
    return handle ? { did, handle } : { did };
  }),
);
const [actor, ...restActors] = actors;

export default actor !== undefined && !restActors.length
  ? (() => {
      const location =
        'handle' in actor ? `/@${actor.handle}` : `/${actor.did}`;
      return function Home() {
        throw redirect(location);
      };
    })()
  : (() => {
      const items = actors.map((actor) => {
        const link =
          'handle' in actor ? (
            <Link lang="und" to={`/@${actor.handle}`}>
              @{actor.handle}
            </Link>
          ) : (
            <Link lang="zxx" to={`/${actor.did}`}>
              {actor.did}
            </Link>
          );
        return <li key={actor.did}>{link}</li>;
      });
      return function Home() {
        return (
          <main>
            <h1>Okazu Diary</h1>
            <ul>{items}</ul>
          </main>
        );
      };
    })();
