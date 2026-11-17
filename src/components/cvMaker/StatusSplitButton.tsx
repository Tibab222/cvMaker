import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { JobApplicationStatus } from "@shared/jobApplications.type";
import { useCVSelection } from "./provider/hook";

const NEXT_STATUS_MAP: Partial<Record<JobApplicationStatus, JobApplicationStatus>> = {
  [JobApplicationStatus.DRAFT]: JobApplicationStatus.APPLIED,
  [JobApplicationStatus.REVIEW]: JobApplicationStatus.APPLIED,
  [JobApplicationStatus.APPLIED]: JobApplicationStatus.INTERVIEW,
  [JobApplicationStatus.INTERVIEW]: JobApplicationStatus.OFFER,
  [JobApplicationStatus.OFFER]: JobApplicationStatus.ACCEPTED,
};

const STATUS_LABELS: Record<JobApplicationStatus, string> = {
  [JobApplicationStatus.DRAFT]: "Draft",
  [JobApplicationStatus.REVIEW]: "AI Review",
  [JobApplicationStatus.APPLIED]: "Applied",
  [JobApplicationStatus.INTERVIEW]: "Interview",
  [JobApplicationStatus.OFFER]: "Offer",
  [JobApplicationStatus.ACCEPTED]: "Accepted",
  [JobApplicationStatus.REJECTED]: "Rejected",
  [JobApplicationStatus.WITHDRAWN]: "Withdrawn",
  [JobApplicationStatus.ARCHIVED]: "Archived",
};

const ALL_STATUSES: JobApplicationStatus[] = [
  JobApplicationStatus.DRAFT,
  JobApplicationStatus.REVIEW,
  JobApplicationStatus.APPLIED,
  JobApplicationStatus.INTERVIEW,
  JobApplicationStatus.OFFER,
  JobApplicationStatus.ACCEPTED,
  JobApplicationStatus.REJECTED,
  JobApplicationStatus.WITHDRAWN,
  JobApplicationStatus.ARCHIVED,
];

export function StatusSplitButton() {
  const { applicationStatus, updateApplicationStatus } = useCVSelection();

  const nextStatus = NEXT_STATUS_MAP[applicationStatus];

  const handleQuickAdvance = () => {
    if (nextStatus) {
      updateApplicationStatus(nextStatus);
    }
  };

  const currentLabel = applicationStatus ? (STATUS_LABELS[applicationStatus] || applicationStatus) : "Draft";
  const nextLabel = nextStatus ? STATUS_LABELS[nextStatus] : null;

  return (
    <ButtonGroup aria-label="Application status">
      <Button
        variant="secondary"
        onClick={handleQuickAdvance}
        disabled={!nextStatus}
        title={
          nextStatus
            ? `Click to advance status to ${nextLabel}`
            : `Current status: ${currentLabel}. Use the dropdown to select another status.`
        }
        className="font-medium"
      >
        Status: {applicationStatus}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            className="px-2"
            title="Select status"
            aria-label="Select application status"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuRadioGroup
            value={applicationStatus}
            onValueChange={(status) => updateApplicationStatus(status as JobApplicationStatus)}
          >
            {ALL_STATUSES.map((status) => (
              <DropdownMenuRadioItem
                key={status}
                value={status}
                className="cursor-pointer"
              >
                <span>{STATUS_LABELS[status]}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}

export default StatusSplitButton;
