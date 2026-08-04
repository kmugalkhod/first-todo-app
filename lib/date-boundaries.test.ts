import { describe, expect, it } from "vitest";
import { localDayBounds } from "./date-boundaries";

describe("localDayBounds", () => {
  it("uses the actor's calendar day rather than the server's UTC day", () => {
    const { start, end } = localDayBounds("Asia/Kolkata", new Date("2026-08-04T20:00:00.000Z"));
    expect(start.toISOString()).toBe("2026-08-04T18:30:00.000Z");
    expect(end.toISOString()).toBe("2026-08-05T18:30:00.000Z");
  });

  it("keeps a full local day across a DST transition", () => {
    const { start, end } = localDayBounds("America/New_York", new Date("2026-03-08T16:00:00.000Z"));
    expect(start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
  });
});
