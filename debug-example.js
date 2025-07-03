const tryAndCatch = require("./dist/index.js");

console.log("=== Debug Feature Examples ===\n");

// Example 1: Basic debug mode
console.log("1. Enabling basic debug mode:");
tryAndCatch.enableDebug();

const [result1, error1] = tryAndCatch(JSON.parse, '{"name": "John"}');
console.log("Result:", result1);

// Example 2: Debug with timing
console.log("\n2. Debug with timing enabled:");
tryAndCatch.configureDebug({ logTiming: true });

const [result2, error2] = tryAndCatch((n) => {
  // Simulate some work
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += i;
  }
  return sum;
}, 1000);

// Example 3: Debug with arguments logging
console.log("\n3. Debug with arguments logging:");
tryAndCatch.configureDebug({ logArgs: true });

const [result3, error3] = tryAndCatch(Math.max, 10, 20, 5, 30);
console.log("Max result:", result3);

// Example 4: Debug with custom prefix
console.log("\n4. Debug with custom prefix:");
tryAndCatch.configureDebug({ prefix: "[MATH-DEBUG]" });

const [result4, error4] = tryAndCatch(Math.sqrt, 16);
console.log("Square root result:", result4);

// Example 5: Debug with error handling
console.log("\n5. Debug with error handling:");
tryAndCatch.configureDebug({ prefix: "[ERROR-DEBUG]" });

const [result5, error5] = tryAndCatch(JSON.parse, "invalid json");
if (error5) {
  console.log("Caught error in main code:", error5.message);
}

// Example 6: All debug options enabled
console.log("\n6. All debug options enabled:");
tryAndCatch.configureDebug({
  logSuccess: true,
  logErrors: true,
  logArgs: true,
  logTiming: true,
  prefix: "[FULL-DEBUG]",
});

const complexFunction = (a, b, c) => {
  if (a === 0) throw new Error("First argument cannot be zero");
  return (a * b) / c;
};

const [result6, error6] = tryAndCatch(complexFunction, 6, 4, 2);
console.log("Complex function result:", result6);

// Example 7: Disable debug
console.log("\n7. Disabling debug:");
tryAndCatch.disableDebug();

const [result7, error7] = tryAndCatch(JSON.parse, '{"silent": true}');
console.log("Silent result:", result7);

// Example 8: Debug configuration inspection
console.log("\n8. Debug configuration:");
tryAndCatch.enableDebug({ logArgs: true, logTiming: true });
const config = tryAndCatch.getDebugConfig();
console.log("Current debug config:", config);

tryAndCatch.disableDebug();
console.log("\n=== Debug examples completed ===");
