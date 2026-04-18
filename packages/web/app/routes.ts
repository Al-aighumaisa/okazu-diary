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
    did && !restDids.length
      ? index('routes/profile.tsx', { id: 'homeProfile' })
      : index('routes/home.tsx'),
    route(':id', 'routes/profile.tsx'),
  ]),
] satisfies RouteConfig;
