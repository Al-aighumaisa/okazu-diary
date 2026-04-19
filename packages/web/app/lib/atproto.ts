import { DidResolver, MemoryCache } from '@atproto/identity';
import * as config from '~/config';

import coalesce, { type State as CoalescerState } from './coalescer';

const coalescerState: CoalescerState<unknown> = new Map();

class CoalescingDidResolver extends DidResolver {
  override resolveNoCheck(did: string): Promise<unknown> {
    return coalesce(
      coalescerState,
      did,
      (_, did) => super.resolveNoCheck(did),
      [did],
    );
  }
}

export const didResolver = new CoalescingDidResolver({
  plcUrl: config.plc,
  didCache: new MemoryCache(1 * 60 * 1000, 5 * 60 * 1000),
});
