import { describe, expect, it } from "vitest";

import { firstOf } from "@/lib/db-helpers";

describe("firstOf", () => {
  it("returns the first element of an array", () => {
    expect(firstOf([{ id: 1 }, { id: 2 }])).toEqual({ id: 1 });
  });

  it("returns null for an empty array", () => {
    expect(firstOf([])).toBeNull();
  });

  it("returns a single object unchanged", () => {
    expect(firstOf({ id: 3 })).toEqual({ id: 3 });
  });

  it("returns null for null/undefined", () => {
    expect(firstOf(null)).toBeNull();
    expect(firstOf(undefined)).toBeNull();
  });
});
