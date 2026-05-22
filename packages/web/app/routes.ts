import { type RouteConfig, index, route } from '@react-router/dev/routes';

import { primary_did } from './config';

export default [
  primary_did === undefined
    ? index('routes/home.tsx')
    : route('', 'routes/profile.tsx', { id: 'homeProfile' }, [
        index('routes/profile/home.tsx', { id: 'homeProfileHome' }),
        route('entry', 'routes/profile/entry.tsx', { id: 'homeEntry' }),
      ]),
  route(':id', 'routes/profile.tsx', [
    index('routes/profile/home.tsx'),
    route('entry', 'routes/profile/entry.tsx'),
  ]),
] satisfies RouteConfig;
