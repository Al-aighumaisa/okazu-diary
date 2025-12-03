import ProfileAvatar from './ProfileAvatar';
import * as ProfileState from '~/state/profile';

interface ProfileProps {
  did: string;
  profileState: ProfileState.State;
  onRetry: () => void;
}

export default function Profile({
  did,
  profileState,
  onRetry,
}: ProfileProps): React.ReactNode {
  let pending;
  switch (profileState.status) {
    case 'pending':
      if (!profileState.error) {
        return (
          <header>
            <ProfileAvatar
              repo={did}
              size={120}
              aria-labelledby="profile-name"
            />
            <h1 id="profile-name">Loading…</h1>
          </header>
        );
      }
      pending = true;
    // Fall through
    case 'error':
      return (
        <header>
          <p style={{ color: '#F00' }}>{`${profileState.error}`}</p>
          <button onClick={onRetry} disabled={pending}>
            Retry
          </button>
        </header>
      );
    case 'resolved': {
      const profile = profileState.value;
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
  }
}
