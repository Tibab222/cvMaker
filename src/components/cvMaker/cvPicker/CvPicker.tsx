import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { SidebarOpen } from "lucide-react";
import ExperiencePicker from "./ExperiencePicker";
import ProjectPicker from "./ProjectPicker";
import SkillsPicker from "./SkillsPicker";
import EducationPicker from "./EducationPicker";
import Analyse from "./Analyse";
import HeaderPicker from "./HeaderPicker";
import CollectionPicker from "./CollectionPicker";
import { useTemplateStore } from "@/store/templates";
import { useCVSelection } from "../provider/hook";

export default function CvPicker({ onClose }: { onClose: () => void }) {
    const { templateId } = useCVSelection();
    // the template may ask for extra lists (e.g. a project appendix): each gets its own tab
    const collections = Object.entries(useTemplateStore((state) => state.get(templateId)).template.meta.collections ?? {});
    return (
        // right side menu
        <motion.div className="h-full fixed top-10.5 right-0 bg-white p-2 px-4 w-1/2 overflow-y-auto pb-30" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.3 }}>
            <Tabs defaultValue="experience">
                <TabsList className="w-full">
                    <Button onClick={onClose} variant={"ghost"}><SidebarOpen />Close</Button>
                    <TabsTrigger value="header">Header</TabsTrigger>
                    <TabsTrigger value="experience">Experience</TabsTrigger>
                    <TabsTrigger value="project">Project</TabsTrigger>
                    <TabsTrigger value="skills">Skills</TabsTrigger>
                    <TabsTrigger value="education">Education</TabsTrigger>
                    {collections.map(([name, collection]) => (
                        <TabsTrigger key={name} value={`collection:${name}`}>{collection.label}</TabsTrigger>
                    ))}
                    <TabsTrigger value="analyse">Analyse</TabsTrigger>
                </TabsList>
                <TabsContent value="header">
                    <HeaderPicker />
                </TabsContent>
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
                {collections.map(([name, collection]) => (
                    <TabsContent key={name} value={`collection:${name}`}>
                        <CollectionPicker name={name} collection={collection} />
                    </TabsContent>
                ))}
                <TabsContent value="analyse">
                    <Analyse />
                </TabsContent>
            </Tabs>
        </motion.div>
    )
}