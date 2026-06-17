"use client";

import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { useLeads, type Lead } from "@/hooks/use-leads";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/tables/filter-bar";
import { cn } from "@/lib/utils";

const PIPELINE_STAGES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "SITE_VISIT",
  "NEGOTIATION",
  "BOOKING",
  "AGREEMENT",
  "LOST",
] as const;

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  SITE_VISIT: "Site Visit",
  NEGOTIATION: "Negotiation",
  BOOKING: "Booking",
  AGREEMENT: "Agreement",
  LOST: "Lost",
};

export function SalesPipeline(): React.ReactElement {
  const { data, isLoading } = useLeads({ limit: 100 });
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const leads = data?.data ?? [];
  const activeLead = leads.find((l) => l.id === activeId);

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;
    if (!PIPELINE_STAGES.includes(newStatus as (typeof PIPELINE_STAGES)[number])) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    await api.patch(`/crm/leads/${leadId}`, { status: newStatus });
    void queryClient.invalidateQueries({ queryKey: ["leads"] });
    void queryClient.invalidateQueries({ queryKey: ["lead-pipeline"] });
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">Loading pipeline...</div>
    );
  }

  const grouped = PIPELINE_STAGES.reduce(
    (acc, stage) => {
      acc[stage] = leads.filter((l) => l.status === stage);
      return acc;
    },
    {} as Record<string, Lead[]>,
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            label={STAGE_LABELS[stage] ?? stage}
            leads={grouped[stage] ?? []}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function PipelineColumn({
  stage,
  label,
  leads,
}: {
  stage: string;
  label: string;
  leads: Lead[];
}): React.ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[260px] flex-1 rounded-xl border border-border bg-slate-50",
        isOver && "ring-2 ring-accent",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium">
          {leads.length}
        </span>
      </div>
      <div className="min-h-[200px] space-y-2 p-3">
        {leads.map((lead) => (
          <DraggableLeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

function DraggableLeadCard({ lead }: { lead: Lead }): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <LeadCard lead={lead} isDragging={isDragging} />
    </div>
  );
}

function LeadCard({
  lead,
  isDragging,
}: {
  lead: Lead;
  isDragging?: boolean;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-sm",
        isDragging && "opacity-60",
      )}
    >
      <Link href={`/crm/leads/${lead.id}`} className="block">
        <p className="font-medium text-slate-900">
          {lead.firstName} {lead.lastName ?? ""}
        </p>
        <p className="text-xs text-slate-500">{lead.phone}</p>
        <div className="mt-2 flex items-center justify-between">
          <StatusBadge status={lead.priority} />
          <span className="text-xs text-slate-400">{lead.source}</span>
        </div>
      </Link>
    </div>
  );
}
