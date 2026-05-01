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
      ...(config.allowed_dids.length === 1 ? ['/entry'] : []),
      ...config.allowed_dids.flatMap((did) => [`/${did}`, `/${did}/entry`]),
      ...(
        await Promise.all(
          config.allowed_dids.map(async (did) => {
            const doc = await didResolver.resolve(did);
            if (!doc) {
              return [];
            }
            const handle = getHandle(doc);
            return handle ? [`/@${handle}`, `/@${handle}/entry`] : [];
          }),
        )
      ).flat(),
    ];
  },
} satisfies Config;
