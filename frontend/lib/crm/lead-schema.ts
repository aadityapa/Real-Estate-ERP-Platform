import { z } from "zod";

export const leadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(10, "Valid phone required"),
  source: z.enum([
    "WEBSITE",
    "FACEBOOK",
    "GOOGLE",
    "WHATSAPP",
    "PORTAL",
    "WALKIN",
    "REFERRAL",
    "OTHER",
  ]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  location: z.string().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;
