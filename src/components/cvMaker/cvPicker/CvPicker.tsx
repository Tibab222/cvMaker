import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { SidebarOpen } from "lucide-react";
import ExperiencePicker from "./ExperiencePicker";
import ProjectPicker from "./ProjectPicker";
import SkillsPicker from "./SkillsPicker";
import EducationPicker from "./EducationPicker";
import Analyse from "./Analyse";

export default function CvPicker({ onClose }: { onClose: () => void }) {
    return (
        // right side menu
        <motion.div className="h-full fixed right-0 bg-gray-200 p-2 w-1/2 overflow-y-auto pb-30" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.3 }}>
            <Tabs defaultValue="experience">
                <TabsList className="w-full">
                    <Button onClick={onClose} variant={"ghost"}><SidebarOpen />Close</Button>
                    {/* <TabsTrigger value="infos">Infos</TabsTrigger> */}
                    <TabsTrigger value="experience">Experience</TabsTrigger>
                    <TabsTrigger value="project">Project</TabsTrigger>
                    <TabsTrigger value="skills">Skills</TabsTrigger>
                    <TabsTrigger value="education">Education</TabsTrigger>
                    <TabsTrigger value="analyse">Analyse</TabsTrigger>
                </TabsList>
                {/* <TabsContent value="infos">
                    infos
                </TabsContent> */}
                <TabsContent value="experience">
                    <ExperiencePicker />
                </TabsContent>
                <TabsContent value="project">
                    <ProjectPicker />
                </TabsContent>
                <TabsContent value="skills">
                    <SkillsPicker />
                </TabsContent>
                <TabsContent value="education">
                    <EducationPicker />
                </TabsContent>
                <TabsContent value="analyse">
                    <Analyse />
                </TabsContent>
            </Tabs>
        </motion.div>
    )
}