import { useProfileStore } from "@/store/profile";
import type { Project } from "@shared/projects.interface";
import { useCallback, useState } from "react";
import { FolderKanban } from "lucide-react";
import ProjectCard from "./ProjectCard";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import SectionPage from "../SectionPage";

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
        const id = new Date().getTime().toString();
        const newData = [...projects, {...newProject, id: id}];
        updateSection("projects", newData);
        setAddNew(false);
    }

    const handleDelete = (id: string) => {
        const newData = projects.filter((project) => project.id !== id);
        updateSection("projects", newData);
    }

    return (
        <SectionPage
            icon={FolderKanban}
            title="Projects"
            description="What you built, as bullet points the matching engine can pick from"
            noun="project"
            isAdding={addNew}
            onAdd={() => setAddNew(true)}
            emptyDescription="Describe your projects with short, tagged bullet points: they are what gets matched against job offers."
            items={projects.map((project) => ({
                key: project.id,
                node: <ProjectCard project={project} onSave={handleOnSave} onDelete={handleDelete} />,
            }))}
            newItem={
                <ProjectCard
                    project={{ id: "", title: "", bullets: [] }}
                    defaultEdit
                    defaultExpanded
                    onSave={handleNewSave}
                    onCancelNew={() => setAddNew(false)}
                />
            }
        />
    )
}
