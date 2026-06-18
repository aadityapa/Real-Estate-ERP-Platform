import { cn } from "@/lib/utils";

const styles = {
  HOT: "bg-red-100 text-red-700 border-red-200",
  WARM: "bg-amber-100 text-amber-700 border-amber-200",
  COLD: "bg-blue-100 text-blue-700 border-blue-200",
  LOST: "bg-gray-100 text-gray-500 border-gray-200",
} as const;

export function LeadLabelBadge({
  label,
}: {
  label: keyof typeof styles;
}): React.ReactElement {
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-xs font-semibold",
        styles[label] ?? styles.WARM,
      )}
    >
      {label}
    </span>
  );
}

const callStyles = {
  ANSWERED: "bg-green-100 text-green-700",
  MISSED: "bg-red-100 text-red-700",
  PENDING: "bg-slate-100 text-slate-600",
} as const;

export function CallStatusBadge({
  status,
}: {
  status: keyof typeof callStyles;
}): React.ReactElement {
  return (
    <span
      className={cn(
        "rounded px-2 py-0.5 text-xs font-medium",
        callStyles[status] ?? callStyles.PENDING,
      )}
    >
      {status}
    </span>
  );
}
