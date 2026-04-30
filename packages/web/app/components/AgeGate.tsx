import storage from 'local-storage-fallback';
import type React from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import styles from './AgeGate.module.css';

export default function AgeGate({
  children,
}: React.PropsWithChildren): React.ReactNode {
  const storage_ = storage.storage ?? storage;

  const [state, setState] = useState<boolean | null>(null);

  const ageGateDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const adult = storage_.getItem('adult');
    if (adult !== '1') {
      ageGateDialogRef.current?.showModal();
      setState(true);
    }
  }, []);

  function confirmAge(): void {
    storage_.setItem('adult', '1');
    ageGateDialogRef.current?.close();
    setState(true);
  }

  const headingId = useId();
  const descId = useId();

  return (
    <>
      <dialog
        ref={ageGateDialogRef}
        className={styles.dialog}
        closedby="none"
        aria-labelledby={headingId}
        aria-describedby={descId}
      >
        {state === false ? (
          <>
            <h1 id={headingId}>Sorry</h1>
            <p id={descId}>
              This site is for adult only. Come back when you are an adult.
            </p>
          </>
        ) : (
          <>
            <h1 id={headingId}>Age Verification</h1>
            <p id={descId}>
              This website contains age-restricted materials. By entering, you
              affirm that you are over the age of 18 years or over the age of
              majority in your jurisdiction, and consent to viewing sexually
              explicit content.
            </p>
            <div>
              <button onClick={() => setState(false)}>
                No, I am under 18 years old
              </button>
              <button onClick={confirmAge}>
                I am over 18 years old - Enter
              </button>
            </div>
          </>
        )}
      </dialog>
      <div>{children}</div>
    </>
  );
}
