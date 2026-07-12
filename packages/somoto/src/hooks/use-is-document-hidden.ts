import { createEffect, createSignal } from 'solid-js';

export const useIsDocumentHidden = () => {
  const [isDocumentHidden, setIsDocumentHidden] = createSignal(document?.hidden);

  createEffect(
    () => {
      // Compute phase: no reactive reads needed, just triggers setup
      return undefined;
    },
    () => {
      // Apply phase: set up event listener
      const callback = () => {
        setIsDocumentHidden(document.hidden);
      };
      document.addEventListener('visibilitychange', callback);
      return () => {
        document.removeEventListener('visibilitychange', callback);
      };
    },
  );

  return isDocumentHidden;
};
