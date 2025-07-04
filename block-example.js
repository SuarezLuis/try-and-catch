const tryAndCatch = require("./dist");

console.log("=== Block Execution Example ===\n");

// Example 1: Sync block execution
console.log("Example 1: Sync block execution");
const { result: blockResult1, error: blockError1 } = tryAndCatch.block(() => {
  console.log("  - Step 1: Initialize data");
  const data = { count: 0 };

  console.log("  - Step 2: Process data");
  data.count += 5;

  console.log("  - Step 3: Validate result");
  if (data.count < 10) {
    data.status = "valid";
  }

  console.log("  - Step 4: Return result");
  return data;
});

if (blockError1) {
  console.log("Block execution failed:", blockError1.message);
} else {
  console.log("Block result:", blockResult1);
}

// Example 2: Sync block with error
console.log("\nExample 2: Sync block with error");
const { result: blockResult2, error: blockError2 } = tryAndCatch.block(() => {
  console.log("  - Step 1: Start processing");
  const data = { value: 10 };

  console.log("  - Step 2: Perform risky operation");
  if (data.value > 5) {
    throw new Error("Value too high!");
  }

  console.log("  - Step 3: This should not execute");
  return data;
});

if (blockError2) {
  console.log("Block execution failed as expected:", blockError2.message);
} else {
  console.log("Block result:", blockResult2);
}

// Example 3: Async block execution (automatic promise handling)
console.log("\nExample 3: Async block execution");
async function asyncBlockExample() {
  const { result, error } = await tryAndCatch.block(async () => {
    console.log("  - Step 1: Start async processing");
    await new Promise((resolve) => setTimeout(resolve, 100));

    console.log("  - Step 2: Fetch data (simulated)");
    const data = { users: [], loaded: false };
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log("  - Step 3: Process data");
    data.users = ["Alice", "Bob", "Charlie"];
    data.loaded = true;

    console.log("  - Step 4: Return processed data");
    return data;
  });

  if (error) {
    console.log("Async block failed:", error.message);
  } else {
    console.log("Async block result:", result);
  }
}

// Example 4: Async block with error (automatic promise handling)
console.log("\nExample 4: Async block with error");
async function asyncBlockErrorExample() {
  const { result, error } = await tryAndCatch.block(async () => {
    console.log("  - Step 1: Start async processing");
    await new Promise((resolve) => setTimeout(resolve, 50));

    console.log("  - Step 2: Simulate network error");
    throw new Error("Network timeout");

    console.log("  - Step 3: This should not execute");
    return { success: true };
  });

  if (error) {
    console.log("Async block failed as expected:", error.message);
  } else {
    console.log("Async block result:", result);
  }
}

// Run async examples
asyncBlockExample()
  .then(() => asyncBlockErrorExample())
  .then(() => {
    console.log("\n=== Block Example Complete ===");
  });
