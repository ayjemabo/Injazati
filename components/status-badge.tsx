import { getStatusLabel, getStatusTone } from "@/lib/dashboard";
import type { SubmissionStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={`badge badge-${getStatusTone(status)}`}>{getStatusLabel(status)}</span>
  );
}
