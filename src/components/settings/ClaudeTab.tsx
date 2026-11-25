import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Copy, Loader2, Plug, PlugZap, ShieldCheck, TriangleAlert, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { api } from "@/api";
import { allMcpPermissions, MCP_PERMISSIONS, type McpPermissions, type McpStatus } from "@shared/mcp.types";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 240, damping: 22 } },
};

type Permission = (typeof MCP_PERMISSIONS)[number];

const AREAS = MCP_PERMISSIONS.reduce<{ area: string; read?: Permission; write?: Permission }[]>((areas, permission) => {
  let area = areas.find((entry) => entry.area === permission.area);
  if (!area) areas.push((area = { area: permission.area }));
  area[permission.direction] = permission;
  return areas;
}, []);

function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2">
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground" title={command}>{command}</code>
      <Button variant="ghost" size="sm" onClick={copy} className="shrink-0 gap-1.5">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function ConnectionCard({ status, onStatus }: { status: McpStatus | null; onStatus: (status: McpStatus) => void }) {
  const [busy, setBusy] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const desktop = status?.claudeDesktop;

  const toggle = async () => {
    if (!desktop) return;
    setBusy(true);
    try {
      const result = desktop.connected ? await api.mcp.disconnectClaudeDesktop() : await api.mcp.connectClaudeDesktop();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      onStatus(result.status);
      setJustConnected(result.status.claudeDesktop.connected);
      toast.success(result.status.claudeDesktop.connected ? "CV Maker added to Claude Desktop" : "CV Maker removed from Claude Desktop");
    } catch (error) {
      console.error("Claude Desktop config error:", error);
      toast.error("Could not change Claude Desktop's settings");
    } finally {
      setBusy(false);
    }
  };

  const pill = !status
    ? { icon: Loader2, label: "Checking…", cls: "bg-muted text-muted-foreground", spin: true }
    : desktop?.connected
      ? { icon: CheckCircle2, label: "Connected", cls: "bg-primary/10 text-primary" }
      : desktop?.installed
        ? { icon: Plug, label: "Not connected", cls: "bg-accent text-accent-foreground" }
        : { icon: TriangleAlert, label: "Claude Desktop not found", cls: "bg-muted text-muted-foreground" };

  return (
    <motion.div variants={item} className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Claude Desktop</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Claude can then read your profile and pipeline and prepare resumes, while CV Maker is open. What it reads is
            sent to Anthropic as part of your conversation; contact details and your photo never are.
          </p>
        </div>
        <span className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", pill.cls)}>
          <pill.icon className={cn("h-3.5 w-3.5", pill.spin && "animate-spin")} />
          {pill.label}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={busy || !desktop?.installed} variant={desktop?.connected ? "outline" : "default"} onClick={toggle} className="gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : desktop?.connected ? <Unplug className="h-4 w-4" /> : <PlugZap className="h-4 w-4" />}
          {desktop?.connected ? "Disconnect" : "Connect to Claude Desktop"}
        </Button>
        {status && (
          <span className="text-xs text-muted-foreground">
            {status.runner.kind === "node" ? `Runs with Node.js ${status.runner.version}` : "Runs with CV Maker itself, no Node.js needed"}
          </span>
        )}
      </div>
      {justConnected && (
        <p className="mt-3 text-xs text-foreground">
          Quit Claude Desktop completely (also from the system tray) and open it again: CV Maker appears under the + menu.
        </p>
      )}

      {status && (
        <div className="mt-6">
          <p className="text-xs font-medium text-foreground">Claude Code</p>
          <p className="text-xs text-muted-foreground">Run once in a terminal:</p>
          <CopyCommand command={status.claudeCodeCommand} />
        </div>
      )}
    </motion.div>
  );
}

function PermissionSwitch({ permission, permissions, onChange }: {
  permission?: Permission;
  permissions: McpPermissions;
  onChange: (changes: Partial<McpPermissions>) => void;
}) {
  if (!permission) return <span className="w-10 text-center text-xs text-muted-foreground">—</span>;
  return (
    <span className="flex w-10 justify-center">
      <Switch
        checked={permissions[permission.id]}
        onCheckedChange={(checked) => onChange({ [permission.id]: checked })}
        aria-label={`${permission.area} ${permission.direction}`}
      />
    </span>
  );
}

function PermissionsCard({ permissions, onChange }: { permissions: McpPermissions; onChange: (changes: Partial<McpPermissions>) => void }) {
  const allowed = MCP_PERMISSIONS.filter(({ id }) => permissions[id]).length;
  const everything = allowed === MCP_PERMISSIONS.length;

  return (
    <motion.div variants={item} className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="text-base font-semibold text-foreground">What AI assistants can use</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Applies to Claude and any assistant connected to CV Maker. A part turned off is hidden from them and refused.
      </p>

      <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4">
        <span className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <span>
            <span className="block text-sm font-semibold text-foreground">Allow everything</span>
            <span className="block text-xs text-muted-foreground">
              {everything ? "Every part is on." : `${allowed} of ${MCP_PERMISSIONS.length} parts on.`}
            </span>
          </span>
        </span>
        <Switch checked={everything} onCheckedChange={(checked) => onChange(allMcpPermissions(checked))} className="scale-125" />
      </label>

      <div className="mt-4 flex justify-end gap-2 pr-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span className="w-10 text-center">Read</span>
        <span className="w-10 text-center">Write</span>
      </div>
      <ul className="divide-y divide-border">
        {AREAS.map(({ area, read, write }) => (
          <li key={area} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{area}</p>
              {read && <p className="text-xs text-muted-foreground">{read.description}</p>}
              {write && <p className="text-xs text-muted-foreground">{write.description}</p>}
            </div>
            <div className="flex shrink-0 gap-2 pr-1">
              <PermissionSwitch permission={read} permissions={permissions} onChange={onChange} />
              <PermissionSwitch permission={write} permissions={permissions} onChange={onChange} />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        The browser extension is part of CV Maker and always keeps working. Claude picks up changes within seconds; if it
        still shows something you turned off, start a new conversation.
      </p>
    </motion.div>
  );
}

export default function ClaudeTab() {
  const [status, setStatus] = useState<McpStatus | null>(null);
  const [permissions, setPermissions] = useState<McpPermissions | null>(null);

  useEffect(() => {
    api.mcp.status()
      .then((next) => {
        setStatus(next);
        setPermissions(next.permissions);
      })
      .catch((error) => console.error("MCP status error:", error));
  }, []);

  const change = async (changes: Partial<McpPermissions>) => {
    if (!permissions) return;
    const previous = permissions;
    setPermissions({ ...permissions, ...changes });
    try {
      setPermissions(await api.mcp.setPermissions(changes));
    } catch (error) {
      console.error("MCP permissions error:", error);
      setPermissions(previous);
      toast.error("Could not save the change");
    }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      className="mx-auto w-full max-w-2xl px-4 py-10"
    >
      <motion.div variants={item}>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">Claude</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Connect CV Maker to Claude, and choose what it can read and change in the app.
        </p>
      </motion.div>
      <ConnectionCard status={status} onStatus={setStatus} />
      {permissions && <PermissionsCard permissions={permissions} onChange={change} />}
    </motion.div>
  );
}

