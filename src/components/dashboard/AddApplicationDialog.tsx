import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format, subDays } from "date-fns";
import { ArrowRight, BriefcaseBusiness, Building2, CalendarDays, Link2, Loader2, Pencil, Plus, TriangleAlert, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { collectSuggestions, fold } from "@/lib/suggest";
import {
  APPLICATION_CHANNELS,
  ApplicationChannel,
  JobApplicationStatus,
  PAST_APPLICATION_STATUSES,
  type Application,
} from "@shared/jobApplications.type";
import { parseDbDate } from "@shared/utils";
import { STATUS_META } from "./mapApplicationToJabCard";
import SuggestInput from "./SuggestInput";
import { useDashboard } from "./provider/hook";

const dayString = (date: Date) => format(date, "yyyy-MM-dd");
const NO_CHANNEL = "none";

/** The channel a pasted link gives away. */
function channelFromUrl(url: string): ApplicationChannel | null {
  const host = url.toLowerCase();
  if (/linkedin\./.test(host)) return ApplicationChannel.LINKEDIN;
  if (/indeed\./.test(host)) return ApplicationChannel.INDEED;
  if (/(glassdoor|jobillico|jobboom|monster|talent\.com|welcometothejungle|wttj|guichetemplois|workopolis|ziprecruiter|adzuna)\./.test(host)) return ApplicationChannel.JOB_BOARD;
  if (/(greenhouse\.io|lever\.co|ashbyhq\.com|myworkdayjobs\.com|smartrecruiters\.com|workable\.com|bamboohr\.com|taleo\.net|icims\.com)/.test(host)) return ApplicationChannel.COMPANY_SITE;
  return null;
}

interface FormState {
  company: string;
  title: string;
  appliedOn: string;
  status: JobApplicationStatus;
  channel: ApplicationChannel | null;
  url: string;
  description: string;
  salary: string;
}

const emptyForm = (keep?: Pick<FormState, "appliedOn" | "channel">): FormState => ({
  company: "",
  title: "",
  appliedOn: keep?.appliedOn ?? dayString(new Date()),
  status: JobApplicationStatus.APPLIED,
  channel: keep?.channel ?? null,
  url: "",
  description: "",
  salary: "",
});

/** The form filled with what an application already says, to correct it. */
const formOf = (application: Application): FormState => {
  const applied = parseDbDate(application.applied_at);
  return {
    company: application.company_name,
    title: application.job_title,
    appliedOn: dayString(applied ?? new Date()),
    status: application.status,
    channel: application.channel ?? null,
    url: application.url ?? "",
    description: application.description ?? "",
    salary: application.salary != null ? String(application.salary) : "",
  };
};

const time = (application: Application) => parseDbDate(application.applied_at ?? application.created_at)?.getTime() ?? 0;

/**
 * Adds an application sent outside the app (or before using it) to the pipeline, or, given one, corrects it:
 * a wrong company read by the extension, a missing link, the offer text, the date it was sent.
 */
export default function AddApplicationDialog({ open, onOpenChange, application = null }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The application to edit; none to add a new one. */
  application?: Application | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        {/* mounted on each opening: the form starts from the application shown now, or empty */}
        {open && <ApplicationForm key={application?.id ?? "new"} application={application} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ApplicationForm({ application, onClose }: { application: Application | null; onClose: () => void }) {
  const { applications, addPastApplication, editApplication, openApplication } = useDashboard();
  const editing = application !== null;
  const sent = !editing || !!application.applied_at;
  const [initial] = useState<FormState>(() => (application ? formOf(application) : emptyForm()));
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"close" | "another" | null>(null);
  const [channelTouched, setChannelTouched] = useState(editing);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  // made in the resume editor: its offer text lives in the resume session, not on the row
  const [sessionText, setSessionText] = useState<string | null>(null);
  useEffect(() => {
    if (!application?.json_file_path || application.description) return;
    let cancelled = false;
    api.getCVSession(application.id).then((session) => {
      const text = session?.jobInfos?.description ?? "";
      if (cancelled || !text) return;
      setSessionText(text);
      setForm((current) => (current.description ? current : { ...current, description: text }));
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [application]);

  const companies = useMemo(() => collectSuggestions(applications.map((a) => ({ value: a.company_name, at: time(a) }))), [applications]);

  // titles already used at the company being typed come first
  const titles = useMemo(() => {
    const company = fold(form.company);
    const here = collectSuggestions(applications.filter((a) => company && fold(a.company_name) === company).map((a) => ({ value: a.job_title, at: time(a) })))
      .map((suggestion) => ({ ...suggestion, hint: `at ${form.company.trim()}` }));
    const seen = new Set(here.map((suggestion) => fold(suggestion.value)));
    const everywhere = collectSuggestions(applications.map((a) => ({ value: a.job_title, at: time(a) }))).filter((s) => !seen.has(fold(s.value)));
    return [...here, ...everywhere];
  }, [applications, form.company]);

  const duplicate = useMemo(() => {
    const company = fold(form.company);
    const title = fold(form.title);
    if (!company || !title) return null;
    return applications.find((a) => a.id !== application?.id && fold(a.company_name) === company && fold(a.job_title) === title) ?? null;
  }, [application, applications, form.company, form.title]);

  const today = dayString(new Date());
  const quickDays = [
    { label: "Today", value: today },
    { label: "Yesterday", value: dayString(subDays(new Date(), 1)) },
    { label: "A week ago", value: dayString(subDays(new Date(), 7)) },
  ];

  const close = onClose;

  const submit = async (mode: "close" | "another") => {
    if (!form.company.trim() || !form.title.trim()) {
      setError(!form.company.trim() ? "Which company did you apply to?" : "Which position did you apply for?");
      return;
    }
    if (application) {
      setSaving("close");
      const descriptionBefore = initial.description || sessionText || "";
      const result = await editApplication(application.id, {
        company: form.company,
        title: form.title,
        url: form.url,
        channel: form.channel,
        salary: form.salary,
        ...(sent ? { appliedOn: form.appliedOn } : {}),
        // sent only when changed: an offer text still loading must not erase the one in the resume session
        ...(form.description !== descriptionBefore ? { description: form.description } : {}),
      });
      setSaving(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Application updated");
      close();
      return;
    }
    setSaving(mode);
    const result = await addPastApplication({
      company: form.company,
      title: form.title,
      appliedOn: form.appliedOn,
      status: form.status,
      channel: form.channel,
      url: form.url,
      description: form.description,
    });
    setSaving(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(`${result.application.job_title} at ${result.application.company_name} added`);
    if (mode === "another") {
      // entering a batch of old applications: date and channel are often the same from one to the next
      setForm(emptyForm({ appliedOn: form.appliedOn, channel: form.channel }));
      document.getElementById("add-app-company")?.focus();
    } else {
      close();
    }
  };

  return (
    <>
        <DialogHeader className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-muted text-brand">{editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}</span>
            {editing ? "Edit application" : "Add an application"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Fix what was saved wrong: the company, the position, the link… The status is changed from the application panel."
              : "One you sent without CVMaker, or before using it. Only the company and the position are needed."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="add-application-form"
          className="grid gap-4 px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit("close");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="add-app-company">Company <span className="text-destructive">*</span></Label>
              <SuggestInput
                id="add-app-company"
                value={form.company}
                onChange={(value) => set("company", value)}
                suggestions={companies}
                placeholder="e.g. Desjardins"
                icon={Building2}
                autoFocus
                invalid={error?.startsWith("Which company") ?? false}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="add-app-title">Position <span className="text-destructive">*</span></Label>
              <SuggestInput
                id="add-app-title"
                value={form.title}
                onChange={(value) => set("title", value)}
                suggestions={titles}
                placeholder="e.g. DevOps Engineer"
                icon={BriefcaseBusiness}
                invalid={error?.startsWith("Which position") ?? false}
              />
            </div>
          </div>

          <AnimatePresence>
            {duplicate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                  <TriangleAlert className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    Already in your pipeline ({STATUS_META[duplicate.status]?.label ?? duplicate.status}
                    {duplicate.applied_at && parseDbDate(duplicate.applied_at) ? `, applied ${format(parseDbDate(duplicate.applied_at)!, "d MMM yyyy")}` : ""}). {editing ? "Same company and position as this one." : "Add it again only if you applied twice."}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 shrink-0 gap-1 px-2 text-xs"
                    onClick={() => {
                      close();
                      openApplication(duplicate.id);
                    }}
                  >
                    Open it <ArrowRight className="size-3" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {sent && <div className="grid gap-1.5">
            <Label htmlFor="add-app-date">Applied on <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-44">
                <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="add-app-date"
                  type="date"
                  className="pl-9"
                  value={form.appliedOn}
                  max={today}
                  min="1990-01-01"
                  required
                  onChange={(event) => set("appliedOn", event.target.value)}
                />
              </div>
              {quickDays.map((day) => (
                <button
                  key={day.label}
                  type="button"
                  onClick={() => set("appliedOn", day.value)}
                  className={cn(
                    "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
                    form.appliedOn === day.value ? "border-brand bg-brand-muted text-brand" : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="add-app-channel">How did you apply?</Label>
              <Select
                value={form.channel ?? NO_CHANNEL}
                onValueChange={(value) => {
                  setChannelTouched(true);
                  set("channel", value === NO_CHANNEL ? null : (value as ApplicationChannel));
                }}
              >
                <SelectTrigger id="add-app-channel" className="w-full">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_CHANNEL} className="text-muted-foreground">Not sure</SelectItem>
                  {APPLICATION_CHANNELS.map((channel) => (
                    <SelectItem key={channel.value} value={channel.value}>{channel.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editing ? (
              <div className="grid gap-1.5">
                <Label htmlFor="add-app-salary">Salary <span className="font-normal text-muted-foreground">(yearly)</span></Label>
                <div className="relative">
                  <Wallet className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="add-app-salary"
                    className="pl-9"
                    inputMode="decimal"
                    placeholder="e.g. 85000 or 85k"
                    value={form.salary}
                    aria-invalid={error?.includes("salary") || undefined}
                    onChange={(event) => set("salary", event.target.value)}
                  />
                </div>
              </div>
            ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="add-app-status">Where it stands</Label>
              <Select value={form.status} onValueChange={(value) => set("status", value as JobApplicationStatus)}>
                <SelectTrigger id="add-app-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAST_APPLICATION_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{STATUS_META[status].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="add-app-url">Link to the offer <span className="font-normal text-muted-foreground">(if you have it)</span></Label>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="add-app-url"
                className="pl-9"
                inputMode="url"
                placeholder="https://…"
                value={form.url}
                aria-invalid={error?.includes("link") || error?.includes("web address") || undefined}
                onChange={(event) => {
                  const url = event.target.value;
                  set("url", url);
                  // a LinkedIn or Indeed link says how it was sent, unless the user already chose
                  const guessed = channelFromUrl(url);
                  if (guessed && !channelTouched) setForm((current) => ({ ...current, url, channel: guessed }));
                }}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="add-app-description">Description / mandate <span className="font-normal text-muted-foreground">{editing ? "(the offer text)" : "(if you remember it)"}</span></Label>
            <Textarea
              id="add-app-description"
              rows={4}
              className="max-h-60 resize-y text-sm"
              placeholder="Paste the offer, or what you remember of it. Its keywords feed your market stats."
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </form>

        <DialogFooter className="m-0 border-t border-border/70 px-6 py-4">
          {editing ? (
            <Button type="button" variant="outline" disabled={saving !== null} onClick={close}>
              Cancel
            </Button>
          ) : (
            <Button type="button" variant="outline" disabled={saving !== null} onClick={() => void submit("another")} className="gap-1.5">
              {saving === "another" ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Save and add another
            </Button>
          )}
          <Button type="submit" form="add-application-form" disabled={saving !== null} className="gap-1.5">
            {saving === "close" && <Loader2 className="size-4 animate-spin" />} {editing ? "Save changes" : "Add application"}
          </Button>
        </DialogFooter>
    </>
  );
}
