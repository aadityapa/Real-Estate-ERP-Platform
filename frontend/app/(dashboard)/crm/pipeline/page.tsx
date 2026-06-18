"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { SalesPipeline } from "@/components/modules/crm/sales-pipeline";

export default function PipelinePage(): React.ReactElement {
  return (
    <PageLayout
      title="Sales Pipeline"
      back="/crm"
      actions={
        <Button variant="outline" asChild>
          <Link href="/crm/leads">List View</Link>
        </Button>
      }
    >
      <p className="text-sm text-slate-500">
        Drag leads between stages to update their status.
      </p>
      <SalesPipeline />
    </PageLayout>
  );
}
