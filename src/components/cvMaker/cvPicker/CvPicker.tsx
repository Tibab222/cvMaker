import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { SidebarOpen } from "lucide-react";
import ExperiencePicker from "./ExperiencePicker";
import ProjectPicker from "./ProjectPicker";
import SkillsPicker from "./SkillsPicker";
import EducationPicker from "./EducationPicker";

export default function CvPicker({ onClose }: { onClose: () => void }) {
    return (
        // right side menu
        <motion.div className="h-full fixed right-0 bg-gray-200 p-2 max-w-1/3 overflow-y-auto pb-30" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.3 }}>
            <Tabs defaultValue="experience">
                <TabsList>
                    <Button onClick={onClose} variant={"ghost"}><SidebarOpen />Close</Button>
                    {/* <TabsTrigger value="infos">Infos</TabsTrigger> */}
                    <TabsTrigger value="experience">Experience</TabsTrigger>
                    <TabsTrigger value="project">Project</TabsTrigger>
                    <TabsTrigger value="skills">Skills</TabsTrigger>
                    <TabsTrigger value="education">Education</TabsTrigger>
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
            </Tabs>
        </motion.div>
    )
}