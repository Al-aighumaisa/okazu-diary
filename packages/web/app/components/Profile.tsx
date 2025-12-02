import {
  AppBskyActorProfile,
  AtpBaseClient,
  ComAtprotoRepoGetRecord,
} from '@atproto/api';
import { XRPCError } from '@atproto/xrpc';
import { OrgOkazuDiaryActorProfile } from 'node_modules/@okazu-diary/api';
import React, { useEffect, useReducer } from 'react';

import ProfileAvatar from './ProfileAvatar';

interface ProfileProps {
  did: string;
  client: AtpBaseClient;
}

type State =
  | {
      status: 'pending';
      profile: undefined | AppBskyActorProfile.Main | null;
    }
  | { status: 'resolved'; profile: ProfileRepr }
  | { status: 'error'; error: unknown };

type ProfileRepr = (
  | OrgOkazuDiaryActorProfile.Main
  | AppBskyActorProfile.Main
) & {
  hasBskyProfile: boolean;
};

type Action =
  | {
      type: 'okazu_diary_response';
      response: ComAtprotoRepoGetRecord.Response;
      abort: AbortController;
    }
  | { type: 'okazu_diary_catch'; error: unknown; abort: AbortController }
  | { type: 'bsky_response'; response: ComAtprotoRepoGetRecord.Response }
  | { type: 'bsky_catch' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'okazu_diary_response': {
      const result = OrgOkazuDiaryActorProfile.validateMain(
        action.response.data.value,
      );
      if (result.success) {
        return {
          status: 'resolved',
          profile: {
            ...result.value,
            hasBskyProfile: !!(state.status === 'pending' && state.profile),
          },
        };
      } else {
        return reducer(state, {
          type: 'okazu_diary_catch',
          error: result.error,
          abort: action.abort,
        });
      }
    }
    case 'okazu_diary_catch':
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
      if (state.profile) {
        // Fall back on bsky profile if already resolved.
        return {
          status: 'resolved',
          profile: { ...state.profile, hasBskyProfile: false },
        };
      } else if (state.profile !== null) {
        // Pending on bsky profile.
        return {
          status: 'pending',
          profile: null,
        };
      } else {
        return {
          status: 'error',
          error: new Error('Profile not found in repository'),
        };
      }
    case 'bsky_response':
      switch (state.status) {
        case 'pending': {
          const result = AppBskyActorProfile.validateMain(
            action.response.data.value,
          );
          if (result.success) {
            if (state.profile === null) {
              // Okazu-Diary.org profile is missing; falling back on the bsky profile.
              return {
                status: 'resolved',
                profile: {
                  ...result.value,
                  hasBskyProfile: true,
                },
              };
            } else {
              // Pending on Okazu-Diary.org profile
              return {
                status: 'pending',
                profile: result.value,
              };
            }
          } else {
            return state;
          }
        }
        case 'resolved':
          return {
            status: 'resolved',
            profile: {
              ...state.profile,
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
      if (state.profile === null) {
        return {
          status: 'error',
          error: new Error('Profile not found in repository'),
        };
      }
      return {
        status: 'pending',
        profile: null,
      };
  }
}

export default function Profile({
  did,
  client,
}: ProfileProps): React.ReactNode {
  const [state, dispatch] = useReducer(reducer, {
    status: 'pending',
    profile: undefined,
  });

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
        dispatch({ type: 'okazu_diary_response', response, abort: bskyAbort });
      })
      .catch((error) => {
        if (signal.aborted) {
          return;
        }
        dispatch({ type: 'okazu_diary_catch', error, abort: bskyAbort });
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
        dispatch({ type: 'bsky_response', response });
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
  }, [did, client]);

  switch (state.status) {
    case 'pending':
      return (
        <header>
          <ProfileAvatar repo={did} size={120} aria-labelledby="profile-name" />
          <h1 id="profile-name">Loading…</h1>
        </header>
      );
    case 'resolved': {
      const profile = state.profile;
      return (
        <header>
          <ProfileAvatar
            repo={did}
            size={120}
            blob={profile.avatar}
            aria-labelledby={profile.displayName && 'profile-name'}
          />
          {profile.displayName !== undefined && <h1>{profile.displayName}</h1>}
          {profile.description !== undefined && <p>{profile.description}</p>}
        </header>
      );
    }
    case 'error':
      return (
        <header>
          <p style={{ color: '#F00' }}>{`${state.error}`}</p>
        </header>
      );
  }
}
