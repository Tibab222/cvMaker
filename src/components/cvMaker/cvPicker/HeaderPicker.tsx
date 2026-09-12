import { motion } from "framer-motion";
import { type ComponentType } from "react";
import {
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  Twitter,
  Type,
  UserRound,
  Youtube,
} from "lucide-react";
import { useProfileStore } from "@/store/profile";
import { Switch } from "@/components/ui/switch";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { selectedHeaderInfos } from "@shared/jobApplications.type";
import { useCVSelection } from "../provider/hook";

/* ---------------- Brand icon (not in lucide) ---------------- */

function TikTok({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.9 2.9 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

/* ---------------- Picker rows ---------------- */

type ToggleKey = Exclude<keyof selectedHeaderInfos, "customLinks" | "title">;

interface PickerRow {
  key: ToggleKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
  value?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

function ToggleRow({
  row,
  index,
  checked,
  filled,
  onToggle,
}: {
  row: PickerRow;
  index: number;
  checked: boolean;
  filled: boolean;
  onToggle: (checked: boolean) => void;
}) {
  const Icon = row.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.3, ease: EASE }}
    >
      <div
        className={`flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors duration-200 ${
          filled ? "hover:bg-accent/40" : "opacity-55"
        }`}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight">{row.label}</p>
          <p className="truncate text-xs text-muted-foreground">
            {filled ? row.value : "Not filled in your profile yet"}
          </p>
        </div>
        <Switch
          checked={checked}
          disabled={!filled}
          onCheckedChange={onToggle}
          aria-label={`Show ${row.label} on the resume`}
        />
      </div>
    </motion.div>
  );
}

/* ---------------- Component ---------------- */

export default function HeaderPicker() {
  const { profile } = useProfileStore();
  const { selection, setHeaderInfo } = useCVSelection();
  const header = selection.headerInfos;

  const rows: PickerRow[] = [
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

  console.log("HeaderPicker:", header);

  const shownCount =
    rows.filter((row) => header[row.key] && row.value?.trim()).length +
    customLinks.filter((link) => header.customLinks?.[link.label]).length;

  const firstName = profile?.firstName || "Alex";
  const lastName = profile?.lastName || "Morgan";
  const visibleRows = rows.filter(
    (row) => header[row.key] && row.value?.trim(),
  );
  const visibleCustomLinks = customLinks.filter(
    (link) => link.label && header.customLinks?.[link.label],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="w-full space-y-4"
    >
      {/* Live preview of the resume header */}
      <div className="rounded-xl border border-border/60 bg-muted/30 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <UserRound className="size-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Header preview
              </p>
            </div>
            <motion.p
              key={`${firstName}-${lastName}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-1.5 truncate text-2xl font-semibold tracking-tight"
            >
              {firstName} {lastName}
            </motion.p>
            {header.title?.trim() ? (
              <motion.p
                key={header.title}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="truncate text-sm text-muted-foreground"
              >
                {header.title}
              </motion.p>
            ) : (
              <p className="text-sm italic text-muted-foreground/55">
                Add a title below to show it under the name
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {shownCount} shown
          </span>
        </div>

        {(visibleRows.length > 0 || visibleCustomLinks.length > 0) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border/50 pt-3"
          >
            {visibleRows.map((row) => {
              const Icon = row.icon;
              return (
                <span
                  key={row.key}
                  className="inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{row.value}</span>
                </span>
              );
            })}
            {visibleCustomLinks.map((link) => (
              <span
                key={link.label}
                className="inline-flex max-w-full items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Globe className="size-3.5 shrink-0" />
                <span className="truncate">{link.url}</span>
              </span>
            ))}
          </motion.div>
        )}
      </div>

      {/* Title under the name */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Title under the name</p>
        <p className="text-xs text-muted-foreground">
          e.g. “Senior Frontend Developer” — shown right under your name.
        </p>
        <InputGroup>
          <InputGroupAddon>
            <Type />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Your professional title"
            value={header.title ?? ""}
            onChange={(event) => setHeaderInfo("title", event.target.value)}
          />
        </InputGroup>
      </div>

      {/* Contact & social toggles */}
      <div className="space-y-2 pt-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">Contact & profiles</p>
          <p className="text-xs text-muted-foreground">
            Empty fields can’t be shown yet
          </p>
        </div>
        <div className="space-y-2">
          {rows.map((row, index) => (
            <ToggleRow
              key={row.key}
              row={row}
              index={index}
              checked={Boolean(header[row.key])}
              filled={Boolean(row.value?.trim())}
              onToggle={(checked) => setHeaderInfo(row.key, checked)}
            />
          ))}
        </div>
      </div>

      {/* Custom link toggles */}
      {customLinks.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-sm font-medium">Your other links</p>
          <div className="space-y-2">
            {customLinks.map((link, index) => (
              <ToggleRow
                key={link.label || index}
                row={{
                  key: "customLinks" as ToggleKey,
                  label: link.label || "Untitled link",
                  icon: Globe,
                  value: link.url,
                }}
                index={index}
                checked={Boolean(header.customLinks?.[link.label])}
                filled={Boolean(link.url?.trim())}
                onToggle={(checked) =>
                  setHeaderInfo("customLinks", checked, link.label)
                }
              />
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
}
