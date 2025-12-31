import storage from 'local-storage-fallback';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';

export default function AgeGate({
  children,
}: React.PropsWithChildren): React.ReactNode {
  const storage_ = storage.storage ?? storage;

  const [state, setState] = useState<boolean | null>(null);

  const ageGateDialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const adult = storage_.getItem('adult');
    console.log(adult);
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

  return (
    <>
      <style>{`
        @scope {
          :scope > dialog::backdrop {
            backdrop-filter: blur(50px) brightness(.5);
          }
        }
      `}</style>
      <dialog ref={ageGateDialogRef}>
        {state === false ? (
          <>
            <h1>Sorry</h1>
            <p>This site is for adult only. Come back when you are an adult.</p>
          </>
        ) : (
          <>
            <h1>Age Verification</h1>
            <p>
              This website contains age-restricted materials. By entering, you
              affirm that you are are over the age of 18 years or over the age
              of majority in your jurisdiction, and consent to viewing sexually
              explicit content.
            </p>
            <button onClick={() => setState(false)}>
              No, I am under 18 years old
            </button>
            <button onClick={confirmAge}>I am over 18 years old - Enter</button>
          </>
        )}
      </dialog>
      <div>{children}</div>
    </>
  );
}
