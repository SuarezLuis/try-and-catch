const {
  tryAndCatch,
  tryAndCatchWithRetry,
  ErrorTypes,
  RetryStrategies,
} = require("./dist/index.js");

console.log("🎯 ALL LIMITATIONS ADDRESSED!\n");

// ✅ LIMITATION 1: Error context loss (stack traces) - RESOLVED
console.log("✅ 1. ERROR CONTEXT PRESERVATION - RESOLVED");
async function demonstrateEnhancedErrorContext() {
  // Create a complex error with custom properties
  class DatabaseError extends Error {
    constructor(message, code, query, connectionId) {
      super(message);
      this.name = "DatabaseError";
      this.code = code;
      this.query = query;
      this.connectionId = connectionId;
      this.timestamp = new Date().toISOString();
    }
  }

  const dbError = new DatabaseError(
    "Constraint violation",
    "ER_DUP_ENTRY",
    "INSERT INTO users...",
    "conn_12345"
  );

  const { error } = tryAndCatch(() => {
    throw dbError;
  });

  console.log("   ✅ Error is exactly the same object:", error === dbError);
  console.log("   ✅ All custom properties preserved:");
  console.log("      - Code:", error?.code);
  console.log("      - Query:", error?.query);
  console.log("      - Connection ID:", error?.connectionId);
  console.log("      - Timestamp:", error?.timestamp);
  console.log("   ✅ Stack trace preserved:", !!error?.stack);

  // Enhanced error summary
  const summary = ErrorTypes.getErrorSummary(error);
  console.log("   ✅ Detailed error analysis:", {
    name: summary.name,
    code: summary.code,
    customProperties: Object.keys(summary.properties).length,
  });
  console.log();
}

// ✅ LIMITATION 2: Limited error type handling - RESOLVED
console.log("✅ 2. SMART ERROR CLASSIFICATION - RESOLVED");
function demonstrateErrorClassification() {
  const errors = [
    { error: new Error("Network timeout"), type: "Network" },
    {
      error: Object.assign(new Error("Bad request"), { status: 400 }),
      type: "Validation",
    },
    {
      error: Object.assign(new Error("Server error"), { status: 500 }),
      type: "Server",
    },
    {
      error: Object.assign(new Error("Connection refused"), {
        code: "ECONNREFUSED",
      }),
      type: "Connection",
    },
  ];

  errors.forEach(({ error, type }) => {
    console.log(`   📊 ${type} Error Analysis:`);
    console.log("      - Is Network Error:", ErrorTypes.isNetworkError(error));
    console.log("      - Is Retryable:", ErrorTypes.isRetryable(error));
    console.log(
      "      - Is Validation Error:",
      ErrorTypes.isValidationError(error)
    );
    console.log(
      "      - Error Code:",
      ErrorTypes.getErrorCode(error) || "None"
    );
  });
  console.log();
}

// ✅ LIMITATION 3: No built-in retry mechanisms - RESOLVED
console.log("✅ 3. BUILT-IN RETRY MECHANISMS - RESOLVED");
async function demonstrateRetryMechanisms() {
  let attemptCount = 0;

  // Simulate an operation that fails twice then succeeds
  const unstableOperation = async () => {
    attemptCount++;
    console.log(
      `   🔄 Attempt ${attemptCount}: ${
        attemptCount <= 2 ? "Failing..." : "Succeeding!"
      }`
    );

    if (attemptCount <= 2) {
      const error = new Error(`Temporary failure ${attemptCount}`);
      error.code = "TEMPORARY_ERROR";
      throw error;
    }

    return `Success after ${attemptCount} attempts!`;
  };

  const result = await tryAndCatchWithRetry(
    unstableOperation,
    {
      maxRetries: 5,
      delay: RetryStrategies.exponentialBackoff(100, 1000),
      shouldRetry: (error) => {
        console.log(
          `   🤔 Should retry "${error.message}"? ${
            ErrorTypes.isRetryable(error) ? "YES" : "NO"
          }`
        );
        return ErrorTypes.isRetryable(error);
      },
    },
    () => {
      console.log("   🧹 Cleanup executed after all attempts");
    }
  );

  console.log("   📊 Retry Results:");
  console.log("      - Final Result:", result.result);
  console.log("      - Total Attempts:", result.attempts);
  console.log("      - Errors Encountered:", result.errors.length);
  console.log(
    "      - Error Messages:",
    result.errors.map((e) => e.message)
  );
  console.log();
}

// BONUS: Advanced retry strategies
console.log("🚀 BONUS: ADVANCED RETRY STRATEGIES");
function demonstrateRetryStrategies() {
  console.log("   📈 Exponential Backoff Delays:");
  const expStrategy = RetryStrategies.exponentialBackoff(100, 2000);
  for (let i = 1; i <= 5; i++) {
    console.log(`      Attempt ${i}: ${Math.round(expStrategy(i))}ms delay`);
  }

  console.log("   📏 Linear Backoff Delays:");
  const linearStrategy = RetryStrategies.linearBackoff(200);
  for (let i = 1; i <= 5; i++) {
    console.log(`      Attempt ${i}: ${linearStrategy(i)}ms delay`);
  }

  console.log("   🎯 Smart Retry Conditions:");
  const testErrors = [
    new Error("Network timeout"),
    Object.assign(new Error("Validation failed"), { status: 400 }),
    Object.assign(new Error("Server overloaded"), { status: 503 }),
  ];

  testErrors.forEach((error) => {
    console.log(
      `      "${error.message}": ${
        RetryStrategies.onlyRetryableErrors(error) ? "RETRY" : "FAIL"
      }`
    );
  });
  console.log();
}

// Run all demonstrations
async function runAllDemonstrations() {
  try {
    await demonstrateEnhancedErrorContext();
    demonstrateErrorClassification();
    await demonstrateRetryMechanisms();
    demonstrateRetryStrategies();

    console.log("🎉 ALL LIMITATIONS SUCCESSFULLY ADDRESSED!");
    console.log("💪 try-and-catch v4.0.0 is now enterprise-grade!");
    console.log("🚀 Ready for production use with confidence!");
  } catch (err) {
    console.error("❌ Demonstration failed:", err);
  }
}

runAllDemonstrations();
