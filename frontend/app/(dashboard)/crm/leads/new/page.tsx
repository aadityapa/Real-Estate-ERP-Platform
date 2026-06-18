"use client";

import { useRouter } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { LeadForm } from "@/components/forms/lead-form";
import { useCreateLead } from "@/hooks/use-leads";
import type { LeadFormValues } from "@/components/forms/lead-form";

export default function NewLeadPage(): React.ReactElement {
  const router = useRouter();
  const createLead = useCreateLead();

  async function handleSubmit(data: LeadFormValues): Promise<void> {
    await createLead.mutateAsync(data);
    router.push("/crm/leads");
  }

  return (
    <PageLayout title="New Lead" back="/crm/leads">
      <LeadForm onSubmit={handleSubmit} loading={createLead.isPending} />
    </PageLayout>
  );
}
