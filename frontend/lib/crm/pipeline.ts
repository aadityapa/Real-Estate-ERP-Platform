/**
 * Pure helpers for CRM pipeline stage moves (unit-testable without DnD).
 */

export const PIPELINE_STAGES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "SITE_VISIT",
  "NEGOTIATION",
  "BOOKING",
  "AGREEMENT",
  "LOST",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export function isPipelineStage(value: string): value is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(value);
}

/**
 * Returns the new status to persist after a drag, or null if nothing should change.
 */
export function resolvePipelineStageMove(
  lead: { id: string; status: string } | undefined,
  overId: string | null | undefined,
): PipelineStage | null {
  if (!lead || !overId || !isPipelineStage(overId)) return null;
  if (lead.status === overId) return null;
  return overId;
}

export async function commitPipelineStageMove(options: {
  leadId: string;
  newStatus: string;
  patch: (path: string, body: { status: string }) => Promise<unknown>;
  onSuccess?: () => void;
}): Promise<void> {
  await options.patch(`/crm/leads/${options.leadId}`, {
    status: options.newStatus,
  });
  options.onSuccess?.();
}
