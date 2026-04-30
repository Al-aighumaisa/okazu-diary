import type { BlobRef } from '@atproto/api';
import Skeleton from 'react-loading-skeleton';

import * as profileHook from '~/state/profile';
import ProfileAvatar from './ProfileAvatar';
import styles from './Profile.module.css';

interface ProfileProps {
  did: string | undefined;
  profileRes: profileHook.HookResponse | undefined;
  handle: string | undefined;
}

export default function Profile(props: {
  [P in keyof ProfileProps]: undefined;
}): React.ReactNode;
export default function Profile(props: ProfileProps): React.ReactNode;
export default function Profile({
  did,
  profileRes,
  handle,
}: {
  [P in keyof ProfileProps]?: ProfileProps[P] | undefined;
} = {}): React.ReactNode {
  let pending;
  switch (profileRes?.state.status) {
    case 'pending':
    case undefined:
      if (!profileRes?.state.error) {
        return (
          <>
            <AvatarAndName repo={undefined} handle={handle} name={undefined} />
            <Skeleton style={{ inlineSize: '40em' }} />
            <Skeleton style={{ inlineSize: '40em' }} />
          </>
        );
      }
      pending = true;
    // Fall through
    case 'error':
      return (
        <>
          <p style={{ color: '#F00' }}>{`${profileState.error}`}</p>
          <button onClick={profileRes.retry} disabled={pending}>
            Retry
          </button>
        </>
      );
    case 'resolved': {
      const profile = profileRes.state.value;
      return (
        <>
          <AvatarAndName
            repo={did}
            blob={profile.avatar}
            handle={handle}
            name={profile.displayName ?? null}
          />
          {profile.description !== undefined && <p>{profile.description}</p>}
          {profile.website && (
            <p className={styles.website}>
              <link rel="me" href={profile.website} />
              <a rel="me" href={profile.website}>
                {profile.website}
              </a>
            </p>
          )}
        </>
      );
    }
  }
}

function AvatarAndName({
  repo,
  blob,
  handle,
  name,
}: {
  repo: string | undefined;
  blob?: BlobRef | undefined;
  handle?: string | undefined;
  name: string | null | undefined;
}): React.ReactNode {
  return (
    <div className={styles.avatarName}>
      <ProfileAvatar
        repo={repo}
        blob={blob}
        size={80}
        aria-labelledby={(name && 'profile-name') || undefined}
      />
      <div>
        {name === undefined ? (
          <Skeleton
            containerClassName={styles.profileName}
            style={{ inlineSize: '20em' }}
          />
        ) : (
          name !== null && (
            <h1 id="profile-name" className={styles.profileName}>
              {name}
            </h1>
          )
        )}
        <p className={styles.profileHandle}>
          {handle === 'handle.invalid' ? (
            '(Invalid handle!)'
          ) : handle ? (
            `@${handle}`
          ) : (
            <Skeleton />
          )}
        </p>
      </div>
    </div>
  );
}
