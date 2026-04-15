import type { BlobRef } from '@atproto/api';

import * as ProfileState from '~/state/profile';
import ProfileAvatar from './ProfileAvatar';
import styles from './Profile.module.css';

interface ProfileProps {
  did: string;
  profileState: ProfileState.State;
  handle: string;
  onRetry: () => void;
}

export default function Profile({
  did,
  profileState,
  handle,
  onRetry,
}: ProfileProps): React.ReactNode {
  let pending;
  switch (profileState.status) {
    case 'pending':
      if (!profileState.error) {
        return (
          <>
            <AvatarAndName repo={did} name="Loading…" />
          </>
        );
      }
      pending = true;
    // Fall through
    case 'error':
      return (
        <>
          <p style={{ color: '#F00' }}>{`${profileState.error}`}</p>
          <button onClick={onRetry} disabled={pending}>
            Retry
          </button>
        </>
      );
    case 'resolved': {
      const profile = profileState.value;
      return (
        <>
          <AvatarAndName
            repo={did}
            blob={profile.avatar}
            handle={handle}
            name={profile.displayName}
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
  repo: string;
  blob?: BlobRef | undefined;
  handle?: string | undefined;
  name: string | undefined;
}): React.ReactNode {
  return (
    <div className={styles.avatarName}>
      <ProfileAvatar
        repo={repo}
        blob={blob}
        size={80}
        aria-labelledby={name && 'profile-name'}
      />
      <div>
        {name !== undefined && <h1 id="profile-name">{name}</h1>}
        {handle && (
          <p>
            {handle === 'handle.invalid' ? '(Invalid handle!)' : `@${handle}`}
          </p>
        )}
      </div>
    </div>
  );
}
