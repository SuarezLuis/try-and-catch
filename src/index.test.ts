import tryAndCatch from "./index";

describe("tryAndCatch", () => {
  it("should return {result, error: null} when function executes successfully", () => {
    const add = (a: number, b: number) => a + b;
    const { result, error } = tryAndCatch(add, 2, 3);

    expect(result).toBe(5);
    expect(error).toBeNull();
  });

  it("should return {result: undefined, error} when function throws an error", () => {
    const throwError = () => {
      throw new Error("Test error");
    };

    const { result, error } = tryAndCatch(throwError);

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("Test error");
  });

  it("should handle JSON.parse successfully", () => {
    const validJson = '{"name": "test", "value": 42}';
    const { result, error } = tryAndCatch(JSON.parse, validJson);

    expect(result).toEqual({ name: "test", value: 42 });
    expect(error).toBeNull();
  });

  it("should handle JSON.parse error", () => {
    const invalidJson = "invalid json";
    const { result, error } = tryAndCatch(JSON.parse, invalidJson);

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
  });

  it("should handle functions with multiple arguments", () => {
    const multiply = (a: number, b: number, c: number) => a * b * c;
    const { result, error } = tryAndCatch(multiply, 2, 3, 4);

    expect(result).toBe(24);
    expect(error).toBeNull();
  });

  it("should handle functions with no arguments", () => {
    const getCurrentTime = () => Date.now();
    const { result, error } = tryAndCatch(getCurrentTime);

    expect(typeof result).toBe("number");
    expect(error).toBeNull();
  });

  it("should convert non-Error throws to Error objects", () => {
    const throwString = () => {
      throw "String error";
    };

    const { result, error } = tryAndCatch(throwString);

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("String error");
  });

  it("should handle async functions automatically", async () => {
    const asyncResolve = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return "async result";
    };

    const { result, error } = await tryAndCatch(asyncResolve);

    expect(result).toBe("async result");
    expect(error).toBeNull();
  });

  it("should handle async functions that throw errors", async () => {
    const asyncThrow = async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      throw new Error("async error");
    };

    const { result, error } = await tryAndCatch(asyncThrow);

    expect(result).toBeUndefined();
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("async error");
  });

  describe("Helper functions", () => {
    it("isOk should return true for successful results", () => {
      const result = tryAndCatch(JSON.parse, '{"test": true}');
      expect(tryAndCatch.isOk(result)).toBe(true);
    });

    it("isOk should return false for error results", () => {
      const result = tryAndCatch(JSON.parse, "invalid json");
      expect(tryAndCatch.isOk(result)).toBe(false);
    });

    it("isError should return false for successful results", () => {
      const result = tryAndCatch(JSON.parse, '{"test": true}');
      expect(tryAndCatch.isError(result)).toBe(false);
    });

    it("isError should return true for error results", () => {
      const result = tryAndCatch(JSON.parse, "invalid json");
      expect(tryAndCatch.isError(result)).toBe(true);
    });

    it("unwrap should return the result value for successful results", () => {
      const result = tryAndCatch(JSON.parse, '{"test": true}');
      expect(tryAndCatch.unwrap(result)).toEqual({ test: true });
    });

    it("unwrap should throw for error results", () => {
      const result = tryAndCatch(JSON.parse, "invalid json");
      expect(() => tryAndCatch.unwrap(result)).toThrow();
    });

    it("unwrapOr should return the result value for successful results", () => {
      const result = tryAndCatch(JSON.parse, '{"test": true}');
      expect(tryAndCatch.unwrapOr(result, { default: true })).toEqual({
        test: true,
      });
    });

    it("unwrapOr should return the default value for error results", () => {
      const result = tryAndCatch(JSON.parse, "invalid json");
      expect(tryAndCatch.unwrapOr(result, { default: true })).toEqual({
        default: true,
      });
    });
  });

  describe("Debug functionality", () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "log").mockImplementation();
      jest.spyOn(console, "error").mockImplementation();
      jest.spyOn(console, "warn").mockImplementation();
      tryAndCatch.disableDebug(); // Ensure clean state
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      jest.restoreAllMocks();
      tryAndCatch.disableDebug();
    });

    it("should not log anything when debug is disabled", () => {
      tryAndCatch(JSON.parse, '{"test": true}');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it("should log success when debug is enabled", () => {
      tryAndCatch.enableDebug();
      const testFn = (x: any) => x;
      Object.defineProperty(testFn, "name", { value: "testFunction" });

      tryAndCatch(testFn, { test: true });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[try-and-catch] Debug mode enabled"),
        expect.any(Object)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Executing function: testFunction")
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "✅ Function testFunction executed successfully"
        )
      );
    });

    it("should log errors when debug is enabled", () => {
      const errorSpy = jest.spyOn(console, "error").mockImplementation();
      tryAndCatch.enableDebug();

      const throwingFn = () => {
        throw new Error("Test error");
      };
      Object.defineProperty(throwingFn, "name", { value: "throwingFunction" });

      tryAndCatch(throwingFn);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Function throwingFunction threw an error:"),
        expect.any(String)
      );
      errorSpy.mockRestore();
    });

    it("should log arguments when configured", () => {
      tryAndCatch.enableDebug({ logArgs: true });
      const testArgs = '{"test": true}';
      tryAndCatch(JSON.parse, testArgs);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Arguments:"),
        [testArgs]
      );
    });

    it("should log timing when configured", () => {
      tryAndCatch.enableDebug({ logTiming: true });
      tryAndCatch(() => "test");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/⏱️.*completed.*\(\d+ms\)/)
      );
    });

    it("should allow configuring debug options", () => {
      tryAndCatch.enableDebug();
      tryAndCatch.configureDebug({ logArgs: true, prefix: "[TEST]" });

      const config = tryAndCatch.getDebugConfig();
      expect(config.logArgs).toBe(true);
      expect(config.prefix).toBe("[TEST]");
    });

    it("should warn when trying to configure debug while disabled", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      tryAndCatch.configureDebug({ logArgs: true });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Debug mode is not enabled")
      );
      warnSpy.mockRestore();
    });

    it("should return debug configuration", () => {
      const config = tryAndCatch.getDebugConfig();
      expect(config).toHaveProperty("enabled");
      expect(config).toHaveProperty("logSuccess");
      expect(config).toHaveProperty("logErrors");
    });
  });

  describe("Block execution", () => {
    it("should execute code blocks successfully with tryAndCatch.block", () => {
      const { result, error } = tryAndCatch.block(() => {
        const data = { x: 10, y: 20 };
        return data.x + data.y;
      });

      expect(result).toBe(30);
      expect(error).toBeNull();
    });

    it("should handle errors in code blocks with tryAndCatch.block", () => {
      const { result, error } = tryAndCatch.block(() => {
        throw new Error("Block error");
      });

      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Block error");
    });

    it("should execute async code blocks successfully with tryAndCatch.block", async () => {
      const { result, error } = await tryAndCatch.block(async () => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("async result"), 10);
        });
      });

      expect(result).toBe("async result");
      expect(error).toBeNull();
    });

    it("should handle errors in async code blocks with tryAndCatch.block", async () => {
      const { result, error } = await tryAndCatch.block(async () => {
        throw new Error("Async block error");
      });

      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Async block error");
    });

    it("should handle rejected promises in tryAndCatch.block", async () => {
      const { result, error } = await tryAndCatch.block(async () => {
        return Promise.reject(new Error("Promise rejected"));
      });

      expect(result).toBeUndefined();
      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Promise rejected");
    });
  });
});
