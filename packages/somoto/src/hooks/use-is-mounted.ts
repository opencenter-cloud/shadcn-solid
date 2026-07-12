import { createSignal, onSettled } from 'solid-js';

export const useIsMounted = () => {
  const [isMounted, setIsMounted] = createSignal(false);
  onSettled(() => {
    setIsMounted(true);
  });
  return isMounted;
};
