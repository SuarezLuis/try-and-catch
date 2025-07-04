const tryAndCatch = require("./dist/index.js");

console.log("=== Enhanced try-and-catch Examples ===");
console.log("Test 1");

// Example 1: Basic usage
console.log("1. Basic JSON parsing:");
const { result: userData, error: userError } = tryAndCatch(
  JSON.parse,
  '{"name": "John", "age": 30}'
);

console.log("userData:", userData);
console.log("userError:", userError);

if (userError) {
  console.error("❌ Failed to parse user:", userError.message);
} else {
  console.log("✅ User loaded:", userData);
}

console.log("=== End ===");
