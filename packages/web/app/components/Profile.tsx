import ProfileAvatar from './ProfileAvatar';
import * as ProfileState from '~/state/profile';

interface ProfileProps {
  did: string;
  profileState: ProfileState.State;
}

export default function Profile({
  did,
  profileState,
}: ProfileProps): React.ReactNode {
  switch (profileState.status) {
    case 'pending':
      return (
        <header>
          <ProfileAvatar repo={did} size={120} aria-labelledby="profile-name" />
          <h1 id="profile-name">Loading…</h1>
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
    case 'error':
      return (
        <header>
          <p style={{ color: '#F00' }}>{`${profileState.value}`}</p>
        </header>
      );
  }
}
