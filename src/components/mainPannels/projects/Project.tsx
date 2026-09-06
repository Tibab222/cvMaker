import { useProfileStore } from "@/store/profile";
import type { Project } from "@shared/projects.interface";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState } from "react";
import ProjectCard from "./ProjectCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getModifierKeyLabel, useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

export default function ProjectComponent() {
    const { projects, updateSection } = useProfileStore();
    const [ addNew, setAddNew ] = useState(false);

    const handleAddShortcut = useCallback(() => setAddNew(true), []);
    useKeyboardShortcut("n", handleAddShortcut, { enabled: !addNew });

    const handleOnSave = (updatedProject: Project) => {
        const newProjectList = projects.map((project) => project.id === updatedProject.id ? updatedProject : project);
        updateSection("projects", newProjectList);
    }

    const handleNewSave = (newProject: Project) => {
        const id = new Date().getTime().toString(); // id here is fine
        const newData = [...projects, {...newProject, id: id}];
        updateSection("projects", newData);
        setAddNew(false);
    }

    const handleDelete = (id: string) => {
        const newData = projects.filter((project) => project.id !== id);
        updateSection("projects", newData);
    }

    return (
        <motion.div
            className="flex h-auto w-full flex-col gap-4 p-4"
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
            {projects.length === 0 && !addNew && (
                <div className="rounded-2xl border border-dashed p-10 text-center">
                <h2 className="text-lg font-semibold">No project entries yet.</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add your first project to get started.</p>
                </div>
            )}

            <AnimatePresence initial={false}>
                {projects.map((project) => (
                <motion.div
                    key={project.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 320, damping: 34 }}
                >
                    <ProjectCard project={project} onSave={handleOnSave} onDelete={handleDelete} />
                </motion.div>
                ))}
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
                {addNew ? (
                <motion.div
                    key="new"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                >
                    <ProjectCard
                    project={{ id: "", title: "", bullets: [] }}
                    defaultEdit
                    defaultExpanded
                    onSave={handleNewSave}
                    onCancelNew={() => setAddNew(false)}
                    />
                </motion.div>
                ) : (
                <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Button
                    variant="outline"
                    onClick={() => setAddNew(true)}
                    className="h-12 w-full rounded-xl border-dashed text-muted-foreground hover:text-foreground"
                    >
                    <Plus size={16} className="mr-2" /> Add Project
                    <kbd className="ml-2 text-xs bg-muted-foreground/10 px-1.5 py-0.5 rounded">{getModifierKeyLabel()}+N</kbd>
                    </Button>
                </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}