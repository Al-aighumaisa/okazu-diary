import { isAllowedDid, primary_did } from '~/config';
import type { Route as HomeRoute } from './+types/home';

export type ParsedParams =
  | { did: `did:${string}`; handle?: string | undefined }
  | { did?: undefined; handle: string };

export function parseParams({
  id,
}: Partial<HomeRoute.LoaderArgs['params']>): ParsedParams | undefined {
  if (id) {
    if (id.startsWith('did:')) {
      if (isAllowedDid(id)) {
        return { did: id as `did:${string}` };
      }
    } else if (id.startsWith('@')) {
      return { handle: id.slice(1) };
    }
  } else {
    // TODO: Use a pre-resolved handle for this case.
    return { did: primary_did! };
  }
}
