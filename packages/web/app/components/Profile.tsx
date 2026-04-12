import type { BlobRef } from '@atproto/api';
import ProfileAvatar from './ProfileAvatar';
import * as ProfileState from '~/state/profile';

interface ProfileProps {
  did: string;
  profileState: ProfileState.State;
  handle: string | undefined;
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
            <AvatarAndName repo={did} name="profile-name" />
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
    <div style={{ display: 'flex', gap: '12px' }}>
      <ProfileAvatar
        repo={repo}
        blob={blob}
        size={80}
        aria-labelledby={name && 'profile-name'}
      />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {name !== undefined && (
          <h1 id="profile-name" style={{ marginBlock: 'auto' }}>
            {name}
          </h1>
        )}
        {
          <p style={{ color: '#444' }}>
            {handle ? `@${handle}` : '(Invalid handle!)'}
          </p>
        }
      </div>
    </div>
  );
}
