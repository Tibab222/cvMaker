import { cn } from "@/lib/utils";
import { Settings } from "lucide-react";
import { useState } from "react";
import SyncTab from "./SyncTab";
import AITab from "./AI/AItab";
import ExportPathSettings from "./PathTab";

enum TabsSettings {
    SYNC_DATABASE,
    AI_SETTINGS,
    PATH_SETTINGS
}

export default function SettingsMain() {
    const [settingsTab, setSettingsTab] = useState<TabsSettings | null>(TabsSettings.PATH_SETTINGS);

    const handleClick = (tab: TabsSettings) => {
        setSettingsTab(tab);
    }

    return <>
        <div className="w-full flex flex-row items-center justify-start gap-4 mb-4 p-4">
            {/* nav header */}
            <div className="flex flex-row items-center mb-4">
                <Settings className="mr-2" />
                <h2 className="text-2xl font-bold text-gray-700">Settings</h2>
            </div>
            <div className="flex items-center justify-between mb-4">
                <a className={cn("underline hover:no-underline cursor-pointer text-gray-400 rounded p-1 transition-all hover:bg-primary/50 hover:text-gray-200", settingsTab === TabsSettings.PATH_SETTINGS && "bg-primary/80 text-white no-underline")} onClick={() => handleClick(TabsSettings.PATH_SETTINGS)}>
                    Export Path settings
                </a>
            </div>
            <div className="flex items-center justify-between mb-4">
                <a className={cn("underline hover:no-underline cursor-pointer text-gray-400 rounded p-1 transition-all hover:bg-primary/50 hover:text-gray-200", settingsTab === TabsSettings.SYNC_DATABASE && "bg-primary/80 text-white no-underline")} onClick={() => handleClick(TabsSettings.SYNC_DATABASE)}>
                    Sync Database
                </a>
            </div>
            <div className="flex items-center justify-between mb-4">
                <a className={cn("underline hover:no-underline cursor-pointer text-gray-400 rounded p-1 transition-all hover:bg-primary/50 hover:text-gray-200", settingsTab === TabsSettings.AI_SETTINGS && "bg-primary/80 text-white no-underline")} onClick={() => handleClick(TabsSettings.AI_SETTINGS)}>
                    AI settings
                </a>
            </div>
        </div>

        <div className="w-full h-full flex flex-col gap-4">
            {/* main content */}
            {settingsTab === TabsSettings.SYNC_DATABASE && <SyncTab />}
            {settingsTab === TabsSettings.AI_SETTINGS && <AITab />}
            {settingsTab === TabsSettings.PATH_SETTINGS && <ExportPathSettings />}
        </div>
    </>
}