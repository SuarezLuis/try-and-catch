const tryAndCatch = require("./dist");

console.log("=== Debug Mode Example ===\n");

// Example 1: Enable debug mode
console.log("Example 1: Enabling debug mode");
tryAndCatch.enableDebug();

const { result: result1, error: error1 } = tryAndCatch(() => {
  console.log("Inside function: doing some work...");
  return "success";
});

if (error1) {
  console.log("Error:", error1.message);
} else {
  console.log("Result:", result1);
}

// Example 2: Debug with error
console.log("\nExample 2: Debug mode with error");
const { result: result2, error: error2 } = tryAndCatch(() => {
  console.log("Inside function: about to throw...");
  throw new Error("Test error");
});

if (error2) {
  console.log("Caught error:", error2.message);
} else {
  console.log("Result:", result2);
}

// Example 3: Configure debug with custom prefix
console.log("\nExample 3: Custom debug prefix");
tryAndCatch.configureDebug({ prefix: "[CUSTOM]" });

const { result: result3, error: error3 } = tryAndCatch(() => {
  return "with custom prefix";
});

if (error3) {
  console.log("Error:", error3.message);
} else {
  console.log("Result:", result3);
}

// Example 4: Disable debug mode
console.log("\nExample 4: Disabling debug mode");
tryAndCatch.disableDebug();

const { result: result4, error: error4 } = tryAndCatch(() => {
  console.log("This should not show debug info");
  return "silent execution";
});

if (error4) {
  console.log("Error:", error4.message);
} else {
  console.log("Result:", result4);
}

// Example 5: Async with debug
console.log("\nExample 5: Async operation with debug");
tryAndCatch.enableDebug();

async function asyncDebugExample() {
  const { result, error } = await tryAndCatch(async () => {
    console.log("Inside async function: starting...");
    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log("Inside async function: completed");
    return "async result";
  });

  if (error) {
    console.log("Async error:", error.message);
  } else {
    console.log("Async result:", result);
  }

  console.log("\n=== Debug Example Complete ===");
  tryAndCatch.disableDebug(); // Clean up
}

asyncDebugExample();
