import { MousePointerClick, Wand2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useCVSelection } from "../provider/hook";

/** The summary is written on the resume itself: this only shows or hides it and says how to fill it. */
export default function SummaryPicker() {
  const { showSummary, setShowSummary, summaryBullets } = useCVSelection();
  const count = summaryBullets.filter((bullet) => bullet.trim()).length;

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">Show a summary</span>
          <span className="block text-[11px] text-muted-foreground">
            {count > 0 ? `${count} sentence${count > 1 ? "s" : ""} written` : "A few lines on who you are and what you bring"}
          </span>
        </span>
        <Switch checked={showSummary} onCheckedChange={setShowSummary} aria-label="Show the summary on the resume" />
      </label>

      <ul className="space-y-3 text-xs text-muted-foreground">
        <li className="flex gap-2.5">
          <MousePointerClick className="mt-0.5 size-4 shrink-0 text-brand" />
          <span><b className="text-foreground">Click the summary on the resume</b> to write it. Use the small buttons next to each line to add, move or remove one.</span>
        </li>
        <li className="flex gap-2.5">
          <Wand2 className="mt-0.5 size-4 shrink-0 text-brand" />
          <span><b className="text-foreground">AI rewrite</b> (top bar) writes one fitted to the job description.</span>
        </li>
      </ul>
    </div>
  );
}
