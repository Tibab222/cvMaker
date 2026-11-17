import { ADZUNA_COUNTRIES, JobSourceKind, type DiscoveredJob } from "@shared/discovery.types";
import { cn } from "@/lib/utils";

/** Adzuna asks that each listing from its API is labelled "Adzuna" and links back to its local site. */
export default function AdzunaAttribution({ job, className }: { job: DiscoveredJob; className?: string }) {
  if (job.source_kind !== JobSourceKind.ADZUNA) return null;
  const site = ADZUNA_COUNTRIES.find((country) => country.code === job.source_country)?.site ?? "https://www.adzuna.com";
  return (
    <a
      href={site}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      title="Found through the Adzuna job search API"
      className={cn("inline-flex items-center rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-semibold text-orange-700 hover:bg-orange-500/20", className)}
    >
      Jobs by Adzuna
    </a>
  );
}
