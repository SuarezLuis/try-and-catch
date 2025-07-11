// Result type returned by tryAndCatch
export type Result<T> = {
  result: T | null; // The value returned by the function, or null on error
  error: Error | null; // The error thrown by the function, or null on success
};

/**
 * Overload: Sync version
 * Allows tryAndCatch to return synchronously if `fn` is sync
 */
export function tryAndCatch<T>(fn: () => T, onFinally?: () => void): Result<T>;

/**
 * Overload: Async version
 * Returns a Promise when `fn` is async
 */
export function tryAndCatch<T>(
  fn: () => Promise<T>,
  onFinally?: () => void | Promise<void>
): Promise<Result<T>>;

/**
 * Safely executes a function and returns a result object instead of throwing.
 * Supports both synchronous and asynchronous functions with optional finally callbacks.
 *
 * @template T - The return type of the function
 * @param fn - The function to execute safely
 * @param onFinally - Optional callback to run after execution (sync or async)
 * @returns Object with result and error properties, or Promise of such object for async functions
 *
 * @example
 * ```typescript
 * // Sync usage
 * const { result, error } = tryAndCatch(() => JSON.parse('{"valid": true}'));
 *
 * // Async usage
 * const { result, error } = await tryAndCatch(async () => {
 *   const response = await fetch('/api/data');
 *   return response.json();
 * });
 *
 * // With finally callback
 * const { result, error } = tryAndCatch(
 *   () => riskyOperation(),
 *   () => cleanup()
 * );
 * ```
 */
export function tryAndCatch<T>(
  fn: () => T | Promise<T>,
  onFinally?: () => void | Promise<void>
): Result<T> | Promise<Result<T>> {
  try {
    const result = fn();

    // If `fn` is async, handle it as a Promise
    if (result instanceof Promise) {
      return result
        .then((result) => ({
          result,
          error: null,
        }))
        .catch((error) => ({
          result: null,
          error: error instanceof Error ? error : new Error(String(error)),
        }))
        .finally(() => {
          // If `onFinally` is async, wait for it
          return onFinally?.();
        });
    }

    // If `fn` is sync and successful
    onFinally?.(); // Don't await here — keep it sync
    return {
      result,
      error: null,
    };
  } catch (error) {
    // If `fn` is sync and throws an error
    onFinally?.(); // Still run `onFinally`
    return {
      result: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
