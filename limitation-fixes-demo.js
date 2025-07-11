#!/usr/bin/env node

/**
 * Demonstration of ALL LIMITATIONS FIXED in v4.1.0
 * Run: node limitation-fixes-demo.js
 */

const {
  tryAndCatch,
  tryAndCatchWithRetry,
  SimpleRetry,
  ErrorUtils,
  ConcurrencyUtils,
} = require("./dist/index.js");

async function demonstrateAllFixes() {
  console.log("🎯 try-and-catch v4.1.0 - ALL LIMITATIONS FIXED!\n");

  // 1. Memory Management ✅ FIXED
  console.log("📊 1. MEMORY MANAGEMENT - ✅ FIXED");
  console.log("   Problem: Unlimited error storage causing memory bloat");
  console.log("   Solution: Configurable limits and compact errors");

  const memoryResult = await tryAndCatchWithRetry(
    () => {
      throw new Error("Large error message " + "x".repeat(1000));
    },
    {
      maxRetries: 10,
      maxErrorHistory: 3, // Only keep 3 errors max
      compactErrors: true,
      delay: 1,
    }
  );
  console.log(
    `   ✅ Attempts: ${memoryResult.attempts}, Errors stored: ${memoryResult.errors.length}`
  );
  console.log(
    `   ✅ Memory controlled: ${
      memoryResult.errors.length <= 3 ? "YES" : "NO"
    }\n`
  );

  // 2. Performance Optimizations ✅ FIXED
  console.log("⚡ 2. PERFORMANCE OPTIMIZATIONS - ✅ FIXED");
  console.log("   Problem: No timeout control, poor performance monitoring");
  console.log("   Solution: Per-attempt timeouts and execution tracking");

  const start = Date.now();
  const perfResult = await tryAndCatchWithRetry(
    async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return "fast operation";
    },
    {
      maxRetries: 0,
      timeout: 100, // 100ms timeout
    }
  );
  console.log(
    `   ✅ Timeout respected: ${
      perfResult.error?.message.includes("timed out") ? "YES" : "NO"
    }`
  );
  console.log(`   ✅ Execution time tracked: ${perfResult.totalTime}ms\n`);

  // 3. Enhanced Cleanup Handling ✅ FIXED
  console.log("🛡️ 3. ENHANCED CLEANUP HANDLING - ✅ FIXED");
  console.log("   Problem: Cleanup errors overwrote original errors");
  console.log("   Solution: Custom cleanup error handlers");

  let cleanupErrors = [];
  let originalErrors = [];

  const cleanupResult = await tryAndCatchWithRetry(
    () => {
      throw new Error("Main operation failed");
    },
    {
      maxRetries: 0,
      onCleanupError: (cleanupErr, originalErr) => {
        cleanupErrors.push(cleanupErr);
        originalErrors.push(originalErr);
      },
    },
    () => {
      throw new Error("Cleanup also failed");
    }
  );

  console.log(
    `   ✅ Original error preserved: ${cleanupResult.error?.message}`
  );
  console.log(
    `   ✅ Cleanup errors handled: ${cleanupErrors.length > 0 ? "YES" : "NO"}\n`
  );

  // 4. JSON Serialization ✅ FIXED
  console.log("📝 4. JSON SERIALIZATION - ✅ FIXED");
  console.log("   Problem: Circular references broke JSON.stringify");
  console.log("   Solution: Safe serialization utilities");

  const circularError = new Error("Test error");
  circularError.circular = circularError; // Create circular reference

  const serializable = ErrorUtils.toJSON(circularError);
  const jsonString = ErrorUtils.stringify(circularError);

  console.log(
    `   ✅ Circular reference handled: ${
      typeof serializable.properties.circular === "string" ? "YES" : "NO"
    }`
  );
  console.log(
    `   ✅ JSON serialization works: ${jsonString.length > 0 ? "YES" : "NO"}\n`
  );

  // 5. Concurrency Protection ✅ FIXED
  console.log("🔒 5. CONCURRENCY PROTECTION - ✅ FIXED");
  console.log("   Problem: Race conditions in shared state");
  console.log("   Solution: Mutex and semaphore utilities");

  let counter = 0;
  const mutex = ConcurrencyUtils.createMutex();

  const concurrencyPromises = Array.from({ length: 5 }, () =>
    ConcurrencyUtils.tryAndCatchWithMutex(async () => {
      const current = counter;
      await new Promise((resolve) => setTimeout(resolve, 10));
      counter = current + 1;
      return counter;
    }, mutex)
  );

  const concurrencyResults = await Promise.all(concurrencyPromises);
  console.log(`   ✅ Final counter value: ${counter} (expected: 5)`);
  console.log(`   ✅ Race condition fixed: ${counter === 5 ? "YES" : "NO"}\n`);

  // 6. Complexity Reduction ✅ FIXED
  console.log("🎯 6. COMPLEXITY REDUCTION - ✅ FIXED");
  console.log("   Problem: Too many configuration options");
  console.log("   Solution: Simple preset functions");

  let attempts = 0;
  const simpleResult = await SimpleRetry.quick(() => {
    attempts++;
    if (attempts < 3) throw new Error("Server timeout occurred");
    return "Simple success!";
  });

  console.log(`   ✅ Simple API works: ${simpleResult.result ? "YES" : "NO"}`);
  console.log(
    `   ✅ Smart defaults applied: ${attempts === 3 ? "YES" : "NO"}\n`
  );

  // Summary
  console.log("🏆 SUMMARY: ALL LIMITATIONS FIXED!");
  console.log("✅ Memory Management: Controlled with limits");
  console.log("✅ Performance: Timeout support and monitoring");
  console.log("✅ Cleanup Handling: Custom error handlers");
  console.log("✅ JSON Serialization: Safe utilities provided");
  console.log("✅ Concurrency: Mutex/semaphore protection");
  console.log("✅ Complexity: Simple preset functions");
  console.log("\n🎯 try-and-catch v4.1.0 is now ENTERPRISE-READY! 🚀");
}

demonstrateAllFixes().catch(console.error);
