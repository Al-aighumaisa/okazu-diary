import { DidResolver, getHandle } from '@atproto/identity';
import type { Config } from '@react-router/dev/config';

import * as config from './app/config/index.js';

const didResolver = new DidResolver({
  plcUrl: config.plc,
});

export default {
  ssr: false,
  async prerender() {
    return [
      '/',
      ...config.allowed_dids.map((did) => '/' + did),
      ...(
        await Promise.all(
          config.allowed_dids.map(async (did) => {
            const doc = await didResolver.resolve(did);
            if (!doc) {
              return [] as string[];
            }
            const handle = getHandle(doc);
            return handle ? `/@${handle}` : ([] as string[]);
          }),
        )
      ).flat(),
    ];
  },
} satisfies Config;
