import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { JobApplicationStatus } from "@shared/jobApplications.type";
import { useCVSelection } from "../provider/hook";

const NEXT_STATUS: Partial<Record<JobApplicationStatus, JobApplicationStatus>> = {
  [JobApplicationStatus.DRAFT]: JobApplicationStatus.APPLIED,
  [JobApplicationStatus.REVIEW]: JobApplicationStatus.APPLIED,
  [JobApplicationStatus.APPLIED]: JobApplicationStatus.INTERVIEW,
  [JobApplicationStatus.INTERVIEW]: JobApplicationStatus.OFFER,
  [JobApplicationStatus.OFFER]: JobApplicationStatus.ACCEPTED,
};

/** Label and dot colour of each status, in the order of the menu. */
const STATUSES: { value: JobApplicationStatus; label: string; dot: string }[] = [
  { value: JobApplicationStatus.DRAFT, label: "Draft", dot: "bg-slate-400" },
  { value: JobApplicationStatus.REVIEW, label: "AI review", dot: "bg-violet-500" },
  { value: JobApplicationStatus.APPLIED, label: "Applied", dot: "bg-blue-500" },
  { value: JobApplicationStatus.INTERVIEW, label: "Interview", dot: "bg-amber-500" },
  { value: JobApplicationStatus.OFFER, label: "Offer", dot: "bg-emerald-500" },
  { value: JobApplicationStatus.ACCEPTED, label: "Accepted", dot: "bg-emerald-600" },
  { value: JobApplicationStatus.REJECTED, label: "Rejected", dot: "bg-red-500" },
  { value: JobApplicationStatus.NO_RESPONSE, label: "No response", dot: "bg-zinc-400" },
  { value: JobApplicationStatus.WITHDRAWN, label: "Withdrawn", dot: "bg-zinc-400" },
  { value: JobApplicationStatus.ARCHIVED, label: "Archived", dot: "bg-zinc-300" },
];

const statusInfo = (status: JobApplicationStatus | undefined) =>
  STATUSES.find((item) => item.value === status) ?? STATUSES[0];

/** Where the application stands. The next usual step is offered first, the others below. */
export default function StatusMenu() {
  const { applicationStatus, updateApplicationStatus } = useCVSelection();
  const current = statusInfo(applicationStatus);
  const next = NEXT_STATUS[applicationStatus];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 rounded-full pl-3 pr-2.5" title="Application status">
          <span className={cn("size-2 rounded-full", current.dot)} />
          {current.label}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {next && (
          <>
            <DropdownMenuItem onSelect={() => updateApplicationStatus(next)} className="cursor-pointer font-medium">
              <ArrowRight className="size-4 text-brand" />
              Mark as {statusInfo(next).label.toLowerCase()}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Application status</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={applicationStatus}
          onValueChange={(status) => updateApplicationStatus(status as JobApplicationStatus)}
        >
          {STATUSES.map((status) => (
            <DropdownMenuRadioItem key={status.value} value={status.value} className="cursor-pointer">
              <span className={cn("size-2 rounded-full", status.dot)} />
              {status.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
