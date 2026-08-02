import { motion } from "framer-motion";
import SideBar from "./LeftMenu";
import { SidebarProvider } from "../ui/sidebar";
import { Tabs, useUiStore } from "@/store/ui";
import Personal from "../mainPannels/Personnal";
import Education from "../mainPannels/education/Education";
import Experience from "../mainPannels/experiences/Experience";
import ProjectComponent from "../mainPannels/projects/Project";
import Skills from "../mainPannels/skills/Skills";
import Maker from "../cvMaker/Maker";
import { ScrollArea } from "../ui/scroll-area";
import SettingsMain from "../settings/SettingsMain";

export default function MainWindow() {
    const { selectedTab } = useUiStore();

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
            <SidebarProvider>
                <SideBar variant="sidebar" />
                <ScrollArea className="flex-1 h-full w-full bg-zinc-200/50">
                    <div className="p-4">
                        {renderTab()}
                    </div>
                </ScrollArea>
            </SidebarProvider>
        </motion.div>
    )
}