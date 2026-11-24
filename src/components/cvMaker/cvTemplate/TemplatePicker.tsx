import { useEffect, useState } from "react";
import { AlertTriangle, Check, Download, FolderOpen, LayoutTemplate, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PAGE_SIZES_MM } from "@shared/cvm/format";
import { useTemplateStore, type TemplateEntry } from "@/store/templates";
import { useCVSelection } from "../provider/hook";
import CvmDocument from "./CvmDocument";
import { useResumeContext } from "./useResumeContext";

const THUMBNAIL_SCALE = 0.28;
const MM = 96 / 25.4;

/** First page of the resume rendered with a template, as plain HTML (no editors). */
function TemplateThumbnail({ entry }: { entry: TemplateEntry }) {
  const { context, lang } = useResumeContext(entry.template);
  const size = PAGE_SIZES_MM[entry.template.meta.page.size];
  return (
    <div
      className="relative overflow-hidden bg-white shadow-sm ring-1 ring-border pointer-events-none select-none"
      style={{ width: size.width * MM * THUMBNAIL_SCALE, height: size.height * MM * THUMBNAIL_SCALE }}
      aria-hidden
    >
      <div style={{ transform: `scale(${THUMBNAIL_SCALE})`, transformOrigin: "top left" }}>
        {context && <CvmDocument template={entry.template} context={context} lang={lang} mode="static" />}
      </div>
    </div>
  );
}

function TemplateCard({ entry, active, isDefault, onUse }: { entry: TemplateEntry; active: boolean; isDefault: boolean; onUse: () => void }) {
  const { setDefault, exportTemplate, remove } = useTemplateStore();
  const { meta } = entry.template;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className={cn("group flex flex-col gap-2 rounded-xl border-2 p-3 transition-colors", active ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/30")}>
      <div role="button" tabIndex={0} onClick={onUse} onKeyDown={(e) => e.key === "Enter" && onUse()} className="flex justify-center cursor-pointer" title={`Use ${meta.name}`}>
        <TemplateThumbnail entry={entry} />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold leading-tight">
            {active && <Check className="size-4 text-primary shrink-0" />}
            <span className="truncate">{meta.name}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {entry.builtIn ? "Built-in" : `Imported${meta.author ? ` · ${meta.author}` : ""}`} · {meta.page.size}
            {meta.version ? ` · v${meta.version}` : ""}
          </p>
        </div>
        {isDefault && <Badge variant="secondary" className="shrink-0">Default</Badge>}
      </div>
      {meta.description && <p className="text-xs text-muted-foreground line-clamp-3">{meta.description}</p>}
      <div className="mt-auto flex flex-wrap gap-1">
        <Button size="sm" variant={active ? "secondary" : "default"} onClick={onUse} disabled={active}>
          {active ? "In use" : "Use"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDefault(meta.id)} disabled={isDefault} title="Use this template for new resumes">
          <Star className="size-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => exportTemplate(entry)} title="Save a copy of this template (to share it or start a new one from it)">
          <Download className="size-3.5" />
        </Button>
        {!entry.builtIn && (
          <Button
            size="sm"
            variant={confirmDelete ? "destructive" : "ghost"}
            onClick={() => (confirmDelete ? remove(entry) : setConfirmDelete(true))}
            onBlur={() => setConfirmDelete(false)}
            title="Delete this imported template"
          >
            <Trash2 className="size-3.5" />
            {confirmDelete && "Confirm"}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Toolbar button showing the current template; opens the gallery to switch, import and manage templates. */
export default function TemplatePicker() {
  const [open, setOpen] = useState(false);
  const { templates, broken, defaultId, loaded, load, importTemplates, openFolder, get } = useTemplateStore();
  const { templateId, setTemplateId } = useCVSelection();
  const current = get(templateId);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const handleImport = async () => {
    const ids = await importTemplates();
    // a single import is most likely meant to be used right away
    if (ids.length === 1) setTemplateId(ids[0]);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} title="Change the resume template">
        <LayoutTemplate className="size-4" />
        {current?.template.meta.name ?? "Template"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resume template</DialogTitle>
            <DialogDescription>
              The template only changes the look: your content and on-resume edits are kept when you switch.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {templates.map((entry) => (
              <TemplateCard
                key={entry.template.meta.id}
                entry={entry}
                active={entry.template.meta.id === current?.template.meta.id}
                isDefault={entry.template.meta.id === defaultId}
                onUse={() => setTemplateId(entry.template.meta.id)}
              />
            ))}
          </div>

          {broken.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
              {broken.map((item) => (
                <p key={item.fileName} className="flex gap-2">
                  <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                  <span><b>{item.fileName}</b> is not loaded: {item.error}</span>
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Button onClick={handleImport}>
              <Upload className="size-4" /> Import .cvm
            </Button>
            <Button variant="ghost" onClick={() => openFolder()}>
              <FolderOpen className="size-4" /> Open templates folder
            </Button>
            <p className="ml-auto text-xs text-muted-foreground">
              <Star className="inline size-3 -mt-0.5" /> sets the template of new resumes. Download a built-in one to start your own.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
