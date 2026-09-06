import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Building2, FileText, Link2, Plus, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, useUiStore } from "@/store/ui";
import { useCVSelection } from "./provider/hook";

interface Props {
  defaultOpen?: boolean;
}

function Field({
  id,
  label,
  icon: Icon,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-1.5 text-xs">
        <Icon className="size-3.5 text-muted-foreground" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}

export default function NewDialog({ defaultOpen = false }: Props) {
    const { setSelectedTab, activeCvSessionId } = useUiStore();
  const { initJobMandate } = useCVSelection();
  const [open, setOpen] = useState(defaultOpen && !activeCvSessionId);
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ title?: string; company?: string }>({});

  const isSubmittingRef = useRef(false);

  const reset = () => {
    setTitle("");
    setCompany("");
    setUrl("");
    setDescription("");
    setErrors({});
  };

  const onClose = () => {
    setOpen(false);
    reset();
    setSelectedTab(Tabs.DASHBOARD);
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Job title is required";
    if (!company.trim()) next.company = "Company name is required";
    setErrors(next);
    if (next.title || next.company) return;

    isSubmittingRef.current = true;

    initJobMandate({
      title: title.trim(),
      company: company.trim(),
      url: url.trim(),
      description: description.trim(),
    });

    setOpen(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          if (!isSubmittingRef.current) {
            onClose();
          } else {
            isSubmittingRef.current = false;
          }
        } else {
          setOpen(true);
        }
      }}
    >
      <DialogContent className="bg-surface text-foreground sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a Resume</DialogTitle>
          <DialogDescription>
            Fill in the details of the job mandate or role you want to apply for.
          </DialogDescription>
        </DialogHeader>

        <motion.form
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          onSubmit={submit}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="job-title" label="Job title" icon={Type} required error={errors.title}>
              <Input
                id="job-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Senior Full-Stack Engineer"
                className="bg-surface-elevated/60"
                autoFocus
              />
            </Field>
            <Field
              id="job-company"
              label="Company name"
              icon={Building2}
              required
              error={errors.company}
            >
              <Input
                id="job-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Stripe"
                className="bg-surface-elevated/60"
              />
            </Field>
          </div>

          <Field id="job-url" label="Link to job mandate" icon={Link2}>
            <Input
              id="job-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://company.com/careers/role"
              className="bg-surface-elevated/60"
            />
          </Field>

          <Field id="job-description" label="Job description / mandate" icon={FileText}>
            <Textarea
              id="job-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the role description, requirements, stack…"
              className="min-h-36 bg-surface-elevated/60"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              <Plus className="size-4" /> Confirm
            </Button>
          </DialogFooter>
        </motion.form>
      </DialogContent>
    </Dialog>
  );
}
