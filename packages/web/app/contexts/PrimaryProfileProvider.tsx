import type { AtIdentifierString } from '@atproto/lex-client';
import type React from 'react';

import { useHandleQuery } from '~/queries/handle';
import { useProfileQuery } from '~/queries/profile';
import { PrimaryProfileContext } from './PrimaryProfileContext';

export interface PrimaryProfileProviderProps {
  did: AtIdentifierString;
  prefetchedHandle?: string | undefined;
}

export function PrimaryProfileProvider({
  did,
  prefetchedHandle,
  children,
}: React.PropsWithChildren<PrimaryProfileProviderProps>): React.ReactNode {
  const query = useProfileQuery(did);
  const handleQuery = useHandleQuery(did, prefetchedHandle);

  return (
    <PrimaryProfileContext value={{ did, handleQuery, query }}>
      {children}
    </PrimaryProfileContext>
  );
}
