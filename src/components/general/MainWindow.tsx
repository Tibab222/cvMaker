import { AnimatePresence, motion } from "framer-motion";
import { Compass, LayoutDashboard } from "lucide-react";
import { pageVariants } from "@/lib/motion";
import EmptyState from "./EmptyState";
import { Button } from "../ui/button";
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
import ResumeLibrary from "../resumeLibrary/ResumeLibrary";
import Opportunities from "../opportunities/Opportunities";

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
            case Tabs.RESUME_LIBRARY:
                return <ResumeLibrary />;
            case Tabs.OPPORTUNITIES:
                return <Opportunities />;
            default:
                return (
                    <div className="flex h-full min-h-[60vh] w-full items-center justify-center p-6">
                        <EmptyState
                            icon={Compass}
                            title={`Welcome${profile?.firstName ? `, ${profile.firstName}` : ""}`}
                            description="Pick a section in the left menu, or open your dashboard to see where your applications stand."
                            action={
                                <Button size="sm" onClick={() => setSelectedTab(Tabs.DASHBOARD)} className="gap-1.5">
                                    <LayoutDashboard className="size-4" /> Open the dashboard
                                </Button>
                            }
                            className="max-w-md border-solid bg-surface/80 backdrop-blur"
                        />
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
                    <ScrollArea className="h-full w-full flex-1 bg-canvas">
                        {/* soft brand glow behind the content, purely decorative */}
                        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,var(--color-brand-muted),transparent)] opacity-60" />
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={selectedTab}
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                className="relative min-h-full w-full min-w-0"
                                id="render-tab"
                            >
                                {renderTab()}
                            </motion.div>
                        </AnimatePresence>
                    </ScrollArea>
                </SidebarInset>
            </SidebarProvider>
        </motion.div>
    )
}