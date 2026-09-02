export type ColumnId =
  | "backlog"
  | "ai-review"
  | "applied"
  | "interviewing"
  | "offer"
  | "archived";

export interface TimelineEvent {
  at: string;
  label: string;
  file?: string;
}

export interface JobCard {
  id: string;
  title: string;
  company: string;
  logo: string;
  match: number;
  dateTag: string;
  stack: string[];
  status: { label: string; tone: "info" | "warn" | "ok" }[];
  column: ColumnId;
  salary: string;
  url: string;
  appliedAt: string;
  resume: string;
  timeline: TimelineEvent[];
  notes: string;
}

export const COLUMNS: { id: ColumnId; label: string; hint: string }[] = [
  { id: "backlog", label: "Backlog", hint: "Raw job offers" },
  { id: "ai-review", label: "AI Review", hint: "Needs human validation" },
  { id: "applied", label: "Applied", hint: "Submitted to employer" },
  { id: "interviewing", label: "Interviewing", hint: "Screening → HR" },
  { id: "offer", label: "Offer Received", hint: "Negotiation" },
  { id: "archived", label: "Archived", hint: "Rejected / closed" },
];

export const JOBS: JobCard[] = [
  {
    id: "j1",
    title: "Senior Full-Stack Engineer",
    company: "Stripe",
    logo: "ST",
    match: 92,
    dateTag: "Applied Sep 2",
    stack: ["React", "Node.js", "PostgreSQL"],
    status: [
      { label: "CV v2 Generated", tone: "ok" },
      { label: "Follow-up due", tone: "warn" },
    ],
    column: "applied",
    salary: "$165k – $195k",
    url: "https://stripe.com/jobs",
    appliedAt: "Sep 2, 2026",
    resume: "v2_fullstack_stripe.pdf",
    timeline: [
      { at: "Sep 2, 09:15 AM", label: "Job imported & analyzed by local LLM" },
      { at: "Sep 2, 09:16 AM", label: "Customized CV generated", file: "v1_fullstack.pdf" },
      { at: "Sep 3, 10:00 AM", label: "Applied via LinkedIn" },
      { at: "Sep 12, 08:00 AM", label: "No response — follow-up suggested" },
    ],
    notes: "Recruiter: Dana Lee. Ask about payments infra team split and on-call rotation.",
  },
  {
    id: "j2",
    title: "Platform Engineer (LLM Infra)",
    company: "Vercel",
    logo: "VC",
    match: 88,
    dateTag: "Imported Sep 8",
    stack: ["Python", "LLMs", "Kubernetes"],
    status: [{ label: "Awaiting AI pass", tone: "info" }],
    column: "backlog",
    salary: "$150k – $180k",
    url: "https://vercel.com/careers",
    appliedAt: "—",
    resume: "—",
    timeline: [{ at: "Sep 8, 07:42 PM", label: "Job imported from RSS feed" }],
    notes: "",
  },
  {
    id: "j3",
    title: "Backend Engineer, Geo Systems",
    company: "Mapbox",
    logo: "MB",
    match: 79,
    dateTag: "Drafted Sep 6",
    stack: ["NestJS", "PostGIS", "TypeScript"],
    status: [{ label: "CV v1 Generated", tone: "ok" }],
    column: "ai-review",
    salary: "$140k – $170k",
    url: "https://mapbox.com/careers",
    appliedAt: "—",
    resume: "v1_geo_mapbox.pdf",
    timeline: [
      { at: "Sep 6, 11:02 AM", label: "Job imported & analyzed by local LLM" },
      { at: "Sep 6, 11:04 AM", label: "Customized CV generated", file: "v1_geo_mapbox.pdf" },
    ],
    notes: "Emphasise PostGIS tiling work from the mapping side project.",
  },
  {
    id: "j4",
    title: "Systems Engineer, C++ Runtime",
    company: "Nvidia",
    logo: "NV",
    match: 71,
    dateTag: "Applied Aug 28",
    stack: ["C++", "CUDA", "Python"],
    status: [{ label: "Screening passed", tone: "ok" }],
    column: "interviewing",
    salary: "$175k – $210k",
    url: "https://nvidia.com/careers",
    appliedAt: "Aug 28, 2026",
    resume: "v3_systems_nvidia.pdf",
    timeline: [
      { at: "Aug 28, 08:10 AM", label: "Job imported & analyzed by local LLM" },
      { at: "Aug 28, 08:12 AM", label: "Customized CV generated", file: "v3_systems_nvidia.pdf" },
      { at: "Aug 29, 09:30 AM", label: "Applied via company portal" },
      { at: "Sep 10, 02:30 PM", label: "HR Screening Interview scheduled" },
    ],
    notes: "Technical round: memory model + lock-free queues. Salary target 195k.",
  },
  {
    id: "j5",
    title: "Full-Stack Engineer, AI Tools",
    company: "Linear",
    logo: "LN",
    match: 84,
    dateTag: "Applied Aug 20",
    stack: ["React", "GraphQL", "Node.js"],
    status: [{ label: "Offer pending signature", tone: "ok" }],
    column: "offer",
    salary: "$158k – $186k",
    url: "https://linear.app/careers",
    appliedAt: "Aug 20, 2026",
    resume: "v2_ai_tools_linear.pdf",
    timeline: [
      { at: "Aug 20, 10:00 AM", label: "Applied via referral" },
      { at: "Aug 27, 03:00 PM", label: "Technical interview completed" },
      { at: "Sep 9, 05:15 PM", label: "Offer received" },
    ],
    notes: "Equity refresh unclear — ask about vesting cliff.",
  },
  {
    id: "j6",
    title: "Senior Software Engineer",
    company: "Datadog",
    logo: "DD",
    match: 63,
    dateTag: "Closed Aug 14",
    stack: ["Go", "PostgreSQL", "AWS"],
    status: [{ label: "Rejected after screen", tone: "warn" }],
    column: "archived",
    salary: "$150k – $175k",
    url: "https://datadoghq.com/careers",
    appliedAt: "Aug 5, 2026",
    resume: "v1_backend_datadog.pdf",
    timeline: [
      { at: "Aug 5, 09:00 AM", label: "Applied via job board" },
      { at: "Aug 14, 04:20 PM", label: "Rejection email received" },
    ],
    notes: "Gap called out: no production AWS ownership.",
  },
  {
    id: "j7",
    title: "Product Engineer",
    company: "Supabase",
    logo: "SB",
    match: 90,
    dateTag: "Imported Sep 11",
    stack: ["TypeScript", "PostgreSQL", "Deno"],
    status: [{ label: "High affinity", tone: "info" }],
    column: "backlog",
    salary: "$135k – $165k",
    url: "https://supabase.com/careers",
    appliedAt: "—",
    resume: "—",
    timeline: [{ at: "Sep 11, 06:20 AM", label: "Job imported & analyzed by local LLM" }],
    notes: "",
  },
  {
    id: "j8",
    title: "AI Application Engineer",
    company: "Anthropic",
    logo: "AN",
    match: 86,
    dateTag: "Applied Sep 1",
    stack: ["Python", "LLMs", "React"],
    status: [{ label: "Technical round Sep 15", tone: "info" }],
    column: "interviewing",
    salary: "$180k – $220k",
    url: "https://anthropic.com/careers",
    appliedAt: "Sep 1, 2026",
    resume: "v4_ai_apps.pdf",
    timeline: [
      { at: "Sep 1, 08:40 AM", label: "Job imported & analyzed by local LLM" },
      { at: "Sep 1, 08:43 AM", label: "Customized CV generated", file: "v4_ai_apps.pdf" },
      { at: "Sep 2, 09:00 AM", label: "Applied via careers page" },
      { at: "Sep 8, 01:00 PM", label: "Recruiter screen completed" },
    ],
    notes: "Prep: evals, retrieval pipelines, local inference tradeoffs.",
  },
];

export const SKILL_DEMAND = [
  { name: "PostgreSQL", demand: 85, jobs: 20, inProfile: true },
  { name: "React", demand: 82, jobs: 19, inProfile: true },
  { name: "TypeScript", demand: 78, jobs: 18, inProfile: true },
  { name: "AWS", demand: 60, jobs: 14, inProfile: false },
  { name: "Node.js", demand: 58, jobs: 13, inProfile: true },
  { name: "Kubernetes", demand: 44, jobs: 10, inProfile: false },
  { name: "Python", demand: 41, jobs: 9, inProfile: true },
  { name: "C++", demand: 22, jobs: 5, inProfile: true },
];

export const SKILL_GAPS = ["AWS", "Kubernetes", "Terraform", "gRPC", "Kafka"];

export const REMINDERS = [
  {
    id: "r1",
    kind: "followup" as const,
    title: "Follow up with Stripe",
    detail: "Full-Stack role — 12 days since application",
    meta: "12 days",
  },
  {
    id: "r2",
    kind: "followup" as const,
    title: "Follow up with Mapbox",
    detail: "CV v1 generated but never submitted",
    meta: "11 days",
  },
  {
    id: "r3",
    kind: "interview" as const,
    title: "HR Screening — Nvidia",
    detail: "Uses v3_systems_nvidia.pdf",
    meta: "in 2 days",
  },
  {
    id: "r4",
    kind: "interview" as const,
    title: "Technical Round — Anthropic",
    detail: "Uses v4_ai_apps.pdf",
    meta: "in 4 days",
  },
];
