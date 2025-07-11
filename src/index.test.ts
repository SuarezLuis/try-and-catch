import { tryAndCatch, Result } from "./index";

describe("tryAndCatch", () => {
  it("returns result for sync success", () => {
    const { result, error } = tryAndCatch(() => 42);
    expect(result).toBe(42);
    expect(error).toBeNull();
  });

  it("returns error for sync throw", () => {
    const { result, error } = tryAndCatch(() => {
      throw new Error("fail");
    });
    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("fail");
  });

  it("handles non-Error throws", () => {
    const { result, error } = tryAndCatch(() => {
      throw "string error";
    });
    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("string error");
  });

  it("returns result for async success", async () => {
    const { result, error } = await tryAndCatch(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return "done";
    });
    expect(result).toBe("done");
    expect(error).toBeNull();
  });

  it("returns error for async throw", async () => {
    const { result, error } = await tryAndCatch(async () => {
      await new Promise((r) => setTimeout(r, 10));
      throw new Error("fail");
    });
    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("fail");
  });

  it("calls sync finally callback", () => {
    let called = false;
    tryAndCatch(
      () => 1,
      () => {
        called = true;
      }
    );
    expect(called).toBe(true);
  });

  it("awaits async finally callback", async () => {
    let called = false;
    await tryAndCatch(
      async () => 1,
      async () => {
        await new Promise((r) => setTimeout(r, 10));
        called = true;
      }
    );
    expect(called).toBe(true);
  });
});
