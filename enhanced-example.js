const tryAndCatch = require("./dist");

console.log("=== Enhanced Helper Methods Example ===\n");

// Example 1: Using isOk helper
console.log("Example 1: Using isOk helper");
const parseResult = tryAndCatch(() => JSON.parse('{"name": "test"}'));
if (tryAndCatch.isOk(parseResult)) {
  console.log("Parse successful:", parseResult.result);
} else {
  console.log("Parse failed:", parseResult.error.message);
}

// Example 2: Using isError helper
console.log("\nExample 2: Using isError helper");
const errorResult = tryAndCatch(() => JSON.parse("invalid json"));
if (tryAndCatch.isError(errorResult)) {
  console.log("Parse failed as expected:", errorResult.error.message);
} else {
  console.log("Parse successful:", errorResult.result);
}

// Example 3: Using unwrap for guaranteed success
console.log("\nExample 3: Using unwrap for guaranteed success");
const safeResult = tryAndCatch(() => 2 + 2);
const value = tryAndCatch.unwrap(safeResult);
console.log("Unwrapped value:", value);

// Example 4: Using unwrapOr with fallback
console.log("\nExample 4: Using unwrapOr with fallback");
const riskyResult = tryAndCatch(() => {
  throw new Error("Something went wrong");
});
const valueWithFallback = tryAndCatch.unwrapOr(riskyResult, "default value");
console.log("Value with fallback:", valueWithFallback);

// Example 5: Automatic async handling
console.log("\nExample 5: Automatic async handling");
async function asyncExample() {
  // Async function - automatically awaited
  const { result, error } = await tryAndCatch(async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return "async success";
  });

  if (error) {
    console.log("Async error:", error.message);
  } else {
    console.log("Async result:", result);
  }
}

// Example 6: Promise-returning function
console.log("\nExample 6: Promise-returning function");
async function promiseExample() {
  const simulateApiCall = () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ data: "api response" }), 50);
    });
  };

  const { result, error } = await tryAndCatch(simulateApiCall);

  if (error) {
    console.log("Promise error:", error.message);
  } else {
    console.log("Promise result:", result);
  }

  console.log("\n=== Enhanced Example Complete ===");
}

asyncExample()
  .then(() => promiseExample())
  .catch(console.error);
