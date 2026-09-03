import { motion } from "framer-motion";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../ui/sidebar";
import { Tabs, useUiStore } from "@/store/ui";
import Personal from "../mainPannels/Personnal";
import Education from "../mainPannels/education/Education";
import Experience from "../mainPannels/experiences/Experience";
import ProjectComponent from "../mainPannels/projects/Project";
import Skills from "../mainPannels/skills/Skills";
import Maker from "../cvMaker/Maker";
import { ScrollArea } from "../ui/scroll-area";
import SettingsMain from "../settings/SettingsMain";
import LeftMenu from "./LeftMenu";
import { Menu } from "lucide-react";
import { useProfileStore } from "@/store/profile";
import Dashboard from "../dashboard/Dashboard";

export default function MainWindow() {
    const { selectedTab, setSelectedTab } = useUiStore();
    const { logout, profile } = useProfileStore();

    const handleLogout = () => {
        logout();
        setSelectedTab(Tabs.PROFILE_SELECTOR);
    }

    const renderTab = () => {
        switch (selectedTab) {
            case Tabs.PERSONAL:
                return <Personal />;
            case Tabs.EDUCATION:
                return <Education />;
            case Tabs.EXPERIENCE:
                return <Experience />;
            case Tabs.PROJECTS:
                return <ProjectComponent />;
            case Tabs.SKILLS:
                return <Skills />;
            case Tabs.CVMAKER:
                return <Maker />;
            case Tabs.SETTINGS:
                return <SettingsMain />;
            case Tabs.DASHBOARD:
                return <Dashboard />;
            default:
                return (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                        <h2 className="text-2xl font-bold mb-4">Welcome to CV Maker!</h2>
                        <p className="text-gray-600">Select a pannel from the left menu to get started.</p>
                    </div>
                )
        }
    }
    return (
        <motion.div className="relative w-full h-full min-h-0 flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <SidebarProvider defaultOpen={false} style={{ "--sidebar-width": "17rem", "--sidebar-width-icon": "4rem" } as React.CSSProperties}>
                <LeftMenu selectedTab={selectedTab} onSelectTab={setSelectedTab} onLogout={handleLogout} profile={profile ? profile : undefined} />
                <SidebarInset className="min-w-0">
                    <header className="sticky top-0 z-20 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
                        <SidebarTrigger className="size-9" aria-label="Open navigation">
                            <Menu className="size-4" />
                        </SidebarTrigger>
                        <span className="ml-3 text-sm font-semibold">CV Maker</span>
                    </header>
                    <ScrollArea className="h-full w-full flex-1 bg-zinc-200/50">
                        <div className="w-full min-w-0" id="render-tab">
                            {renderTab()}
                        </div>
                    </ScrollArea>
                </SidebarInset>
            </SidebarProvider>
        </motion.div>
    )
}