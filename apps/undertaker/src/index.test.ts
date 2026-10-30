import { describe, expect, it } from "vitest";
import { APP_NAME } from "./index.js";

describe("Undertaker scaffold", () => {
  it("has the planned Crew App identity", () => {
    expect(APP_NAME).toBe("Undertaker");
  });
});
