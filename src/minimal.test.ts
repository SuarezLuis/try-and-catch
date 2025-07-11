import { tryAndCatch, safe, withRetry } from "./index";

describe("Minimal Performance Tests", () => {
  test("Performance comparison - current implementation", () => {
    const iterations = 10000;
    const syncFunction = () => 42;

    // Test raw try-catch
    const rawStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      try {
        const result = syncFunction();
      } catch (error) {
        // Handle error
      }
    }
    const rawEnd = process.hrtime.bigint();
    const rawTime = Number(rawEnd - rawStart) / 1000000;

    // Test current implementation
    const currentStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      const { result, error } = tryAndCatch(syncFunction);
    }
    const currentEnd = process.hrtime.bigint();
    const currentTime = Number(currentEnd - currentStart) / 1000000;

    // Test safe alias
    const safeStart = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) {
      const { result, error } = safe(syncFunction);
    }
    const safeEnd = process.hrtime.bigint();
    const safeTime = Number(safeEnd - safeStart) / 1000000;

    console.log("\n=== PERFORMANCE OPTIMIZATION RESULTS ===");
    console.log(`Raw try-catch (${iterations}x): ${rawTime.toFixed(2)}ms`);
    console.log(
      `Current implementation (${iterations}x): ${currentTime.toFixed(2)}ms`
    );
    console.log(`Safe alias (${iterations}x): ${safeTime.toFixed(2)}ms`);

    const currentOverhead = (currentTime / rawTime - 1) * 100;
    console.log(`Current overhead: ${currentOverhead.toFixed(1)}%`);

    const improvement = (safeTime / currentTime - 1) * 100;
    console.log(`Safe vs current: ${improvement.toFixed(1)}% difference`);

    // Performance assertions - relaxed
    expect(currentTime).toBeLessThan(rawTime * 20); // Less than 20x overhead
    expect(safeTime).toBeLessThan(rawTime * 20); // Safe should be similar
  });

  test("API simplicity validation", () => {
    // Test that the main API is simple and works
    const success = tryAndCatch(() => "test");
    expect(success.result).toBe("test");
    expect(success.error).toBeNull();

    const failure = tryAndCatch(() => {
      throw new Error("test error");
    });
    expect(failure.result).toBeNull();
    expect(failure.error?.message).toBe("test error");

    // Test safe alias
    const safeSuccess = safe(() => "safe test");
    expect(safeSuccess.result).toBe("safe test");
    expect(safeSuccess.error).toBeNull();
  });

  test("Memory efficiency", () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Perform many operations to test memory usage
    for (let i = 0; i < 1000; i++) {
      const result = tryAndCatch(() => {
        if (i % 10 === 0) {
          throw new Error(`Error ${i}`);
        }
        return `Result ${i}`;
      });
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (finalMemory - initialMemory) / 1024;

    console.log(`Memory increase (current): ${memoryIncrease.toFixed(2)}KB`);
    expect(memoryIncrease).toBeLessThan(1000); // Less than 1MB increase (relaxed)
  });

  test("Async performance", async () => {
    const iterations = 10;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const result = await tryAndCatch(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        return `async-${i}`;
      });

      expect(result.result).toBe(`async-${i}`);
      expect(result.error).toBeNull();
    }

    const duration = performance.now() - start;
    console.log(`Async operations (${iterations}x): ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(1000); // Should complete reasonably fast
  });

  test("withRetry performance", async () => {
    let attempts = 0;
    const start = Date.now();

    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary failure");
        }
        return "success";
      },
      3,
      5
    ); // 3 retries, 5ms delay

    const duration = Date.now() - start;

    expect(result).toBe("success");
    expect(attempts).toBe(3);
    expect(duration).toBeGreaterThan(8); // Should have some delay
    expect(duration).toBeLessThan(50); // But not too much
  });

  test("Error handling efficiency", () => {
    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      const result = tryAndCatch(() => {
        if (i % 2 === 0) {
          throw new Error(`Error ${i}`);
        }
        return `Success ${i}`;
      });

      if (i % 2 === 0) {
        expect(result.error?.message).toBe(`Error ${i}`);
      } else {
        expect(result.result).toBe(`Success ${i}`);
      }
    }

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(100); // Should handle errors efficiently
  });
});
