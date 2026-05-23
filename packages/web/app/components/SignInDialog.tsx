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
    const current = dialogRef.current;
    if (current) {
      setOpen(current.open);
    }
    // It is the caller's responsibility to keep `setOpen` static just like any other set functions.
  }, []);

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
          // @ts-expect-error
          commandfor={id}
          command="close"
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
      {!error || (
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        <p className="error">{String(error)}</p>
      )}
    </dialog>
  );
}
