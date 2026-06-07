import { useProfileStore } from "@/store/profile";
import type { Project } from "@shared/projects.interface";
import { motion } from "framer-motion";
import { useState } from "react";
import ProjectCard from "./ProjectCard";

export default function ProjectComponent() {
    const { projects, updateSection } = useProfileStore();
    const [ addNew, setAddNew ] = useState(false);

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
    return (
        <motion.div className="w-full h-auto flex flex-col gap-4" initial={{ opacity: 0, x: -200 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            { projects.length === 0 && <h2 className="text-2xl font-bold">No project entries yet.</h2> }
            {projects.map((project) => (
                <ProjectCard key={project.id} project={project} onSave={handleOnSave} />
            ))}
            {addNew ? (
                <ProjectCard project={{ id: "", title: "", bullets: [] }} onSave={handleNewSave} />
            ) : (
                <button
                    onClick={() => setAddNew(true)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Add Project
                </button>
            )}
        </motion.div>
    )
}