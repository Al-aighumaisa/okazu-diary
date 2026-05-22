import { isAllowedDid, primary_did } from '~/config';
import type { Route } from '../+types/profile';

export type ParsedParams =
  | { did: `did:${string}`; handle?: string | undefined }
  | { did?: undefined; handle: string };

export function parseProfileParams({
  id,
}: Partial<Route.LoaderArgs['params']>): ParsedParams | undefined {
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
