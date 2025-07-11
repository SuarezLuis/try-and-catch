import {
  tryAndCatch,
  tryAndCatchWithRetry,
  ErrorTypes,
  RetryStrategies,
  Result,
  RetryResult,
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
        "tryAndCatch: finally callback threw an error:",
        expect.any(Error),
        ""
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
      expect(error?.stack).toBe("Fake stack trace");
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

  it("identifies validation errors", () => {
    const validationError = new Error("Invalid input");
    (validationError as any).status = 400;

    expect(ErrorTypes.isValidationError(validationError)).toBe(true);
    expect(ErrorTypes.isRetryable(validationError)).toBe(false);
  });

  it("extracts error codes", () => {
    const error = new Error("Test error");
    (error as any).code = "ERR_001";

    expect(ErrorTypes.getErrorCode(error)).toBe("ERR_001");
  });

  it("provides detailed error summary", () => {
    const error = new Error("Test error");
    error.name = "TestError";
    (error as any).code = "TEST_001";
    (error as any).details = { context: "test" };

    const summary = ErrorTypes.getErrorSummary(error);

    expect(summary.name).toBe("TestError");
    expect(summary.message).toBe("Test error");
    expect(summary.code).toBe("TEST_001");
    expect(summary.properties.details).toEqual({ context: "test" });
  });
});

describe("RetryStrategies", () => {
  it("creates exponential backoff delays", () => {
    const strategy = RetryStrategies.exponentialBackoff(100, 1000);

    const delay1 = strategy(1);
    const delay2 = strategy(2);
    const delay3 = strategy(3);

    expect(delay1).toBeGreaterThanOrEqual(75); // 100 ± 25%
    expect(delay1).toBeLessThanOrEqual(125);
    expect(delay2).toBeGreaterThan(delay1);
    expect(delay3).toBeGreaterThan(delay2);
  });

  it("creates linear backoff delays", () => {
    const strategy = RetryStrategies.linearBackoff(100);

    expect(strategy(1)).toBe(100);
    expect(strategy(2)).toBe(200);
    expect(strategy(3)).toBe(300);
  });

  it("filters retryable errors", () => {
    const networkError = new Error("Network timeout");
    const validationError = new Error("Invalid input");
    (validationError as any).status = 400;

    expect(RetryStrategies.onlyRetryableErrors(networkError)).toBe(true);
    expect(RetryStrategies.onlyRetryableErrors(validationError)).toBe(false);
  });
});
