import { useProfileStore } from "@/store/profile";
import SkillCard from "./SkillCard";
import type { Skills } from "@shared/Skills.interface";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Skills() {
    const {skills, updateSection} = useProfileStore();
    const [showAddNew, setShowAddNew] = useState(false);

    const handleOnSave = (updatedSkill: Skills) => {
        const newSkillList = skills.map((skill) => skill.id === updatedSkill.id ? updatedSkill : skill);
        updateSection("skills", newSkillList);
    }

    const handleDelete = (skillId: string) => {
        const newSkillList = skills.filter((skill) => skill.id !== skillId);
        updateSection("skills", newSkillList);
    }

    const handleNewSave = (newSkill: Skills) => {
        const id = new Date().getTime().toString();
        const newData = [...skills, {...newSkill, id: id}];
        updateSection("skills", newData);
        setShowAddNew(false);
    }

    return (
        <div className="w-full h-full flex flex-col gap-4">
            { skills.length === 0 && <h2 className="text-2xl font-bold">No skill entries yet.</h2> }
            <div className="w-full grid grid-cols-3 gap-2">
            {
                skills.map((skill, index) => (
                    <SkillCard key={index} skill={skill} onSave={handleOnSave} onDelete={handleDelete} />
                ))
            }
            </div>
            {
                showAddNew ? (
                    <SkillCard skill={{name: "", id: ""}} onSave={handleNewSave} onDelete={() => setShowAddNew(false)} />
                ) : (
                    <Button variant="default" className="ml-auto" onClick={() => setShowAddNew(true)}>
                        Add Skill
                    </Button>
                )
            }
        </div>
    )
}