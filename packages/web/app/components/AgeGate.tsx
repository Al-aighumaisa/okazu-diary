import storage_ from 'local-storage-fallback';
import {
  type default as React,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';

import styles from './AgeGate.module.css';

// XXX: The `Storage` object is exported as `storage.storage` rather than being default-exported
// on SSR, whereas on CSR it is default exported but `storage.storage` is `undefined` in exchange.
const storage =
  // @ts-expect-error
  (storage_.storage as Storage | StorageFallback) ??
  //
  storage_;

export default function AgeGate({
  children,
}: React.PropsWithChildren): React.ReactNode {
  const [init, setInit] = useState<true | undefined>();
  const [dismissed, setDismissed] = useState<boolean>();

  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (
      storage.getItem('adult') !== '1' &&
      // Let crawlers in. Showing the content to search engines should be fine since they should
      // understand that the page is adult-only by the `<meta>` tag below.
      // This may let in kids with a non-browser user-agent string, but they could just outright lie
      // to the age gate dialog, so it is no use assuming the risk of bypass by UA spoofing.
      // Or what if the user were browsing with an exotic UA without the intention of bypass? Well,
      // that's an extreme case and it should be fair to treat a user who pretends to be a
      // non-browser as a non-browser.
      navigator.userAgent.startsWith('Mozilla/')
    ) {
      dialogRef.current?.showModal();
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInit(true);
  }, []);

  function confirmAge(): void {
    storage.setItem('adult', '1');
    dialogRef.current?.close();
  }

  const headingId = useId();
  const descId = useId();

  return (
    <>
      <meta name="rating" content="adult" />
      <dialog
        ref={dialogRef}
        className={styles.ageGate}
        closedby="none"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descId}
        // Indicate whether the initial `useEffect` has completed so that the content can be styled
        // to be hidden until the dialog is initialized, just to be sure.
        data-init={init}
      >
        {dismissed ? (
          <>
            <h1 id={headingId}>Sorry</h1>
            <p id={descId}>
              This site is for adult only. Come back when you are OK with mature
              content.
            </p>
            <div>
              <button onClick={() => setDismissed(false)}>Go back</button>
            </div>
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
              <button onClick={() => setDismissed(true)}>
                No, I am under 18 years old
              </button>
              <button onClick={confirmAge}>
                I am over 18 years old - Enter
              </button>
            </div>
          </>
        )}
      </dialog>
      {children}
    </>
  );
}
