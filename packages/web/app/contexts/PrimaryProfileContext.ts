import { createContext } from 'react';
import type { UseHandleQueryResult } from '~/queries/handle';
import type { UseProfileQueryResult } from '~/queries/profile';

export interface PrimaryProfileContextValue {
  did: string;
  handleQuery: UseHandleQueryResult;
  query: UseProfileQueryResult;
}

export const PrimaryProfileContext = createContext<
  PrimaryProfileContextValue | undefined
>(undefined);
