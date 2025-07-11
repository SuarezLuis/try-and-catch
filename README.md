# try-and-catch

A minimal TypeScript utility for safe try-catch execution, supporting both sync and async functions.

## Installation

```bash
npm install try-and-catch
```

## Usage

```typescript
import { tryAndCatch, Result } from 'try-and-catch';

// Synchronous usage
const result = tryAndCatch(() => {
  return 42;
});
console.log(result); // { result: 42, error: null }

// Asynchronous usage
const asyncResult = await tryAndCatch(async () => {
  await new Promise(r => setTimeout(r, 100));
  return 'done';
});
console.log(asyncResult); // { result: 'done', error: null }

// Error handling
const errorResult = tryAndCatch(() => {
  throw new Error('fail');
});
console.log(errorResult); // { result: null, error: Error('fail') }

// With finally callback (sync)
const withFinally = tryAndCatch(
  () => 'success',
  () => console.log('Cleanup completed')
);

// With async finally callback
const withAsyncFinally = await tryAndCatch(
  async () => 'async success',
  async () => {
    await cleanup();
    console.log('Async cleanup completed');
  }
);

// Type-safe result handling
const parseResult: Result<{ name: string }> = tryAndCatch(() => {
  return JSON.parse('{"name": "John"}');
});

if (parseResult.error) {
  console.error('Parse failed:', parseResult.error.message);
} else {
  console.log('Name:', parseResult.result?.name);
}
```

## API

### `tryAndCatch<T>(fn: () => T | Promise<T>, onFinally?: () => void | Promise<void>): Result<T> | Promise<Result<T>>`

- `fn`: Function to execute (sync or async)
- `onFinally`: Optional callback (sync or async) run after execution
- Returns: `{ result, error }` object

### `Result<T>`
- `result`: The value returned by `fn`, or `null` on error
- `error`: The error thrown by `fn`, or `null` on success

## TypeScript Support

This package is written in TypeScript and provides full type safety:

```typescript
// Function overloads provide correct return types
const syncResult = tryAndCatch(() => 42);
// Type: Result<number>

const asyncResult = await tryAndCatch(async () => 'hello');
// Type: Result<string>

// Export the Result type for your own type annotations
import { Result } from 'try-and-catch';
const myResult: Result<User> = tryAndCatch(() => getUser());
```

## License
MIT
