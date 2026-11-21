/**
 * Light "journey" palette: the trunk is purple and deepens with time, each job gets its own hue
 * (its projects share it), degrees are sky blue, personal projects pink, new skills green and
 * milestones gold.
 */
export const TL = {
  trunkStops: ["#e9d5ff", "#a78bfa", "#7c3aed", "#4c1d95"],
  jobs: ["#7c3aed", "#4f46e5", "#c026d3", "#9333ea", "#2563eb", "#db2777"],
  education: "#0ea5e9",
  personal: "#ec4899",
  skill: "#10b981",
  milestone: "#f59e0b",
} as const;
