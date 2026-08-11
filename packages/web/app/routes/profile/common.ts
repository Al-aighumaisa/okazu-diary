import type { DidString } from '@atproto/lex-client';

import { isAllowedDid, primary_did } from '~/config';
import type { Route } from '../+types/profile';
import { isValidDid } from '@atproto/syntax';

export type ParsedParams =
  | { did: DidString; handle?: string | undefined }
  | { did?: undefined; handle: string };

export function parseProfileParams({
  id,
}: Partial<Route.LoaderArgs['params']>): ParsedParams | undefined {
  if (id) {
    if (isValidDid(id)) {
      if (isAllowedDid(id)) {
        return { did: id };
      }
    } else if (id.startsWith('@')) {
      return { handle: id.slice(1) };
    }
  } else {
    // TODO: Use a pre-resolved handle for this case.
    return { did: primary_did! };
  }
}
