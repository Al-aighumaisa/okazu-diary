import { DidResolver, MemoryCache } from '@atproto/identity';
import * as config from '~/config';

export const didResolver = new DidResolver({
  plcUrl: config.plc,
  didCache: new MemoryCache(5 * 60 * 1000, 60 * 60 * 1000),
});
