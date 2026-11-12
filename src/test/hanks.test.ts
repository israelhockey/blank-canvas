import { describe, expect, it } from "vitest";

import { parseHanks, windowFor } from "@/lib/hanks";

const MSG = `Sub job: Mon 11/16, 11 AM - Carpet cleaning 2 rooms + 3 master closets - ARGYLE - pays $100. Reply YES to take it. It's yours! Mon 11/16, 11 AM - Carpet cleaning 2 rooms + 3 master closets - Derek DeGuire, 784 CIMARRON COURT, ARGYLE, TX 76226. Access: Gate code is 1031 Text this number when you're on the way with your ETA (e.g. "On the way, ETA 2 PM").`;
const today = new Date(2026, 10, 12);

describe("parseHanks", () => {
  it("reads the full message", () => {
    const j = parseHanks(MSG, today);
    expect(j).toMatchObject({
      date: "2026-11-16",
      time: "11 AM",
      window: "11am–1pm",
      work: "Carpet cleaning 2 rooms + 3 master closets",
      pay: 100,
      name: "Derek DeGuire",
      street: "784 Cimarron Court",
      city: "Argyle",
      zip: "76226",
      access: "Gate code is 1031",
    });
    expect(j.extra).toMatch(/^Text this number/);
  });
  it("reads the offer alone", () => {
    const j = parseHanks(
      "Sub job: Tue 12/2, 1:30 PM - Sofa cleaning - KELLER - pays $85. Reply YES to take it.",
      today,
    );
    expect(j).toMatchObject({ date: "2026-12-02", time: "1:30 PM", city: "Keller", pay: 85 });
    expect(j.work).toBe("Sofa cleaning");
    expect(j.name).toBe("");
  });
  it("reads the confirmation alone, with line breaks", () => {
    const j = parseHanks(
      "It's yours!\nFri 1/9, 9 AM - Carpet cleaning 4 rooms - Jane Roe, 12 Oak St, Apt 4, Denton, TX 76201.\nAccess: Lockbox 5521",
      today,
    );
    expect(j).toMatchObject({
      date: "2027-01-09",
      window: "9–11am",
      name: "Jane Roe",
      street: "12 Oak St, Apt 4",
      city: "Denton",
      zip: "76201",
      access: "Lockbox 5521",
    });
  });
  it("maps times to our windows", () => {
    expect(windowFor("8 AM")).toBe("9–11am");
    expect(windowFor("2 PM")).toBe("1–3pm");
    expect(windowFor("5 PM")).toBe("3–5pm");
  });
});
