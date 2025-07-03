# try-and-catch

A TypeScript utility function that wraps try-catch logic and returns a tuple with result and error, providing a cleaner way to handle errors without try-catch blocks.

## Installation

```bash
npm install try-and-catch
```

## Quick Start

```typescript
import tryAndCatch from 'try-and-catch';

// Success case
const [result, error] = tryAndCatch(JSON.parse, '{"valid": "json"}');
if (error) {
  console.error('Parsing failed:', error);
} else {
  console.log('Parsed:', result); // { valid: "json" }
}

// Error case
const [parseResult, parseError] = tryAndCatch(JSON.parse, 'invalid json');
if (parseError) {
  console.error('Parsing failed:', parseError); // SyntaxError: Unexpected token i in JSON at position 0
}
```

## Core API

### `tryAndCatch<T>(fn: T, ...args: Parameters<T>): [ReturnType<T>, null] | [undefined, Error]`

Executes a function with the provided arguments and returns a tuple:
- On success: `[result, null]`
- On error: `[undefined, error]`

#### Parameters

- `fn`: The function to execute
- `...args`: Arguments to pass to the function

#### Returns

A tuple where:
- First element: The function's return value on success, `undefined` on failure
- Second element: `null` on success, `Error` on failure

## Basic Examples

### Simple Function Calls

```typescript
const add = (a: number, b: number) => a + b;
const [result, error] = tryAndCatch(add, 2, 3);

if (error) {
  console.error('Addition failed:', error);
} else {
  console.log('Result:', result); // 5
}
```

### Error Handling

```typescript
const riskyOperation = () => {
  throw new Error('Something went wrong');
};

const [result, error] = tryAndCatch(riskyOperation);

if (error) {
  console.error('Operation failed:', error.message); // "Something went wrong"
} else {
  console.log('Success:', result);
}
```

### Multiple Arguments

```typescript
const multiply = (a: number, b: number, c: number) => a * b * c;
const [result, error] = tryAndCatch(multiply, 2, 3, 4);

if (error) {
  console.error('Multiplication failed:', error);
} else {
  console.log('Result:', result); // 24
}
```

## Block Execution

Execute blocks of code safely without explicitly wrapping in functions.

### Synchronous Blocks

```typescript
// Traditional way - wrap in anonymous function
const [result1, error1] = tryAndCatch(() => {
  const data = JSON.parse(jsonString);
  const processed = data.items.map(item => item.value);
  return processed.reduce((sum, val) => sum + val, 0);
});

// Cleaner syntax with block method
const [result2, error2] = tryAndCatch.block(() => {
  const data = JSON.parse(jsonString);
  const processed = data.items.map(item => item.value);
  return processed.reduce((sum, val) => sum + val, 0);
});
```

### Asynchronous Blocks

```typescript
// Async block execution
const [asyncResult, asyncError] = await tryAndCatch.asyncBlock(async () => {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data.processed;
});
```

### Complex Data Processing

```typescript
const [complexResult, complexError] = tryAndCatch.block(() => {
  // Multiple operations that might throw
  const parsed = JSON.parse(jsonData);
  const validated = validateSchema(parsed);
  const transformed = transformData(validated);
  const aggregated = aggregateResults(transformed);
  
  return {
    summary: aggregated,
    timestamp: Date.now()
  };
});
```

## Helper Functions

Utility functions for working with try-catch results more conveniently.

### Type Guards

#### `tryAndCatch.isOk(result): boolean`
Type guard that returns `true` if the result is successful (no error).

#### `tryAndCatch.isError(result): boolean`
Type guard that returns `true` if the result contains an error.

```typescript
// Type-safe checking
const [data, error] = tryAndCatch(JSON.parse, jsonString);

if (tryAndCatch.isOk([data, error])) {
  console.log('Success:', data);
} else {
  console.log('Error:', error.message);
}
```

### Value Extraction

#### `tryAndCatch.unwrap(result): T`
Returns the result value if successful, otherwise throws the error. Use with caution!

#### `tryAndCatch.unwrapOr(result, defaultValue): T`
Returns the result value if successful, otherwise returns the provided default value.

```typescript
// Unwrapping with fallback
const safeData = tryAndCatch.unwrapOr([data, error], { default: 'fallback' });

// Unwrapping (throws on error)
try {
  const result = tryAndCatch.unwrap([data, error]);
  console.log('Unwrapped:', result);
} catch (e) {
  console.error('Failed to unwrap:', e.message);
}
```

## Debug Mode

Enable debug logging to monitor function execution and troubleshoot issues.

### Basic Debug

```typescript
// Enable debug mode
tryAndCatch.enableDebug();

const [result, error] = tryAndCatch(JSON.parse, '{"test": true}');
// Output: [try-and-catch] Executing function: JSON.parse
//         [try-and-catch] ✅ Function JSON.parse executed successfully

// Disable debug mode
tryAndCatch.disableDebug();
```

### Advanced Debug Configuration

```typescript
// Enable debug with timing and arguments
tryAndCatch.enableDebug({
  logTiming: true,
  logArgs: true,
  prefix: '[MY-APP]'
});

const [data, err] = tryAndCatch(Math.max, 1, 2, 3);
// Output: [MY-APP] Executing function: max
//         [MY-APP] Arguments: [1, 2, 3]
//         [MY-APP] ✅ Function max executed successfully
//         [MY-APP] ⏱️  Function max completed (0ms)
```

## TypeScript Support

This package is written in TypeScript and provides full type safety:

```typescript
// TypeScript will infer the correct types
const [result, error] = tryAndCatch(JSON.parse, '{"test": true}');
// result: any (JSON.parse return type)
// error: Error | null

const [addResult, addError] = tryAndCatch((a: number, b: number) => a + b, 1, 2);
// addResult: number
// addError: Error | null

// Block execution with type inference
const [blockResult, blockError] = tryAndCatch.block(() => {
  return { message: 'Hello', count: 42 };
});
// blockResult: { message: string; count: number; }
// blockError: Error | null
```

## Complete API Reference

### Core Functions

#### `tryAndCatch<T>(fn: T, ...args: Parameters<T>): TryAndCatchResult<T>`
Main function that executes any function safely.

### Block Execution

#### `tryAndCatch.block<T>(codeBlock: () => T): TryAndCatchResult<T>`
Execute a block of code safely without explicitly wrapping in a function.

#### `tryAndCatch.asyncBlock<T>(codeBlock: () => Promise<T>): Promise<TryAndCatchResult<T>>`
Execute an async block of code safely. Returns a Promise that resolves to the result tuple.

### Helper Functions

#### `tryAndCatch.isOk(result): boolean`
Type guard that returns `true` if the result is successful.

#### `tryAndCatch.isError(result): boolean`
Type guard that returns `true` if the result contains an error.

#### `tryAndCatch.unwrap(result): T`
Returns the result value if successful, otherwise throws the error.

#### `tryAndCatch.unwrapOr(result, defaultValue): T`
Returns the result value if successful, otherwise returns the default value.

### Debug Functions

#### `tryAndCatch.enableDebug(config?: Partial<DebugConfig>): void`
Enables debug mode with optional configuration.

**Config options:**
- `logSuccess: boolean` - Log successful function executions (default: `true`)
- `logErrors: boolean` - Log function errors (default: `true`)
- `logArgs: boolean` - Log function arguments (default: `false`)
- `logTiming: boolean` - Log execution timing (default: `false`)
- `prefix: string` - Custom prefix for debug messages (default: `'[try-and-catch]'`)

#### `tryAndCatch.disableDebug(): void`
Disables debug mode.

#### `tryAndCatch.configureDebug(config: Partial<DebugConfig>): void`
Updates debug configuration while debug mode is enabled.

#### `tryAndCatch.getDebugConfig(): DebugConfig`
Returns the current debug configuration.

## License

MIT
