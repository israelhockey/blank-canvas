import { describe, expect, it } from "vitest";

import { buildIcs, windowHours } from "@/lib/ics";

describe("calendar feed", () => {
  it("turns arrival windows into hours", () => {
    expect(windowHours("9–11am")).toEqual([9, 11]);
    expect(windowHours("11am–1pm")).toEqual([11, 13]);
    expect(windowHours("1–3pm")).toEqual([13, 15]);
    expect(windowHours("3–5pm")).toEqual([15, 17]);
  });
  it("builds a valid event in Central time", () => {
    const ics = buildIcs([
      {
        id: "j1",
        number: 1001,
        customer_id: "c1",
        scheduled_date: "2026-11-07",
        arrival_window: "1–3pm",
        status: "confirmed",
        items: [{ label: "Room × 3", amount: 150 }],
        total: 162.38,
        final_total: null,
        address: "1234 Oak St, Keller, 76248",
        zip: "76248",
        notes: "Gate code 1234; dog",
        created_at: "2026-11-05T00:00:00Z",
        customers: { name: "Tal Test", phone: "214-555-0100", email: null },
      },
    ]);
    expect(ics).toContain("DTSTART;TZID=America/Chicago:20261107T130000");
    expect(ics).toContain("DTEND;TZID=America/Chicago:20261107T150000");
    expect(ics).toContain("SUMMARY:Tal Test · $162");
    expect(ics).toContain("LOCATION:1234 Oak St\\, Keller\\, 76248");
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });
});
