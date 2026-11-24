import { type ComponentType } from "react";
import { Facebook, Github, Globe, ImageIcon, Instagram, Linkedin, Mail, Pencil, Phone, Twitter, Youtube } from "lucide-react";
import { useProfileStore } from "@/store/profile";
import { Tabs, useUiStore } from "@/store/ui";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { selectedHeaderInfos } from "@shared/jobApplications.type";
import { useCVSelection } from "../provider/hook";

/* lucide has no TikTok icon */
function TikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.9 2.9 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

type ToggleKey = Exclude<keyof selectedHeaderInfos, "customLinks" | "title">;

/** One line of the header: shown or not. Empty profile fields are listed, greyed, so it is clear why. */
function ToggleRow({ icon: Icon, label, value, checked, onToggle }: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const filled = Boolean(value?.trim());
  return (
    <label className={cn("flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors", filled ? "cursor-pointer hover:bg-muted/60" : "opacity-50")}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-tight">{label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{filled ? value : "Not in your profile"}</span>
      </span>
      <Switch checked={filled && checked} disabled={!filled} onCheckedChange={onToggle} aria-label={`Show ${label} on the resume`} />
    </label>
  );
}

export default function HeaderPicker() {
  const { profile } = useProfileStore();
  const { setSelectedTab } = useUiStore();
  const { selection, setHeaderInfo, includePhoto, setIncludePhoto } = useCVSelection();
  const header = selection.headerInfos;

  const rows: { key: ToggleKey; label: string; icon: ComponentType<{ className?: string }>; value?: string }[] = [
    { key: "mail", label: "Email", icon: Mail, value: profile?.mail },
    { key: "phone", label: "Phone", icon: Phone, value: profile?.phone },
    { key: "portfolio", label: "Portfolio", icon: Globe, value: profile?.portfolio },
    { key: "linkedin", label: "LinkedIn", icon: Linkedin, value: profile?.linkedin },
    { key: "github", label: "GitHub", icon: Github, value: profile?.github },
    { key: "twitter", label: "X / Twitter", icon: Twitter, value: profile?.twitter },
    { key: "instagram", label: "Instagram", icon: Instagram, value: profile?.instagram },
    { key: "tiktok", label: "TikTok", icon: TikTok, value: profile?.tiktok },
    { key: "youtube", label: "YouTube", icon: Youtube, value: profile?.youtube },
    { key: "facebook", label: "Facebook", icon: Facebook, value: profile?.facebook },
  ];
  const customLinks = profile?.customLinks ?? [];

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="resume-headline" className="text-xs font-semibold">Headline</label>
        <Input
          id="resume-headline"
          placeholder="e.g. Senior Frontend Developer"
          value={header.title ?? ""}
          onChange={(event) => setHeaderInfo("title", event.target.value)}
        />
        <p className="text-[11px] text-muted-foreground">Shown under your name. Tip: use the job title of the offer.</p>
      </div>

      {profile?.photo && (
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40">
          <img src={profile.photo} alt="" className="size-10 rounded-full object-cover" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-medium"><ImageIcon className="size-3.5 text-muted-foreground" /> Photo</span>
            <span className="block text-[11px] text-muted-foreground">Some countries and companies prefer resumes without one.</span>
          </span>
          <Switch checked={includePhoto} onCheckedChange={setIncludePhoto} aria-label="Show the photo on the resume" />
        </label>
      )}

      <div className="space-y-1">
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-semibold">Contact & profiles</p>
          <button type="button" onClick={() => setSelectedTab(Tabs.PERSONAL)} className="flex items-center gap-1 text-[11px] font-medium text-brand hover:underline">
            <Pencil className="size-3" /> Edit in profile
          </button>
        </div>
        {rows.map((row) => (
          <ToggleRow
            key={row.key}
            icon={row.icon}
            label={row.label}
            value={row.value}
            checked={Boolean(header[row.key])}
            onToggle={(checked) => setHeaderInfo(row.key, checked)}
          />
        ))}
      </div>

      {customLinks.length > 0 && (
        <div className="space-y-1">
          <p className="px-2 text-xs font-semibold">Other links</p>
          {customLinks.map((link, index) => (
            <ToggleRow
              key={link.label || index}
              icon={Globe}
              label={link.label || "Untitled link"}
              value={link.url}
              checked={Boolean(header.customLinks?.[link.label])}
              onToggle={(checked) => setHeaderInfo("customLinks", checked, link.label)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
