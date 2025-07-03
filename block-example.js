const tryAndCatch = require("./dist/index.js");

console.log("=== Block Execution Examples ===\n");

// Example 1: Basic block execution (current way)
console.log("1. Traditional way - wrapping in anonymous function:");
const [result1, error1] = tryAndCatch(() => {
  const data = JSON.parse('{"users": [{"name": "John"}, {"name": "Jane"}]}');
  const names = data.users.map((user) => user.name);
  return names.join(", ");
});

if (error1) {
  console.error("❌ Error:", error1.message);
} else {
  console.log("✅ Result:", result1);
}

// Example 2: Using tryAndCatch.block (cleaner syntax)
console.log("\n2. Using tryAndCatch.block method:");
const [result2, error2] = tryAndCatch.block(() => {
  // Complex data processing block
  const numbers = [1, 2, 3, 4, 5];
  const squared = numbers.map((n) => n * n);
  const sum = squared.reduce((acc, val) => acc + val, 0);

  if (sum > 50) {
    return { sum, status: "high" };
  }
  return { sum, status: "normal" };
});

if (error2) {
  console.error("❌ Error:", error2.message);
} else {
  console.log("✅ Result:", result2);
}

// Example 3: Block with error handling
console.log("\n3. Block that throws an error:");
const [result3, error3] = tryAndCatch.block(() => {
  const risky = null;
  return risky.someProperty; // This will throw
});

if (error3) {
  console.log("✅ Caught error safely:", error3.message);
} else {
  console.log("Result:", result3);
}

// Example 4: Async block execution
console.log("\n4. Async block execution:");
(async () => {
  const [asyncResult, asyncError] = await tryAndCatch.asyncBlock(async () => {
    // Simulate async operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await Promise.resolve({
      data: "Async data processed",
      timestamp: Date.now(),
    });

    return response;
  });

  if (asyncError) {
    console.error("❌ Async error:", asyncError.message);
  } else {
    console.log("✅ Async result:", asyncResult);
  }
})();

// Example 5: Async block with error
console.log("\n5. Async block with error:");
(async () => {
  const [asyncResult2, asyncError2] = await tryAndCatch.asyncBlock(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    throw new Error("Async operation failed");
  });

  if (asyncError2) {
    console.log("✅ Caught async error safely:", asyncError2.message);
  } else {
    console.log("Result:", asyncResult2);
  }
})();

// Example 6: Complex real-world scenario
console.log("\n6. Complex data processing scenario:");
const [complexResult, complexError] = tryAndCatch.block(() => {
  // Simulate fetching and processing user data
  const rawData =
    '{"users": [{"id": 1, "name": "Alice", "age": 30}, {"id": 2, "name": "Bob", "age": 25}]}';
  const parsed = JSON.parse(rawData);

  // Data validation and transformation
  const validUsers = parsed.users.filter(
    (user) => user.name && user.age && user.age >= 18
  );

  const transformed = validUsers.map((user) => ({
    id: user.id,
    displayName: user.name.toUpperCase(),
    ageGroup: user.age >= 30 ? "senior" : "junior",
    canVote: true,
  }));

  // Business logic
  const summary = {
    totalUsers: transformed.length,
    seniors: transformed.filter((u) => u.ageGroup === "senior").length,
    juniors: transformed.filter((u) => u.ageGroup === "junior").length,
    users: transformed,
  };

  return summary;
});

if (complexError) {
  console.error("❌ Complex processing failed:", complexError.message);
} else {
  console.log("✅ Complex result:", JSON.stringify(complexResult, null, 2));
}

console.log("\n=== Block execution examples completed ===");

// Example 7: With debug mode
setTimeout(() => {
  console.log("\n7. Block execution with debug mode:");
  tryAndCatch.enableDebug({ logArgs: false });

  const [debugResult, debugError] = tryAndCatch.block(() => {
    return "Debug test successful";
  });

  console.log("Debug result:", debugResult);
  tryAndCatch.disableDebug();
}, 200);
