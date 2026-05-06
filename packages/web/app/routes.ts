import { type RouteConfig, index, route } from '@react-router/dev/routes';

import { primary_did } from './config';

export default [
  ...(primary_did === undefined
    ? [index('routes/home.tsx')]
    : [
        index('routes/profile/home.tsx', { id: 'homeProfile' }),
        route('entry', 'routes/profile/entry.tsx', { id: 'homeEntry' }),
      ]),
  route(':id', 'routes/profile/home.tsx'),
  route(':id/entry', 'routes/profile/entry.tsx'),
] satisfies RouteConfig;
