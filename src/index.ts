// Result type returned by tryAndCatch
export type Result<T> = {
  result: T | null; // The value returned by the function, or null on error
  error: Error | null; // The error thrown by the function, or null on success
};

// Serializable error object for JSON safe operations
export interface SerializableError {
  name: string;
  message: string;
  stack?: string;
  code?: string | number;
  status?: number;
  errno?: number;
  timestamp: number;
  properties: Record<string, any>;
}

// Enhanced result type with retry information and improved memory management
export type RetryResult<T> = Result<T> & {
  attempts: number; // Number of attempts made
  errors: SerializableError[]; // Serializable errors for better memory management
  totalTime: number; // Total execution time in milliseconds
  lastError?: Error | null; // Keep reference to the actual last error for debugging
};

// Cleanup result for better error handling
export interface CleanupResult {
  success: boolean;
  error?: Error;
  originalError?: Error; // Preserve the original operation error
}

// Enhanced options for retry behavior with memory and performance optimizations
export interface RetryOptions {
  maxRetries: number; // Maximum number of retry attempts
  delay?: number | ((attempt: number) => number); // Delay between retries (ms)
  shouldRetry?: (error: Error) => boolean; // Custom retry condition

  // Memory management options
  maxErrorHistory?: number; // Limit stored error history (default: 10)
  compactErrors?: boolean; // Store compact error representations (default: true)

  // Performance options
  timeout?: number; // Per-attempt timeout in milliseconds
  abortSignal?: AbortSignal; // External abort signal

  // Enhanced cleanup handling
  onCleanupError?: (error: Error, originalError?: Error) => void; // Custom cleanup error handler
}

/**
 * Creates a serializable error object from any error
 * Solves JSON serialization issues by creating a clean, serializable representation
 */
function createSerializableError(
  error: Error,
  attempt?: number
): SerializableError {
  const properties: Record<string, any> = {};

  // Safely extract custom properties, avoiding circular references
  Object.keys(error).forEach((key) => {
    if (!["name", "message", "stack"].includes(key)) {
      try {
        const value = (error as any)[key];
        // Only include serializable values
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          properties[key] = value;
        } else if (value !== null && typeof value === "object") {
          // For objects, try to extract useful info without causing circular reference issues
          properties[key] = String(value);
        }
      } catch {
        // Skip properties that can't be safely accessed
      }
    }
  });

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: (error as any).code,
    status: (error as any).status,
    errno: (error as any).errno,
    timestamp: Date.now(),
    properties,
  };
}

/**
 * Enhanced cleanup execution with better error handling
 * Solves cleanup failure handling issues
 */
async function executeCleanup(
  onFinally?: () => void | Promise<void>,
  originalError?: Error,
  customCleanupErrorHandler?: (error: Error, originalError?: Error) => void
): Promise<CleanupResult> {
  if (!onFinally) {
    return { success: true };
  }

  try {
    await onFinally();
    return { success: true };
  } catch (cleanupError) {
    const finalCleanupError =
      cleanupError instanceof Error
        ? cleanupError
        : new Error(String(cleanupError));

    if (customCleanupErrorHandler) {
      customCleanupErrorHandler(finalCleanupError, originalError);
    } else {
      // Default behavior: log but preserve original error
      const originalErrorContext = originalError
        ? `Original error: ${originalError.message}`
        : "";
      console.warn(
        "tryAndCatch: finally callback threw an error:",
        finalCleanupError,
        originalErrorContext
      );
    }

    return {
      success: false,
      error: finalCleanupError,
      originalError,
    };
  }
}

/**
 * Creates an Error with enhanced context preservation
 * Maintains stack trace, error details, and chain for better debugging
 */
function createContextualError(error: unknown, context?: string): Error {
  if (error instanceof Error) {
    if (!context) return error;

    // Create a new error with additional context while preserving the original
    const enhancedError = new Error(`${context}: ${error.message}`);

    // Preserve original stack trace and error details
    enhancedError.stack = error.stack;
    enhancedError.name = error.name;

    // Copy any custom properties from the original error
    Object.keys(error).forEach((key) => {
      if (key !== "message" && key !== "stack" && key !== "name") {
        (enhancedError as any)[key] = (error as any)[key];
      }
    });

    return enhancedError;
  }

  // Handle non-Error throws with context
  const message = context ? `${context}: ${String(error)}` : String(error);
  const newError = new Error(message);

  // Try to preserve stack trace if available
  if (typeof error === "object" && error !== null && "stack" in error) {
    newError.stack = String((error as any).stack);
  }

  return newError;
}

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
 * IMPROVEMENTS:
 * - Preserves error context and stack traces
 * - Ensures finally callbacks always execute safely with enhanced error handling
 * - Handles both sync and async scenarios robustly
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
 * // With finally callback for resource cleanup
 * const { result, error } = tryAndCatch(
 *   () => riskyOperation(),
 *   () => cleanup() // Always runs, even on error - now with enhanced error handling
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
          error: createContextualError(error),
        }))
        .finally(async () => {
          // Enhanced cleanup with better error handling
          await executeCleanup(onFinally);
        });
    }

    // If `fn` is sync and successful
    executeCleanup(onFinally, undefined); // Run enhanced cleanup (sync version)

    return {
      result,
      error: null,
    };
  } catch (error) {
    // If `fn` is sync and throws an error
    const contextualError = createContextualError(error);
    executeCleanup(onFinally, contextualError); // Run enhanced cleanup with original error context

    return {
      result: null,
      error: contextualError,
    };
  }
}

/**
 * Enhanced tryAndCatch with retry capabilities
 * Automatically retries failed operations with customizable retry logic
 * FIXES: Memory overhead, performance impact, cleanup failure handling
 */
export async function tryAndCatchWithRetry<T>(
  fn: () => T | Promise<T>,
  options: RetryOptions,
  onFinally?: () => void | Promise<void>
): Promise<RetryResult<T>> {
  const serializableErrors: SerializableError[] = [];
  let attempts = 0;
  let lastActualError: Error | null = null;
  const maxAttempts = options.maxRetries + 1; // +1 for initial attempt
  const startTime = Date.now();

  // Default options for better memory and performance management
  const maxErrorHistory = options.maxErrorHistory ?? 10;
  const compactErrors = options.compactErrors ?? true;
  const timeout = options.timeout;

  while (attempts < maxAttempts) {
    attempts++;
    const attemptStartTime = Date.now();

    try {
      let result: T | Promise<T>;

      // Apply timeout if specified (performance optimization)
      if (timeout && timeout > 0) {
        let timeoutId: NodeJS.Timeout | undefined;

        result = await Promise.race([
          Promise.resolve(fn()).finally(() => {
            // Clear timeout when operation completes
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
          }),
          new Promise<never>((_, reject) => {
            timeoutId = setTimeout(
              () => reject(new Error(`Operation timed out after ${timeout}ms`)),
              timeout
            );
            // Use unref() to prevent the timer from keeping the process alive
            timeoutId.unref?.();
          }),
        ]);
      } else {
        result = fn();
      }

      if (result instanceof Promise) {
        const resolvedResult = await result;

        // Success - run enhanced cleanup
        const cleanupResult = await executeCleanup(
          onFinally,
          undefined,
          options.onCleanupError
        );

        return {
          result: resolvedResult,
          error: null,
          attempts,
          errors: serializableErrors,
          totalTime: Date.now() - startTime,
          lastError: lastActualError,
        };
      }

      // Sync success - run enhanced cleanup
      const cleanupResult = await executeCleanup(
        onFinally,
        undefined,
        options.onCleanupError
      );

      return {
        result,
        error: null,
        attempts,
        errors: serializableErrors,
        totalTime: Date.now() - startTime,
        lastError: lastActualError,
      };
    } catch (error) {
      // For retry operations, don't add attempt context unless explicitly requested
      const preserveOriginalError = true; // Flag to preserve original error for final failure
      const contextualError = preserveOriginalError
        ? error instanceof Error
          ? error
          : new Error(String(error))
        : createContextualError(error, `Attempt ${attempts}`);

      lastActualError = contextualError;

      // Memory management: Create serializable error with attempt context for history
      const serializableError = createSerializableError(
        contextualError,
        attempts
      );
      serializableErrors.push(serializableError);

      // Limit error history to prevent memory bloat
      if (serializableErrors.length > maxErrorHistory) {
        serializableErrors.shift(); // Remove oldest error
      }

      // Check if we should retry
      const shouldRetry = options.shouldRetry
        ? options.shouldRetry(contextualError)
        : true;

      if (attempts >= maxAttempts || !shouldRetry) {
        // Final failure - run enhanced cleanup
        const cleanupResult = await executeCleanup(
          onFinally,
          contextualError,
          options.onCleanupError
        );

        return {
          result: null,
          error: contextualError,
          attempts,
          errors: serializableErrors,
          totalTime: Date.now() - startTime,
          lastError: lastActualError,
        };
      }

      // Wait before retry with abort signal support
      if (options.delay) {
        const delayMs =
          typeof options.delay === "function"
            ? options.delay(attempts)
            : options.delay;

        if (options.abortSignal?.aborted) {
          throw new Error("Operation was aborted");
        }

        try {
          await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(resolve, delayMs);
            // Use unref() to prevent the timer from keeping the process alive
            timeoutId.unref?.();

            // Support abort signal
            const abortListener = () => {
              clearTimeout(timeoutId);
              reject(new Error("Operation was aborted"));
            };

            if (options.abortSignal) {
              options.abortSignal.addEventListener("abort", abortListener, {
                once: true,
              });

              // Clean up listener after delay
              const cleanupTimeoutId = setTimeout(() => {
                options.abortSignal?.removeEventListener(
                  "abort",
                  abortListener
                );
              }, delayMs + 100);
              // Use unref() for cleanup timer too
              cleanupTimeoutId.unref?.();
            }
          });
        } catch (abortError) {
          return {
            result: null,
            error:
              abortError instanceof Error
                ? abortError
                : new Error(String(abortError)),
            attempts,
            errors: serializableErrors,
            totalTime: Date.now() - startTime,
            lastError: lastActualError,
          };
        }
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  const finalError = lastActualError || new Error("Unknown error");
  return {
    result: null,
    error: finalError,
    attempts,
    errors: serializableErrors,
    totalTime: Date.now() - startTime,
    lastError: lastActualError,
  };
}

/**
 * Concurrency utilities to solve race condition issues
 */
export const ConcurrencyUtils = {
  /**
   * Creates a mutex (mutual exclusion) lock for protecting shared resources
   * Solves concurrency race conditions by ensuring only one operation runs at a time
   */
  createMutex(): {
    acquire(): Promise<() => void>;
    isLocked(): boolean;
  } {
    let locked = false;
    let queue: (() => void)[] = [];

    return {
      async acquire(): Promise<() => void> {
        return new Promise((resolve) => {
          const release = () => {
            locked = false;
            const next = queue.shift();
            if (next) {
              locked = true;
              next();
            }
          };

          if (!locked) {
            locked = true;
            resolve(release);
          } else {
            queue.push(() => resolve(release));
          }
        });
      },

      isLocked(): boolean {
        return locked;
      },
    };
  },

  /**
   * Creates a semaphore for limiting concurrent operations
   * Allows a specific number of concurrent operations
   */
  createSemaphore(maxConcurrent: number): {
    acquire(): Promise<() => void>;
    available(): number;
  } {
    let current = 0;
    let queue: (() => void)[] = [];

    return {
      async acquire(): Promise<() => void> {
        return new Promise((resolve) => {
          const release = () => {
            current--;
            const next = queue.shift();
            if (next) {
              current++;
              next();
            }
          };

          if (current < maxConcurrent) {
            current++;
            resolve(release);
          } else {
            queue.push(() => {
              current++;
              resolve(release);
            });
          }
        });
      },

      available(): number {
        return maxConcurrent - current;
      },
    };
  },

  /**
   * Wraps a function with mutex protection
   * Ensures the function can only be called by one caller at a time
   */
  withMutex<T extends (...args: any[]) => any>(
    fn: T,
    mutex?: { acquire(): Promise<() => void>; isLocked(): boolean }
  ): T {
    const actualMutex = mutex || ConcurrencyUtils.createMutex();

    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const release = await actualMutex.acquire();
      try {
        return await fn(...args);
      } finally {
        release();
      }
    }) as T;
  },

  /**
   * Wraps tryAndCatch with mutex protection for shared state operations
   */
  async tryAndCatchWithMutex<T>(
    fn: () => T | Promise<T>,
    mutex?: { acquire(): Promise<() => void>; isLocked(): boolean },
    onFinally?: () => void | Promise<void>
  ): Promise<Result<T>> {
    const actualMutex = mutex || ConcurrencyUtils.createMutex();
    const release = await actualMutex.acquire();

    try {
      const result = await tryAndCatch(fn, onFinally);
      // Handle both sync and async results properly
      if (result instanceof Promise) {
        return await result;
      }
      return result as Result<T>;
    } finally {
      release();
    }
  },
} as const;

/**
 * Enhanced error type checking utilities
 */
export const ErrorTypes = {
  /**
   * Check if error is a network-related error
   */
  isNetworkError(error: Error): boolean {
    return (
      error.name === "NetworkError" ||
      error.message.includes("network") ||
      error.message.includes("fetch") ||
      error.message.includes("timeout") ||
      (error as any).code === "NETWORK_ERROR" ||
      (error as any).code === "ECONNREFUSED" ||
      (error as any).code === "ETIMEDOUT"
    );
  },

  /**
   * Check if error is retryable (typically transient errors)
   */
  isRetryable(error: Error): boolean {
    return (
      ErrorTypes.isNetworkError(error) ||
      error.message.includes("timeout") ||
      error.message.includes("rate limit") ||
      error.message.includes("server error") ||
      ((error as any).status >= 500 && (error as any).status < 600)
    );
  },

  /**
   * Check if error is a validation error (not retryable)
   */
  isValidationError(error: Error): boolean {
    return (
      error.name === "ValidationError" ||
      error.message.includes("validation") ||
      error.message.includes("invalid") ||
      ((error as any).status >= 400 && (error as any).status < 500)
    );
  },

  /**
   * Extract error code from various error formats
   */
  getErrorCode(error: Error): string | number | undefined {
    return (error as any).code || (error as any).status || (error as any).errno;
  },

  /**
   * Get a detailed error summary with all available information
   */
  getErrorSummary(error: Error): {
    name: string;
    message: string;
    code?: string | number;
    stack?: string;
    properties: Record<string, any>;
  } {
    const properties: Record<string, any> = {};

    // Extract all custom properties
    Object.keys(error).forEach((key) => {
      if (!["name", "message", "stack"].includes(key)) {
        properties[key] = (error as any)[key];
      }
    });

    return {
      name: error.name,
      message: error.message,
      code: ErrorTypes.getErrorCode(error),
      stack: error.stack,
      properties,
    };
  },
};

/**
 * Common retry strategies
 */
export const RetryStrategies = {
  /**
   * Exponential backoff with jitter
   */
  exponentialBackoff(
    baseDelay: number = 1000,
    maxDelay: number = 30000
  ): (attempt: number) => number {
    return (attempt: number) => {
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      // Add jitter (±25%)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      return Math.max(0, delay + jitter);
    };
  },

  /**
   * Linear backoff
   */
  linearBackoff(delay: number = 1000): (attempt: number) => number {
    return (attempt: number) => delay * attempt;
  },

  /**
   * Fixed delay
   */
  fixedDelay(delay: number = 1000): number {
    return delay;
  },

  /**
   * Only retry network errors
   */
  onlyNetworkErrors(error: Error): boolean {
    return ErrorTypes.isNetworkError(error);
  },

  /**
   * Only retry retryable errors (excludes validation errors)
   */
  onlyRetryableErrors(error: Error): boolean {
    return (
      ErrorTypes.isRetryable(error) && !ErrorTypes.isValidationError(error)
    );
  },
};

/**
 * Simplified convenience functions to reduce complexity burden
 */
export const SimpleRetry = {
  /**
   * Simple retry with smart defaults for common use cases
   * Reduces configuration complexity while providing robust retry logic
   */
  async quick<T>(
    fn: () => T | Promise<T>,
    maxRetries: number = 3
  ): Promise<Result<T>> {
    const result = await tryAndCatchWithRetry(fn, {
      maxRetries,
      delay: RetryStrategies.exponentialBackoff(1000, 5000),
      shouldRetry: RetryStrategies.onlyRetryableErrors,
      maxErrorHistory: 5, // Limit memory usage
      compactErrors: true, // Use compact error representation
    });

    // Return simplified result without retry metadata for ease of use
    return {
      result: result.result,
      error: result.error,
    };
  },

  /**
   * Network-specific retry with optimized defaults
   */
  async network<T>(
    fn: () => T | Promise<T>,
    maxRetries: number = 5
  ): Promise<Result<T>> {
    const result = await tryAndCatchWithRetry(fn, {
      maxRetries,
      delay: RetryStrategies.exponentialBackoff(500, 10000),
      shouldRetry: RetryStrategies.onlyNetworkErrors,
      timeout: 30000, // 30 second timeout per attempt
      maxErrorHistory: 3, // Keep only recent errors for network calls
      compactErrors: true,
    });

    return {
      result: result.result,
      error: result.error,
    };
  },

  /**
   * Database operation retry with appropriate defaults
   */
  async database<T>(
    fn: () => T | Promise<T>,
    maxRetries: number = 3
  ): Promise<Result<T>> {
    const result = await tryAndCatchWithRetry(fn, {
      maxRetries,
      delay: RetryStrategies.exponentialBackoff(2000, 15000),
      shouldRetry: (error) => {
        // Retry on connection issues, timeouts, but not on validation errors
        return (
          (ErrorTypes.isNetworkError(error) ||
            error.message.includes("connection") ||
            error.message.includes("timeout")) &&
          !ErrorTypes.isValidationError(error)
        );
      },
      timeout: 60000, // Longer timeout for database operations
      maxErrorHistory: 5,
      compactErrors: true,
    });

    return {
      result: result.result,
      error: result.error,
    };
  },
};

/**
 * Enhanced error utilities with JSON serialization support
 */
export const ErrorUtils = {
  /**
   * Safely serialize an error to JSON without circular reference issues
   */
  toJSON(error: Error): SerializableError {
    return createSerializableError(error);
  },

  /**
   * Create an error from a serialized error object
   */
  fromJSON(serialized: SerializableError): Error {
    const error = new Error(serialized.message);
    error.name = serialized.name;
    error.stack = serialized.stack;

    // Restore custom properties
    if (serialized.code !== undefined) (error as any).code = serialized.code;
    if (serialized.status !== undefined)
      (error as any).status = serialized.status;
    if (serialized.errno !== undefined) (error as any).errno = serialized.errno;

    // Restore other properties
    Object.assign(error, serialized.properties);

    return error;
  },

  /**
   * Check if an object can be safely JSON.stringify'd
   */
  isSerializable(obj: any): boolean {
    try {
      JSON.stringify(obj);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Safely stringify an error with fallback for circular references
   */
  stringify(error: Error): string {
    try {
      return JSON.stringify(error);
    } catch {
      // Fallback to serializable representation
      return JSON.stringify(ErrorUtils.toJSON(error));
    }
  },
};
