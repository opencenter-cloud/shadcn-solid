/**
 * Creates a pausable/resumable timer.
 * In Solid 2, cleanup is managed by the caller (returned from effect apply phase).
 * This primitive returns a `clearTimer` function for explicit cleanup.
 */
export const createTimer = (ms: number, onTimeout: () => void) => {
  let closeTimerStartTime = 0;
  let lastCloseTimerStartTime = 0;
  let timeoutId: ReturnType<typeof setTimeout>;
  let remainingTime = ms;

  const pauseTimer = () => {
    if (lastCloseTimerStartTime < closeTimerStartTime) {
      const elapsedTime = Date.now() - closeTimerStartTime;
      remainingTime = remainingTime - elapsedTime;
    }

    lastCloseTimerStartTime = Date.now();
  };

  const startTimer = () => {
    // setTimeout(callback, Infinity) behaves as if the delay is 0.
    if (remainingTime === Infinity) return;
    closeTimerStartTime = Date.now();
    timeoutId = setTimeout(onTimeout, remainingTime);
  };

  const clearTimer = () => clearTimeout(timeoutId);

  return {
    startTimer,
    pauseTimer,
    clearTimer,
  };
};
