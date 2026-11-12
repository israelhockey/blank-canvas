import { fireEvent, render, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }));
vi.mock("@/lib/db", () => ({ dbOrThrow: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }) }) }) }));
vi.mock("@/lib/admin-data", () => ({ saveSetting: mocks.save }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), message: vi.fn() } }));

import { GoogleCalendarConnection } from "@/components/admin/GoogleCalendarConnection";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("Google calendar subscription", () => {
  it("reuses the saved token without rotating other subscribers' access", async () => {
    const token = "a".repeat(48);
    mocks.read.mockResolvedValue({ data: { value: token }, error: null });
    const popup = { location: { href: "" }, opener: {}, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    const view = render(<GoogleCalendarConnection loading={false} onChange={() => undefined} />);
    fireEvent.click(view.getByRole("button"));
    await waitFor(() => expect(popup.location.href).toContain("calendar.google.com/calendar/r?cid="));
    expect(new URL(popup.location.href).searchParams.get("cid")).toBe(`webcal://simplesurfacecarpetcleaning.com/calendar-feed/${token}.ics`);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("saves a new private token before opening Google when no feed exists", async () => {
    mocks.read.mockResolvedValue({ data: null, error: null });
    mocks.save.mockResolvedValue(undefined);
    const popup = { location: { href: "" }, opener: {}, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    const view = render(<GoogleCalendarConnection loading={false} onChange={() => undefined} />);
    fireEvent.click(view.getByRole("button"));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith("calendar_token", expect.stringMatching(/^[a-f0-9]{48}$/)));
    await waitFor(() => expect(popup.location.href).toContain("calendar.google.com"));
  });
});