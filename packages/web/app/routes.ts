import {
  type RouteConfig,
  index,
  route,
  layout,
} from '@react-router/dev/routes';

import { allowed_dids } from './config';

const [did, ...restDids] = allowed_dids;

export default [
  layout('routes/layout.tsx', [
    ...(did && !restDids.length
      ? [
          index('routes/profile/home.tsx', { id: 'homeProfile' }),
          route('entry', 'routes/profile/entry.tsx', { id: 'homeEntry' }),
        ]
      : [index('routes/home.tsx')]),
    route(':id', 'routes/profile/home.tsx'),
    route(':id/entry', 'routes/profile/entry.tsx'),
  ]),
] satisfies RouteConfig;
