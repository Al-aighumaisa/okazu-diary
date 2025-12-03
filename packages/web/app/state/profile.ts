import {
  AppBskyActorProfile,
  AtpBaseClient,
  BlobRef,
  ComAtprotoLabelDefs,
  type $Typed,
  type ComAtprotoRepoGetRecord,
} from '@atproto/api';
import { XRPCError } from '@atproto/xrpc';
import { OrgOkazuDiaryActorProfile } from '@okazu-diary/api';
import { useEffect, useReducer } from 'react';

export type State =
  | {
      status: 'pending';
      value: undefined | AppBskyActorProfile.Main | null;
      error?: unknown;
    }
  | { status: 'resolved'; value: Profile }
  | { status: 'error'; error: unknown };

export interface Profile {
  displayName: string | undefined;
  description: string | undefined;
  website: string | undefined;
  avatar: BlobRef | undefined;
  labels?:
    | $Typed<ComAtprotoLabelDefs.SelfLabels>
    | { $type: string }
    | undefined;
  createdAt?: string | undefined;
  hasBskyProfile: boolean;
}

type Action =
  | {
      type: 'od_resp';
      response: ComAtprotoRepoGetRecord.Response;
      abort: AbortController;
    }
  | { type: 'od_catch'; error: unknown; abort: AbortController }
  | { type: 'bsky_resp'; response: ComAtprotoRepoGetRecord.Response }
  | { type: 'bsky_catch' }
  | { type: 'reinit' };

export function useProfile(
  did: string,
  client: AtpBaseClient,
): [State, () => void] {
  const [state, dispatch] = useReducer(reducer, {
    status: 'pending',
    value: undefined,
  });
  const [retryState, retry] = useReducer((x) => !x, false);

  useEffect(() => {
    const abort = new AbortController();
    const signal = abort.signal;

    const bskyAbort = new AbortController();
    const bskySignal = AbortSignal.any([signal, bskyAbort.signal]);

    client.com.atproto.repo
      .getRecord(
        {
          repo: did,
          collection: 'org.okazu-diary.actor.profile',
          rkey: 'self',
        },
        { signal },
      )
      .then((response) => {
        if (signal.aborted) {
          return;
        }
        dispatch({ type: 'od_resp', response, abort: bskyAbort });
      })
      .catch((error) => {
        if (signal.aborted) {
          return;
        }
        dispatch({ type: 'od_catch', error, abort: bskyAbort });
      });

    client.com.atproto.repo
      .getRecord(
        {
          repo: did,
          collection: 'app.bsky.actor.profile',
          rkey: 'self',
        },
        { signal: bskySignal },
      )
      .then((response) => {
        if (signal.aborted) {
          return;
        }
        dispatch({ type: 'bsky_resp', response });
      })
      .catch(() => {
        if (signal.aborted) {
          return;
        }
        dispatch({ type: 'bsky_catch' });
      });

    return () => {
      abort.abort();
    };
  }, [did, retryState]);

  return [
    state,
    () => {
      dispatch({ type: 'reinit' });
      retry();
    },
  ];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'od_resp': {
      const result = OrgOkazuDiaryActorProfile.validateMain(
        action.response.data.value,
      );
      if (!result.success) {
        return reducer(state, {
          type: 'od_catch',
          error: result.error,
          abort: action.abort,
        });
      }
      return {
        status: 'resolved',
        value: {
          displayName: result.value.displayName,
          description: result.value.description,
          website: result.value.website,
          avatar: result.value.avatar,
          labels: result.value.labels,
          createdAt: result.value.createdAt,
          hasBskyProfile: state.status === 'pending' && !!state.value,
        },
      };
    }
    case 'od_catch':
      if (state.status !== 'pending') {
        return state;
      }
      if (
        !(
          action.error instanceof XRPCError &&
          action.error.error === 'RecordNotFound'
        )
      ) {
        console.log(action.error);
        action.abort.abort();
        return { status: 'error', error: action.error };
      }
      if (state.value) {
        // Fall back on bsky profile if already resolved.
        return {
          status: 'resolved',
          value: profileFromBsky(state.value),
        };
      } else if (state.value !== null) {
        // Pending on bsky profile.
        return {
          status: 'pending',
          value: null,
        };
      } else {
        return {
          status: 'error',
          error: new Error('Profile not found in repository'),
        };
      }
    case 'bsky_resp':
      switch (state.status) {
        case 'pending': {
          const result = AppBskyActorProfile.validateMain(
            action.response.data.value,
          );
          if (result.success) {
            if (state.value === null) {
              // Okazu-Diary.org profile is missing; falling back on the bsky profile.
              return {
                status: 'resolved',
                value: profileFromBsky(result.value),
              };
            } else {
              // Pending on Okazu-Diary.org profile
              return {
                status: 'pending',
                value: result.value,
              };
            }
          } else {
            return state;
          }
        }
        case 'resolved':
          return {
            status: 'resolved',
            value: {
              ...state.value,
              hasBskyProfile: true,
            },
          };
        default:
          return state;
      }
    case 'bsky_catch':
      if (state.status !== 'pending') {
        return state;
      }
      if (state.value === null) {
        return {
          status: 'error',
          error: new Error('Profile not found in repository'),
        };
      }
      return {
        status: 'pending',
        value: null,
      };
    case 'reinit': {
      const error = state.status === 'error' ? state.error : null;
      return { status: 'pending', value: undefined, error };
    }
  }
}

function profileFromBsky(profile: AppBskyActorProfile.Main): Profile {
  return {
    displayName: profile.displayName,
    description: profile.description,
    website: profile.website,
    avatar: profile.avatar,
    hasBskyProfile: true,
    // Explicitly ignoring `labels` and `createdAt` values from bsky profiles.
  };
}
