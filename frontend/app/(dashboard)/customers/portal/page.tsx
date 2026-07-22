"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CustomerPortalLandingPage(): React.ReactElement {
  return (
    <PageLayout
      title="Customer Portal"
      actions={
        <Button variant="accent" asChild>
          <Link href="/portal">Preview Public Portal</Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Portal Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Manage customer portal access, document sharing, payment
              statements, and booking status visibility from this section.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Active Portal Users", value: "156" },
                { label: "Documents Shared", value: "428" },
                { label: "Pending Invites", value: "12" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border p-4"
                >
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
