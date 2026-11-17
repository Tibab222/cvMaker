import { AnimatePresence, motion } from "framer-motion";
import { Bot, Database, FolderOutput, Settings } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { pageVariants } from "@/lib/motion";
import PageHeader from "../general/PageHeader";
import SyncTab from "./SyncTab";
import AITab from "./AI/AItab";
import ExportPathSettings from "./PathTab";

enum TabsSettings {
    SYNC_DATABASE = "sync",
    AI_SETTINGS = "ai",
    PATH_SETTINGS = "path",
}

const SETTINGS_TABS = [
    { id: TabsSettings.PATH_SETTINGS, label: "Exports", icon: FolderOutput },
    { id: TabsSettings.SYNC_DATABASE, label: "Matching index", icon: Database },
    { id: TabsSettings.AI_SETTINGS, label: "AI", icon: Bot },
];

export default function SettingsMain() {
    const [settingsTab, setSettingsTab] = useState<TabsSettings>(TabsSettings.PATH_SETTINGS);

    return (
        <div className="flex min-h-full w-full flex-col">
            <PageHeader
                icon={Settings}
                title="Settings"
                description="Exports, matching index and AI providers"
                actions={
                    <nav className="flex gap-1 rounded-lg bg-muted p-1" aria-label="Settings sections">
                        {SETTINGS_TABS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => setSettingsTab(id)}
                                aria-current={settingsTab === id ? "page" : undefined}
                                className={cn(
                                    "relative z-10 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                    settingsTab === id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {settingsTab === id && (
                                    <motion.span
                                        layoutId="settings-tab"
                                        className="absolute inset-0 -z-10 rounded-md bg-background shadow-sm"
                                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                    />
                                )}
                                <Icon className="size-3.5" />
                                <span className="hidden sm:inline">{label}</span>
                            </button>
                        ))}
                    </nav>
                }
            />

            <AnimatePresence mode="wait">
                <motion.div
                    key={settingsTab}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="flex h-full w-full flex-col gap-4"
                >
                    {settingsTab === TabsSettings.SYNC_DATABASE && <SyncTab />}
                    {settingsTab === TabsSettings.AI_SETTINGS && <AITab />}
                    {settingsTab === TabsSettings.PATH_SETTINGS && <ExportPathSettings />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
