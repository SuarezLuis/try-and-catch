const tryAndCatch = require("./dist/index.js");

// Example 1: JSON parsing
console.log("Example 1: JSON parsing");
const { result: parseResult, error: parseError } = tryAndCatch(JSON.parse, '{"name": "test"}');
if (parseError) {
  console.error("Parse error:", parseError.message);
} else {
  console.log("Parsed successfully:", parseResult);
}

// Example 2: JSON parsing with invalid input
console.log("\nExample 2: JSON parsing with invalid input");
const { result: parseResult2, error: parseError2 } = tryAndCatch(JSON.parse, "invalid json");
if (parseError2) {
  console.error("Parse error:", parseError2.message);
} else {
  console.log("Parsed successfully:", parseResult2);
}

// Example 3: Simple arithmetic
console.log("\nExample 3: Simple arithmetic");
const add = (a, b) => a + b;
const { result: addResult, error: addError } = tryAndCatch(add, 5, 3);
if (addError) {
  console.error("Add error:", addError.message);
} else {
  console.log("Addition result:", addResult);
}

// Example 4: Function that throws
console.log("\nExample 4: Function that throws");
const throwError = () => {
  throw new Error("Something went wrong!");
};
const { result: throwResult, error: throwErr } = tryAndCatch(throwError);
if (throwErr) {
  console.error("Caught error:", throwErr.message);
} else {
  console.log("No error:", throwResult);
}
