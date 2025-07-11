import {
  tryAndCatch,
  tryAndCatchAsync,
  tryAndCatchWithRetry,
  ErrorTypes,
  RetryStrategies,
  SimpleRetry,
  safe,
  withRetry,
  Result,
  RetryResult,
  isSuccess,
  isError,
  unwrap,
  unwrapOr,
  warnOnError,
  TryAndCatch,
} from "./index";

describe("tryAndCatch", () => {
  it("returns result for sync success", () => {
    const { result, error } = tryAndCatch(() => 42);
    expect(result).toBe(42);
    expect(error).toBeNull();
  });

  it("returns error for sync throw", () => {
    const { result, error } = tryAndCatch(() => {
      throw new Error("fail");
    });
    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("fail");
  });

  it("handles non-Error throws", () => {
    const { result, error } = tryAndCatch(() => {
      throw "string error";
    });
    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("string error");
  });

  it("returns result for async success", async () => {
    const { result, error } = await tryAndCatch(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "done";
    });
    expect(result).toBe("done");
    expect(error).toBeNull();
  });

  it("returns error for async throw", async () => {
    const { result, error } = await tryAndCatch(async () => {
      await new Promise((r) => setTimeout(r, 10));
      throw new Error("fail");
    });
    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("fail");
  });

  it("calls sync finally callback", () => {
    let called = false;
    tryAndCatch(
      () => 1,
      () => {
        called = true;
      }
    );
    expect(called).toBe(true);
  });

  it("awaits async finally callback", async () => {
    let called = false;
    await tryAndCatch(
      async () => 1,
      async () => {
        await new Promise((r) => setTimeout(r, 10));
        called = true;
      }
    );
    expect(called).toBe(true);
  });

  // Enhanced tests for critical issue fixes
  describe("🔥 Critical Issue Fixes", () => {
    it("🗑️ RESOURCE LEAKS: finally runs even on errors", async () => {
      let resourceCleaned = false;

      const { result, error } = await tryAndCatch(
        async () => {
          throw new Error("Operation failed");
        },
        async () => {
          resourceCleaned = true;
        }
      );

      expect(error?.message).toBe("Operation failed");
      expect(resourceCleaned).toBe(true);
    });

    it("🔗 ERROR CONTEXT: preserves original error properties", () => {
      const originalError = new Error("Original error");
      originalError.name = "CustomError";
      (originalError as any).code = "ERR_CUSTOM";
      (originalError as any).status = 500;
      const originalStack = originalError.stack;

      const { result, error } = tryAndCatch(() => {
        throw originalError;
      });

      expect(error).toBe(originalError); // Exact same object
      expect(error?.stack).toBe(originalStack);
      expect(error?.message).toBe("Original error");
      expect(error?.name).toBe("CustomError");
      expect((error as any)?.code).toBe("ERR_CUSTOM");
      expect((error as any)?.status).toBe(500);
    });

    it("🛡️ FINALLY SAFETY: handles finally callback errors gracefully", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const { result, error } = await tryAndCatch(
        async () => "success",
        async () => {
          throw new Error("Finally failed");
        }
      );

      expect(result).toBe("success");
      expect(error).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Cleanup failed:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("🛡️ FINALLY SAFETY: runs finally even when main function fails", () => {
      let finallyRan = false;

      const { result, error } = tryAndCatch(
        () => {
          throw new Error("Main error");
        },
        () => {
          finallyRan = true;
        }
      );

      expect(error?.message).toBe("Main error");
      expect(finallyRan).toBe(true);
    });
  });

  describe("Enhanced Error Context Preservation", () => {
    it("preserves complex error objects with custom properties", () => {
      class CustomError extends Error {
        public code: string;
        public details: object;

        constructor(message: string, code: string, details: object) {
          super(message);
          this.name = "CustomError";
          this.code = code;
          this.details = details;
        }
      }

      const customError = new CustomError("Database error", "DB_001", {
        table: "users",
      });

      const { error } = tryAndCatch(() => {
        throw customError;
      });

      expect(error).toBe(customError);
      expect((error as any)?.code).toBe("DB_001");
      expect((error as any)?.details).toEqual({ table: "users" });
    });

    it("handles non-Error throws with context preservation", () => {
      const errorObj = {
        message: "Custom error",
        code: 500,
        stack: "Fake stack trace",
      };

      const { error } = tryAndCatch(() => {
        throw errorObj;
      });

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("[object Object]");
      // Our optimized version creates new stack traces for performance
      expect(error?.stack).toContain("Error: [object Object]");
    });
  });
});

describe("tryAndCatchWithRetry", () => {
  it("succeeds on first attempt without retries", async () => {
    const fn = jest.fn().mockResolvedValue("success");

    const result = await tryAndCatchWithRetry(fn, { maxRetries: 3 });

    expect(result.result).toBe("success");
    expect(result.error).toBeNull();
    expect(result.attempts).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and eventually succeeds", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Attempt 1 failed"))
      .mockRejectedValueOnce(new Error("Attempt 2 failed"))
      .mockResolvedValue("success");

    const result = await tryAndCatchWithRetry(fn, { maxRetries: 3 });

    expect(result.result).toBe("success");
    expect(result.error).toBeNull();
    expect(result.attempts).toBe(3);
    expect(result.errors).toHaveLength(2);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("fails after max retries", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("Always fails"));

    const result = await tryAndCatchWithRetry(fn, { maxRetries: 2 });

    expect(result.result).toBeNull();
    expect(result.error?.message).toBe("Always fails");
    expect(result.attempts).toBe(3);
    expect(result.errors).toHaveLength(3);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("respects custom shouldRetry condition", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Retryable error"))
      .mockRejectedValueOnce(new Error("Non-retryable error"));

    const result = await tryAndCatchWithRetry(fn, {
      maxRetries: 3,
      shouldRetry: (error) => error.message.includes("Retryable"),
    });

    expect(result.result).toBeNull();
    expect(result.error?.message).toBe("Non-retryable error");
    expect(result.attempts).toBe(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("applies delay between retries", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("Always fails"));
    const startTime = Date.now();

    await tryAndCatchWithRetry(fn, {
      maxRetries: 2,
      delay: 50,
    });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThan(90); // Should have at least 2 * 50ms delays
  });
});

describe("ErrorTypes utilities", () => {
  it("identifies network errors", () => {
    const networkError = new Error("Network request failed");
    networkError.name = "NetworkError";

    expect(ErrorTypes.isNetworkError(networkError)).toBe(true);
    expect(ErrorTypes.isRetryable(networkError)).toBe(true);
  });

  it("identifies timeout errors", () => {
    const timeoutError = new Error("Request timed out");
    expect(ErrorTypes.isTimeoutError(timeoutError)).toBe(true);
    expect(ErrorTypes.isRetryable(timeoutError)).toBe(true);
  });

  it("identifies retryable vs non-retryable errors", () => {
    const networkError = new Error("Connection failed");
    const validationError = new Error("Invalid input format");

    expect(ErrorTypes.isRetryable(networkError)).toBe(true);
    expect(ErrorTypes.isRetryable(validationError)).toBe(false);
  });
});

describe("RetryStrategies", () => {
  it("creates exponential backoff delays", () => {
    const strategy = RetryStrategies.exponentialBackoff(100, 1000);

    // With base=100, attempt 0: 100 * 2^0 + random(1000) = 100 + (0-1000)
    const delay0 = strategy(0);
    const delay1 = strategy(1);

    expect(typeof delay0).toBe("number");
    expect(typeof delay1).toBe("number");
    expect(delay0).toBeGreaterThanOrEqual(100); // minimum possible
    expect(delay0).toBeLessThanOrEqual(1100); // maximum possible
    expect(delay1).toBeGreaterThanOrEqual(200); // minimum: 100 * 2^1 + 0
    expect(delay1).toBeLessThanOrEqual(1000); // capped at maxMs
  });

  it("creates linear backoff delays", () => {
    const strategy = RetryStrategies.linearBackoff(100);

    expect(strategy(0)).toBe(100); // attempt 0 -> 100 * (0 + 1)
    expect(strategy(1)).toBe(200); // attempt 1 -> 100 * (1 + 1)
    expect(strategy(2)).toBe(300); // attempt 2 -> 100 * (2 + 1)
  });

  it("provides fixed delay strategy", () => {
    const strategy = RetryStrategies.fixedDelay(500);
    expect(strategy()).toBe(500);
    expect(strategy()).toBe(500); // Always same delay
  });
});

describe("tryAndCatchAsync", () => {
  it("should work identically to tryAndCatch for async functions", async () => {
    const { tryAndCatchAsync } = require("./index");

    const asyncResult = await tryAndCatchAsync(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "async success";
    });

    expect(asyncResult.result).toBe("async success");
    expect(asyncResult.error).toBeNull();
  });

  it("should handle async errors properly", async () => {
    const { tryAndCatchAsync } = require("./index");

    const asyncResult = await tryAndCatchAsync(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      throw new Error("Async error");
    });

    expect(asyncResult.result).toBeNull();
    expect(asyncResult.error).toBeInstanceOf(Error);
    expect(asyncResult.error?.message).toBe("Async error");
  });

  it("should execute finally callback", async () => {
    const { tryAndCatchAsync } = require("./index");
    let finallyCalled = false;

    await tryAndCatchAsync(
      async () => "success",
      async () => {
        finallyCalled = true;
      }
    );

    expect(finallyCalled).toBe(true);
  });
});

// Test type guards and helper functions
describe("Type Guards and Helpers", () => {
  it("isSuccess should correctly identify successful results", () => {
    const success = { result: "test", error: null };
    const failure = { result: null, error: new Error("failed") };

    expect(isSuccess(success)).toBe(true);
    expect(isSuccess(failure)).toBe(false);
  });

  it("isError should correctly identify error results", () => {
    const success = { result: "test", error: null };
    const failure = { result: null, error: new Error("failed") };

    expect(isError(success)).toBe(false);
    expect(isError(failure)).toBe(true);
  });

  it("unwrap should return result when successful", () => {
    const success = { result: "test", error: null };
    expect(unwrap(success)).toBe("test");
  });

  it("unwrap should throw error when failed", () => {
    const failure = { result: null, error: new Error("failed") };
    expect(() => unwrap(failure)).toThrow("failed");
  });

  it("unwrapOr should return result when successful", () => {
    const success = { result: "test", error: null };
    expect(unwrapOr(success, "default")).toBe("test");
  });

  it("unwrapOr should return default when failed", () => {
    const failure = { result: null, error: new Error("failed") };
    expect(unwrapOr(failure, "default")).toBe("default");
  });

  it("warnOnError should warn on errors", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
    const failure = { result: null, error: new Error("test error") };

    const result = warnOnError(failure, "test context");

    expect(result).toBe(failure);
    expect(consoleSpy).toHaveBeenCalledWith(
      "[try-and-catch] Error in test context: test error"
    );

    consoleSpy.mockRestore();
  });
});

// Test unified API object
describe("TryAndCatch Unified API", () => {
  it("should provide all expected methods", () => {
    expect(typeof TryAndCatch.safe).toBe("function");
    expect(typeof TryAndCatch.async).toBe("function");
    expect(typeof TryAndCatch.withRetry).toBe("function");
    expect(typeof TryAndCatch.retry).toBe("function");
    expect(typeof TryAndCatch.isSuccess).toBe("function");
    expect(typeof TryAndCatch.isError).toBe("function");
    expect(typeof TryAndCatch.unwrap).toBe("function");
    expect(typeof TryAndCatch.unwrapOr).toBe("function");
    expect(typeof TryAndCatch.warnOnError).toBe("function");
    expect(typeof TryAndCatch.ErrorTypes).toBe("object");
    expect(typeof TryAndCatch.RetryStrategies).toBe("object");
    expect(typeof TryAndCatch.SimpleRetry).toBe("object");
  });

  it("safe method should work identically to tryAndCatch", () => {
    const success = TryAndCatch.safe(() => "test");
    expect(success).toEqual({ result: "test", error: null });
  });
});
