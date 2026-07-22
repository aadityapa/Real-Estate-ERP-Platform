"use client";

import Link from "next/link";
import { Building2, FileText, IndianRupee, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_NAME } from "@/lib/constants";

const features = [
  {
    icon: Building2,
    title: "My Bookings",
    description: "View booking status, unit details, and possession timeline.",
  },
  {
    icon: IndianRupee,
    title: "Payments",
    description: "Track payment schedule, receipts, and outstanding dues.",
  },
  {
    icon: FileText,
    title: "Documents",
    description: "Access agreements, demand letters, and project updates.",
  },
  {
    icon: Headphones,
    title: "Support",
    description: "Raise queries and connect with your relationship manager.",
  },
];

export default function PublicPortalPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-primary">{APP_NAME}</span>
          <Button variant="accent" asChild>
            <Link href="/login">Customer Login</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            Customer Portal
          </h1>
          <p className="mt-2 text-slate-600">
            Your one-stop destination for bookings, payments, and project
            updates.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <feature.icon className="h-5 w-5 text-accent" />
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
