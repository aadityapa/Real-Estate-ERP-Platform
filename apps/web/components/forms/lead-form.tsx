"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const leadSchema = z.object({
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

interface LeadFormProps {
  defaultValues?: Partial<LeadFormValues>;
  onSubmit: (data: LeadFormValues) => Promise<void>;
  loading?: boolean;
}

export function LeadForm({
  defaultValues,
  onSubmit,
  loading,
}: LeadFormProps): React.ReactElement {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      source: "WEBSITE",
      priority: "MEDIUM",
      ...defaultValues,
    },
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="First Name" error={errors.firstName?.message}>
              <input {...register("firstName")} className={inputClass} />
            </Field>
            <Field label="Last Name" error={errors.lastName?.message}>
              <input {...register("lastName")} className={inputClass} />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input {...register("phone")} className={inputClass} />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input {...register("email")} type="email" className={inputClass} />
            </Field>
            <Field label="Source" error={errors.source?.message}>
              <select {...register("source")} className={inputClass}>
                {[
                  "WEBSITE",
                  "FACEBOOK",
                  "GOOGLE",
                  "WHATSAPP",
                  "PORTAL",
                  "WALKIN",
                  "REFERRAL",
                  "OTHER",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority" error={errors.priority?.message}>
              <select {...register("priority")} className={inputClass}>
                {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location" className="md:col-span-2">
              <input {...register("location")} className={inputClass} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button type="submit" variant="accent" disabled={loading}>
              {loading ? "Saving..." : "Save Lead"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const inputClass =
  "w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent";

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
