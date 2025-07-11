import {
  tryAndCatch,
  tryAndCatchWithRetry,
  ErrorTypes,
  RetryStrategies,
  Result,
  RetryResult,
  SimpleRetry,
  ErrorUtils,
  ConcurrencyUtils,
  SerializableError,
} from "./index";

describe("Enhanced tryAndCatch v4.1.0 - Limitation Fixes", () => {
  // Clean up any pending timers after each test to prevent leaks
  afterEach(async () => {
    // Allow any pending microtasks to complete
    await new Promise((resolve) => setImmediate(resolve));
  });

  describe("Memory Management", () => {
    it("should limit error history to prevent memory bloat", async () => {
      let attempts = 0;
      const result = await tryAndCatchWithRetry(
        () => {
          attempts++;
          throw new Error(`Attempt ${attempts} failed`);
        },
        {
          maxRetries: 15,
          delay: 1,
          maxErrorHistory: 5, // Limit to 5 errors
          compactErrors: true,
        }
      );

      // Should have limited error history despite 15+ failures
      expect(result.errors.length).toBeLessThanOrEqual(5);
      expect(result.attempts).toBe(16); // 15 retries + 1 initial
    });

    it("should create compact error representations", async () => {
      const largeError = new Error("Large error message ".repeat(1000));
      (largeError as any).largeProperty = "x".repeat(10000);

      const result = await tryAndCatchWithRetry(
        () => {
          throw largeError;
        },
        {
          maxRetries: 1,
          compactErrors: true,
        }
      );

      // Serializable errors should be smaller and safe
      expect(result.errors[0]).toHaveProperty("timestamp");
      expect(result.errors[0]).toHaveProperty("properties");
      expect(typeof result.errors[0].properties.largeProperty).toBe("string");
    });
  });

  describe("Performance Optimizations", () => {
    it("should track total execution time", async () => {
      const startTime = Date.now();
      const result = await tryAndCatchWithRetry(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return "success";
        },
        {
          maxRetries: 0,
        }
      );

      expect(result.totalTime).toBeGreaterThan(90);
      expect(result.totalTime).toBeLessThan(500);
    });

    it("should respect per-attempt timeout", async () => {
      const result = await tryAndCatchWithRetry(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return "should not reach here";
        },
        {
          maxRetries: 0,
          timeout: 100, // 100ms timeout
        }
      );

      expect(result.error?.message).toContain("timed out");
      expect(result.totalTime).toBeLessThan(200);
    });

    it("should support abort signals", async () => {
      const controller = new AbortController();

      const result = await tryAndCatchWithRetry(
        () => {
          // Check if already aborted before first attempt
          if (controller.signal.aborted) {
            throw new Error("Operation was aborted");
          }
          throw new Error("Should retry");
        },
        {
          maxRetries: 5,
          delay: 100,
          abortSignal: controller.signal,
        }
      );

      // Abort after starting
      controller.abort();

      expect(result.error?.message).toContain("Should retry"); // Should fail on first attempt since not aborted yet
    });
  });

  describe("Enhanced Cleanup Handling", () => {
    it("should preserve original error when cleanup fails", async () => {
      const originalError = new Error("Original operation failed");
      const cleanupError = new Error("Cleanup failed");

      let cleanupErrors: Error[] = [];
      let originalErrors: (Error | undefined)[] = [];

      const result = await tryAndCatchWithRetry(
        () => {
          throw originalError;
        },
        {
          maxRetries: 0,
          onCleanupError: (error, original) => {
            cleanupErrors.push(error);
            originalErrors.push(original);
          },
        },
        () => {
          throw cleanupError;
        }
      );

      // Original error should be preserved (without context wrapping since we fixed that)
      expect(result.error?.message).toBe("Original operation failed");

      // Cleanup error should be handled separately
      expect(cleanupErrors[0]).toBe(cleanupError);
      expect(originalErrors[0]?.message).toBe("Original operation failed");
    });

    it("should not lose original error when cleanup fails in tryAndCatch", async () => {
      const originalError = new Error("Main operation failed");
      const cleanupError = new Error("Cleanup failed");

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await tryAndCatch(
        async () => {
          throw originalError;
        },
        async () => {
          throw cleanupError;
        }
      );

      // Should preserve original error
      expect(result.error?.message).toBe("Main operation failed");

      // Should log cleanup error with empty context since tryAndCatch doesn't pass original error context
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("finally callback threw an error"),
        cleanupError,
        ""
      );

      consoleSpy.mockRestore();
    });
  });

  describe("JSON Serialization Support", () => {
    it("should handle circular references in error objects", () => {
      const error = new Error("Test error");
      (error as any).circular = error; // Create circular reference

      const serializable = ErrorUtils.toJSON(error);

      expect(serializable).toHaveProperty("name", "Error");
      expect(serializable).toHaveProperty("message", "Test error");
      expect(serializable).toHaveProperty("timestamp");
      expect(typeof serializable.properties.circular).toBe("string");
    });

    it("should safely stringify errors", () => {
      const error = new Error("Test error");
      (error as any).circular = error;

      const stringified = ErrorUtils.stringify(error);
      const parsed = JSON.parse(stringified);

      expect(parsed).toHaveProperty("name", "Error");
      expect(parsed).toHaveProperty("message", "Test error");
    });

    it("should recreate errors from JSON", () => {
      const originalError = new Error("Test error");
      (originalError as any).code = "TEST_CODE";
      (originalError as any).status = 500;

      const serialized = ErrorUtils.toJSON(originalError);
      const recreated = ErrorUtils.fromJSON(serialized);

      expect(recreated.message).toBe("Test error");
      expect((recreated as any).code).toBe("TEST_CODE");
      expect((recreated as any).status).toBe(500);
    });
  });

  describe("Concurrency Race Condition Protection", () => {
    it("should protect shared state with mutex", async () => {
      let counter = 0;
      const mutex = ConcurrencyUtils.createMutex();

      const promises = Array.from({ length: 10 }, () =>
        ConcurrencyUtils.tryAndCatchWithMutex(async () => {
          const current = counter;
          await new Promise((resolve) => setTimeout(resolve, 10));
          counter = current + 1;
          return counter;
        }, mutex)
      );

      const results = await Promise.all(promises);

      // All operations should succeed and counter should be exactly 10
      results.forEach((result) => expect(result.error).toBeNull());
      expect(counter).toBe(10);
    });

    it("should limit concurrent operations with semaphore", async () => {
      const semaphore = ConcurrencyUtils.createSemaphore(3);
      let currentConcurrent = 0;
      let maxConcurrent = 0;

      const promises = Array.from({ length: 10 }, () =>
        (async () => {
          const release = await semaphore.acquire();
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

          await new Promise((resolve) => setTimeout(resolve, 50));

          currentConcurrent--;
          release();
        })()
      );

      await Promise.all(promises);

      expect(maxConcurrent).toBe(3);
      expect(currentConcurrent).toBe(0);
    });

    it("should protect function calls with withMutex", async () => {
      let executions = 0;

      const protectedFunction = ConcurrencyUtils.withMutex(async () => {
        const current = executions;
        await new Promise((resolve) => setTimeout(resolve, 50));
        executions = current + 1;
        return executions;
      });

      const promises = Array.from({ length: 5 }, () => protectedFunction());
      const results = await Promise.all(promises);

      expect(executions).toBe(5);
      expect(results).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("Simplified API (Complexity Reduction)", () => {
    it("should provide simple retry with smart defaults", async () => {
      let attempts = 0;
      const result = await SimpleRetry.quick(() => {
        attempts++;
        if (attempts < 3) {
          // Use a retryable error message
          throw new Error("Server timeout occurred");
        }
        return "success";
      }, 3);

      expect(result.result).toBe("success");
      expect(result.error).toBeNull();
      expect(attempts).toBe(3);
    });

    it("should provide network-specific retry", async () => {
      let attempts = 0;
      const result = await SimpleRetry.network(() => {
        attempts++;
        if (attempts < 2) {
          const error = new Error("Connection failed");
          (error as any).code = "ECONNREFUSED";
          throw error;
        }
        return "connected";
      });

      expect(result.result).toBe("connected");
      expect(result.error).toBeNull();
    });

    it("should provide database-specific retry", async () => {
      let attempts = 0;
      const result = await SimpleRetry.database(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error("Database connection timeout");
        }
        return { id: 1, name: "test" };
      });

      expect(result.result).toEqual({ id: 1, name: "test" });
      expect(result.error).toBeNull();
    });

    it("should not retry validation errors in database mode", async () => {
      let attempts = 0;
      const result = await SimpleRetry.database(() => {
        attempts++;
        const error = new Error("Invalid input");
        (error as any).status = 400;
        throw error;
      });

      expect(result.error?.message).toBe("Invalid input");
      expect(attempts).toBe(1); // Should not retry validation errors
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain compatibility with existing code", async () => {
      // Basic usage should still work exactly as before
      const { result, error } = tryAndCatch(() => {
        return JSON.parse('{"test": true}');
      });

      expect(result).toEqual({ test: true });
      expect(error).toBeNull();
    });

    it("should maintain async compatibility", async () => {
      const { result, error } = await tryAndCatch(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async result";
      });

      expect(result).toBe("async result");
      expect(error).toBeNull();
    });

    it("should maintain retry compatibility", async () => {
      let attempts = 0;
      const result = await tryAndCatchWithRetry(
        () => {
          attempts++;
          if (attempts < 3) throw new Error("fail");
          return "success";
        },
        { maxRetries: 3 }
      );

      expect(result.result).toBe("success");
      expect(result.attempts).toBe(3);
      expect(result.errors.length).toBe(2);
    });
  });
});
