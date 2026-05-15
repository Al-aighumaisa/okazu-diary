import type { BlobRef } from '@atproto/api';
import type React from 'react';
import Skeleton from 'react-loading-skeleton';
import { Link } from 'react-router';

import type { UseDeferredQueryErrorResult } from '~/lib/useDeferredQueryError';
import type { UseProfileQueryValue } from '~/queries/profile';
import ProfileAvatar from './ProfileAvatar';
import styles from './Profile.module.css';

interface ProfileProps {
  did: string | undefined;
  profileQuery:
    | UseDeferredQueryErrorResult<UseProfileQueryValue | null>
    | undefined;
  handle: string | undefined;
  url?: string | undefined;
}

export default function Profile(props: ProfileProps): React.ReactNode;
export default function Profile(props: {
  [P in keyof ProfileProps]: undefined;
}): React.ReactNode;
export default function Profile({
  did,
  profileQuery,
  handle,
  url,
}: {
  [P in keyof ProfileProps]?: ProfileProps[P] | undefined;
} = {}): React.ReactNode {
  let pending;
  switch (profileQuery?.status) {
    case 'pending':
    case undefined:
      if (!profileQuery?.error) {
        return (
          <div aria-busy="true">
            <AvatarAndName
              repo={undefined}
              handle={handle}
              name={undefined}
              url={url}
            />
            <Skeleton style={{ inlineSize: '40em' }} />
            <Skeleton style={{ inlineSize: '40em' }} />
          </div>
        );
      }
      pending = true;
    // Fall through
    case 'error':
      return (
        <div>
          <p className="error">{String(profileQuery.error)}</p>
          <button
            onClick={() => void profileQuery.refetch()}
            disabled={pending}
          >
            Retry
          </button>
        </div>
      );
    case 'success': {
      const profile = profileQuery.data;
      return (
        <div>
          <AvatarAndName
            repo={did}
            blob={profile?.avatar}
            handle={handle}
            name={profile?.displayName ?? null}
            url={url}
          />
          {profile?.description !== undefined && <p>{profile.description}</p>}
          {profile?.website && (
            <p className={styles.website}>
              <link rel="me" href={profile.website} />
              <a rel="me" href={profile.website}>
                {profile.website}
              </a>
            </p>
          )}
        </div>
      );
    }
  }
}

function AvatarAndName({
  repo,
  blob,
  handle,
  name,
  url,
}: {
  repo: string | undefined;
  blob?: BlobRef | null | undefined;
  handle?: string | undefined;
  name: string | null | undefined;
  url?: string | undefined;
}): React.ReactNode {
  const content = (
    <>
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
    </>
  );

  return url === undefined ? (
    <div className={styles.avatarName}>{content}</div>
  ) : (
    <Link to={url} className={styles.avatarName}>
      {content}
    </Link>
  );
}
