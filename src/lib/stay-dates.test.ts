import { describe, expect, it } from "vitest";
import { eachStayNight } from "./stay-dates";

describe("stay calendar boundaries", () => {
  it.each([
    ["2030-02-30", "2030-03-04"], ["not-a-date", "2030-03-04"],
    ["2030-03-01", "2030-03-01"], ["2030-03-02", "2030-03-01"],
    ["2030-01-01", "2040-01-01"],
  ])("rejects invalid/unbounded stay %s to %s", (start, end) => {
    expect(eachStayNight(start, end)).toEqual([]);
  });
  it("keeps checkout exclusive across leap day and daylight-saving boundaries", () => {
    expect(eachStayNight("2028-02-28", "2028-03-01")).toEqual(["2028-02-28", "2028-02-29"]);
    expect(eachStayNight("2030-03-09", "2030-03-12")).toEqual(["2030-03-09", "2030-03-10", "2030-03-11"]);
  });
});
