import storage_ from 'local-storage-fallback';
import { type default as React, useEffect, useRef, useState } from 'react';

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
  const [open, setOpen] = useState<boolean>();
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
      // The dialog is open by default for noscript compat, but that's forced to be non-modal.
      // So re-open it as modal if JS is available.
      // It shouldn't cause flashing because the dialog is hidden until `open` is initialized.
      dialogRef.current?.close();
      dialogRef.current?.showModal();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, []);

  function confirmAge(): void {
    storage.setItem('adult', '1');
    dialogRef.current?.close();
    setOpen(false);
  }

  const id = 'age-gate';
  const headingId = 'age-gate-heading';
  const descId = 'age-gate-description';

  return (
    <>
      <meta name="rating" content="adult" />
      <dialog
        id={id}
        ref={dialogRef}
        className={`${styles.ageGate} noscript-force`}
        closedby="none"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descId}
        // Open by default for noscript compat, but hidden until initialized if JS is available to
        // avoid flashing. The `.noscript-force` rule overrides the `hidden` attr in noscript mode.
        open={open !== false}
        hidden={open === undefined}
      >
        {/* Polyfill `::backdrop` here because we cannot use real one in noscript mode. (Well,
          precisely speaking, we *could* with Invoker Commands, but that needs a user interaction
          while we want to display the dialog by default. */}
        <div className={styles.dialogBackdrop} />
        <div className={styles.dialogContent}>
          {dismissed ? (
            <>
              <h1 id={headingId}>Sorry</h1>
              <p id={descId}>
                This site is for adult only. Come back when you are OK with
                mature content.
              </p>
              <div className={styles.buttonsContainer}>
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
              <form
                className={styles.buttonsContainer}
                method="dialog"
                onSubmit={confirmAge}
              >
                <button
                  className="no-noscript"
                  onClick={() => setDismissed(true)}
                >
                  No, I am under 18 years old
                </button>
                <button type="submit">I am over 18 years old - Enter</button>
              </form>
            </>
          )}
        </div>
      </dialog>
      <div className={styles.ageGated}>{children}</div>
    </>
  );
}
