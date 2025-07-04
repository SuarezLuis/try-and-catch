/**
 * A utility function that wraps try-catch logic and returns an object with result and error.
 * Inspired by Go's error handling pattern and Rust's Result type.
 *
 * @template TFunc - The type of the function being wrapped
 * @param fn - The function to execute safely
 * @param args - Arguments to pass to the function
 * @returns An object with result and error properties
 *
 * @example
 * ```typescript
 * // Success case - destructure with meaningful names
 * const { result: user, error: userError } = tryAndCatch(JSON.parse, '{"name": "John", "age": 30}');
 * if (userError) {
 *   console.error('Failed to parse user:', userError.message);
 *   return;
 * }
 * console.log('User loaded:', user.name);
 *
 * // Error case - handle gracefully
 * const { result: data, error: parseError } = tryAndCatch(JSON.parse, 'invalid json');
 * if (parseError) {
 *   console.error('Parse failed:', parseError.message);
 *   // Handle error or provide fallback
 * }
 *
 * // Simple destructuring
 * const { result, error } = tryAndCatch(riskyCalculation, a, b, c);
 * if (error) {
 *   return handleCalculationError(error);
 * }
 * return result;
 * ```
 */

/**
 * Success case: function executed successfully
 * Error case: function threw an error
 */
type TryAndCatchResult<TReturn> =
  | { readonly result: TReturn; readonly error: null }
  | { readonly result: undefined; readonly error: Error };

/**
 * Generic constraint for any callable function
 */
type AnyFunction = (...args: any[]) => any;

/**
 * Debug configuration interface
 */
interface DebugConfig {
  enabled: boolean;
  logSuccess?: boolean;
  logErrors?: boolean;
  logArgs?: boolean;
  logTiming?: boolean;
  prefix?: string;
}

/**
 * Internal debug state
 */
let debugConfig: DebugConfig = {
  enabled: false,
  logSuccess: true,
  logErrors: true,
  logArgs: false,
  logTiming: false,
  prefix: "[try-and-catch]",
};

/**
 * Debug logger utility
 */
const debugLog = {
  info: (message: string, ...args: any[]) => {
    if (debugConfig.enabled) {
      console.log(`${debugConfig.prefix} ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (debugConfig.enabled && debugConfig.logErrors) {
      console.error(`${debugConfig.prefix} ${message}`, ...args);
    }
  },
  success: (message: string, ...args: any[]) => {
    if (debugConfig.enabled && debugConfig.logSuccess) {
      console.log(`${debugConfig.prefix} ✅ ${message}`, ...args);
    }
  },
  timing: (message: string, time: number) => {
    if (debugConfig.enabled && debugConfig.logTiming) {
      console.log(`${debugConfig.prefix} ⏱️  ${message} (${time}ms)`);
    }
  },
};

/**
 * Safely executes a function and returns a result tuple instead of throwing
 */
const tryAndCatch = <TFunc extends AnyFunction>(
  fn: TFunc,
  ...args: Parameters<TFunc>
): TryAndCatchResult<ReturnType<TFunc>> => {
  const functionName = fn.name || "anonymous";
  // For built-in functions, try to get a better name
  const displayName =
    fn.name === "parse" && fn.constructor?.name === "Function"
      ? "JSON.parse"
      : functionName;

  const startTime =
    debugConfig.enabled && debugConfig.logTiming ? Date.now() : 0;

  if (debugConfig.enabled) {
    debugLog.info(`Executing function: ${displayName}`);
    if (debugConfig.logArgs) {
      debugLog.info("Arguments:", args);
    }
  }

  try {
    const result = fn(...args);

    if (debugConfig.enabled) {
      const endTime = debugConfig.logTiming ? Date.now() : 0;
      debugLog.success(`Function ${displayName} executed successfully`);
      if (debugConfig.logTiming) {
        debugLog.timing(
          `Function ${displayName} completed`,
          endTime - startTime
        );
      }
    }

    return { result, error: null } as const;
  } catch (error) {
    const errorObject =
      error instanceof Error ? error : new Error(String(error));

    if (debugConfig.enabled) {
      const endTime = debugConfig.logTiming ? Date.now() : 0;
      debugLog.error(
        `Function ${displayName} threw an error:`,
        errorObject.message
      );
      if (debugConfig.logTiming) {
        debugLog.timing(`Function ${displayName} failed`, endTime - startTime);
      }
    }

    return { result: undefined, error: errorObject } as const;
  }
};

/**
 * Helper function to check if a result is successful (no error)
 */
tryAndCatch.isOk = <T>(
  result: TryAndCatchResult<T>
): result is { readonly result: T; readonly error: null } => {
  return result.error === null;
};

/**
 * Helper function to check if a result is an error
 */
tryAndCatch.isError = <T>(
  result: TryAndCatchResult<T>
): result is { readonly result: undefined; readonly error: Error } => {
  return result.error !== null;
};

/**
 * Helper function to get the result value or throw if there's an error
 */
tryAndCatch.unwrap = <T>(result: TryAndCatchResult<T>): T => {
  if (tryAndCatch.isError(result)) {
    throw result.error;
  }
  return result.result;
};

/**
 * Helper function to get the result value or return a default value
 */
tryAndCatch.unwrapOr = <T>(
  result: TryAndCatchResult<T>,
  defaultValue: T
): T => {
  return tryAndCatch.isOk(result) ? result.result : defaultValue;
};

/**
 * Execute a block of code safely without needing to wrap in a function
 * This is syntactic sugar for tryAndCatch(() => { code })
 */
tryAndCatch.block = <T>(codeBlock: () => T): TryAndCatchResult<T> => {
  return tryAndCatch(codeBlock);
};

/**
 * Execute an async block of code safely
 * Returns a Promise that resolves to the result object
 */
tryAndCatch.asyncBlock = async <T>(
  codeBlock: () => Promise<T>
): Promise<TryAndCatchResult<T>> => {
  try {
    const result = await codeBlock();
    return { result, error: null } as const;
  } catch (error) {
    const errorObject =
      error instanceof Error ? error : new Error(String(error));
    return { result: undefined, error: errorObject } as const;
  }
};

/**
 * Enable debug mode with optional configuration
 */
tryAndCatch.enableDebug = (config: Partial<DebugConfig> = {}) => {
  debugConfig = {
    ...debugConfig,
    enabled: true,
    ...config,
  };
  debugLog.info("Debug mode enabled", debugConfig);
};

/**
 * Disable debug mode
 */
tryAndCatch.disableDebug = () => {
  const wasEnabled = debugConfig.enabled;
  debugConfig.enabled = false;
  if (wasEnabled) {
    console.log(`${debugConfig.prefix} Debug mode disabled`);
  }
};

/**
 * Get current debug configuration
 */
tryAndCatch.getDebugConfig = (): DebugConfig => {
  return { ...debugConfig };
};

/**
 * Configure specific debug options
 */
tryAndCatch.configureDebug = (config: Partial<DebugConfig>) => {
  if (!debugConfig.enabled) {
    console.warn(
      `${debugConfig.prefix} Debug mode is not enabled. Call enableDebug() first.`
    );
    return;
  }
  debugConfig = { ...debugConfig, ...config };
  debugLog.info("Debug configuration updated", debugConfig);
};

export = tryAndCatch;
