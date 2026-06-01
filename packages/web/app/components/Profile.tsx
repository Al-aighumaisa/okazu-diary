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
            <AvatarAndName handle={handle} url={url} />
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
      const lang = profile?.lang ?? '';
      return (
        <div>
          <AvatarAndName
            repo={did}
            blob={profile?.avatar}
            handle={handle}
            name={profile?.displayName ?? null}
            lang={lang}
            url={url}
          />
          {profile?.description !== undefined && (
            <p lang={lang}>{profile.description}</p>
          )}
          {profile?.website && (
            <p className={styles.website}>
              <link rel="me" href={profile.website} />
              <a className="anchor" rel="me" href={profile.website}>
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
  lang,
  url,
}: {
  repo?: string | undefined;
  blob?: BlobRef | null | undefined;
  handle: string | undefined;
  name?: string | null;
  lang?: string;
  url: string | undefined;
}): React.ReactNode {
  let avatarLabelledBy;
  let avatarAlt;
  let avatarLang;
  if (name) {
    avatarLabelledBy = 'profile-name';
    avatarLang = lang;
  } else if (handle && handle !== 'handle.invalid') {
    avatarLabelledBy = 'profile-handle';
    avatarLang = '';
  } else {
    avatarAlt = 'Avatar';
    avatarLang = 'en';
  }

  const content = (
    <>
      <ProfileAvatar
        repo={repo}
        blob={blob}
        size={80}
        lang={avatarLang}
        aria-labelledby={avatarLabelledBy}
        alt={avatarAlt}
      />
      <div>
        {name === undefined ? (
          <Skeleton
            containerClassName={styles.profileName}
            style={{ inlineSize: '20em' }}
          />
        ) : (
          name && (
            <h1 id="profile-name" lang={lang} className={styles.profileName}>
              {name}
            </h1>
          )
        )}
        <p id="profile-handle" className={styles.profileHandle}>
          {handle === 'handle.invalid' ? (
            <span lang="zxx">{repo}</span>
          ) : handle ? (
            <span lang="">{`@${handle}`}</span>
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
