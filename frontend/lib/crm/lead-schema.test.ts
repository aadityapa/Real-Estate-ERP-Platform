import { describe, expect, it } from "vitest";
import { leadSchema } from "@/lib/crm/lead-schema";

describe("leadSchema (Zod)", () => {
  it("accepts a valid lead payload", () => {
    const parsed = leadSchema.safeParse({
      firstName: "Rahul",
      phone: "9876543210",
      source: "WEBSITE",
      priority: "HIGH",
      email: "rahul@email.com",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects missing first name and short phone", () => {
    const parsed = leadSchema.safeParse({
      firstName: "",
      phone: "123",
      source: "WEBSITE",
      priority: "MEDIUM",
    });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      expect(fields.firstName?.[0]).toMatch(/required/i);
      expect(fields.phone?.[0]).toMatch(/phone/i);
    }
  });

  it("allows empty email string but rejects invalid email", () => {
    expect(
      leadSchema.safeParse({
        firstName: "A",
        phone: "9876543210",
        source: "WALKIN",
        priority: "LOW",
        email: "",
      }).success,
    ).toBe(true);

    expect(
      leadSchema.safeParse({
        firstName: "A",
        phone: "9876543210",
        source: "WALKIN",
        priority: "LOW",
        email: "not-an-email",
      }).success,
    ).toBe(false);
  });
});
