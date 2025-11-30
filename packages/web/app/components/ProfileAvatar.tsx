import { BlobRef } from '@atproto/api';
import type React from 'react';

interface UserAvatarProps extends React.AriaAttributes {
  repo: string;
  blob?: BlobRef | undefined;
  size: number;
}

export default function UserAvatar({
  repo,
  blob,
  size,
  ...rest
}: UserAvatarProps): React.ReactNode {
  if (blob) {
    return (
      <img
        {...rest}
        src={`https://cdn.bsky.app/img/avatar/plain/${repo}/${blob.ref}`}
        width={size}
        height={size}
      />
    );
  } else {
    // https://github.com/bluesky-social/social-app/blob/7574a74/src/view/com/util/UserAvatar.tsx#L190-L206
    return (
      <svg
        {...rest}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="none"
      >
        <circle cx="12" cy="12" r="12" fill="#0070ff" />
        <circle cx="12" cy="9.5" r="3.5" fill="#fff" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#fff"
          d="M 12.058 22.784 C 9.422 22.784 7.007 21.836 5.137 20.262 C 5.667 17.988 8.534 16.25 11.99 16.25 C 15.494 16.25 18.391 18.036 18.864 20.357 C 17.01 21.874 14.64 22.784 12.058 22.784 Z"
        />
      </svg>
    );
  }
}
