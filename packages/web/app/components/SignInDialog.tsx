import { type default as React, useEffect, useRef, useState } from 'react';

import { primary_did } from '~/config';
import type { SignInFunction } from '~/contexts/OAuthContext';
import styles from './SignInDialog.module.css';

export interface SignInDialogProps {
  id: string;
  openState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
  isLoading: boolean;
  signIn: SignInFunction;
}

export default function SignInDialog({
  id,
  openState,
  isLoading,
  signIn,
}: SignInDialogProps): React.ReactNode {
  const [open, setOpen] = openState;
  const [error, setError] = useState<unknown>();

  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  useEffect(() => {
    const current = dialogRef.current;
    if (current) {
      const listener = () => setOpen(false);
      current.addEventListener('close', listener);
      return () => current.removeEventListener('close', listener);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogRef]);

  return (
    <dialog
      id={id}
      className={styles.signIn}
      aria-modal="true"
      aria-labelledby="sign-in-dialog-heading"
      ref={dialogRef}
    >
      <header>
        <h2 id="sign-in-dialog-heading">Sign in with Atmosphere</h2>
        <button
          className="appearance-none"
          aria-label="Close"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          signIn(
            (e.target.elements.namedItem('identifier')! as HTMLInputElement)
              .value,
          ).catch(setError);
        }}
      >
        <label>
          <span>AT identifier</span>
          <input
            type="text"
            name="identifier"
            required
            readOnly={primary_did !== undefined}
            defaultValue={primary_did}
            autoComplete="username"
          />
        </label>
        <input type="submit" value="Continue" disabled={isLoading} />
      </form>
      {!error || <p className="error">{String(error)}</p>}
    </dialog>
  );
}
