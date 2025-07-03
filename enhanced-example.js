const tryAndCatch = require("./dist/index.js");

console.log("=== Enhanced try-and-catch Examples ===\n");

// Example 1: Basic usage with meaningful variable names
console.log("1. Basic JSON parsing with meaningful names:");
const [userData, userError] = tryAndCatch(
  JSON.parse,
  '{"name": "John", "age": 30}'
);
if (userError) {
  console.error("❌ Failed to parse user:", userError.message);
} else {
  console.log("✅ User loaded:", userData);
}

// Example 2: Using helper functions
console.log("\n2. Using helper functions:");
const parseResult = tryAndCatch(JSON.parse, '{"status": "success"}');

if (tryAndCatch.isOk(parseResult)) {
  console.log("✅ Parse successful:", parseResult[0]);
} else {
  console.log("❌ Parse failed:", parseResult[1].message);
}

// Example 3: Using unwrap (be careful - this throws on error)
console.log("\n3. Using unwrap for successful case:");
try {
  const safeResult = tryAndCatch(() => ({ message: "Hello World" }));
  const unwrapped = tryAndCatch.unwrap(safeResult);
  console.log("✅ Unwrapped result:", unwrapped);
} catch (error) {
  console.log("❌ Unwrap failed:", error.message);
}

// Example 4: Using unwrapOr with default values
console.log("\n4. Using unwrapOr with fallback:");
const riskyParseResult = tryAndCatch(JSON.parse, "invalid json");
const safeValue = tryAndCatch.unwrapOr(riskyParseResult, {
  default: "fallback data",
});
console.log("📦 Result with fallback:", safeValue);

// Example 5: Error checking patterns
console.log("\n5. Different error checking patterns:");
const [calculation, calcError] = tryAndCatch(
  (a, b) => {
    if (b === 0) throw new Error("Division by zero");
    return a / b;
  },
  10,
  0
);

// Pattern 1: Early return style
if (calcError) {
  console.log("❌ Calculation failed:", calcError.message);
} else {
  console.log("✅ Calculation result:", calculation);
}

// Pattern 2: Using helper
if (tryAndCatch.isError([calculation, calcError])) {
  console.log("❌ Using isError helper: Calculation failed");
}

// Example 6: Chaining with unwrapOr
console.log("\n6. Chaining operations:");
const step1 = tryAndCatch(JSON.parse, '{"x": 5}');
const step2Value = tryAndCatch.unwrapOr(step1, { x: 0 });
const [finalResult, finalError] = tryAndCatch((obj) => obj.x * 2, step2Value);

if (finalError) {
  console.log("❌ Chain failed:", finalError.message);
} else {
  console.log("✅ Chain result:", finalResult);
}

console.log("\n=== All examples completed ===");
