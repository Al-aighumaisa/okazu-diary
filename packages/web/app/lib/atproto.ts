import { DidResolver, MemoryCache, } from '@atproto/identity';


export const didResolver = new DidResolver({
  didCache: new MemoryCache(5 * 60 * 1000, 60 * 60 * 1000),
});
