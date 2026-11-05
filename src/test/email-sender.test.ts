import { afterEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@lovable.dev/email-js", () => ({
  sendLovableEmail: send,
  EmailAPIError: class extends Error {},
}));
vi.mock("@react-email/render", () => ({ render: vi.fn().mockResolvedValue("test") }));
vi.mock("@/lib/email-templates/registry", () => ({
  TEMPLATES: { test: { component: () => null, subject: "Test" } },
}));
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

afterEach(() => { vi.unstubAllEnvs(); send.mockClear(); });

describe("Email sender identity", () => {
  it("uses the requested sending domain", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "test-key");
    await sendTemplateEmail("test", "recipient@example.com");
    expect(send.mock.calls[0]?.[0].sender_domain).toBe("notify.simplesurfacecarpetcleaning.com");
  });
  it("uses the business sender name", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "test-key");
    await sendTemplateEmail("test", "recipient@example.com");
    expect(send.mock.calls[0]?.[0].from.name).toBe("Simple Surface Carpet Cleaning");
  });
  it("defaults replies to the business inbox", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "test-key");
    await sendTemplateEmail("test", "recipient@example.com");
    expect(send.mock.calls[0]?.[0].reply_to).toBe("simplesurfacellc@gmail.com");
  });
});