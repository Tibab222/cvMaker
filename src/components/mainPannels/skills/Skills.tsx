import { useProfileStore } from "@/store/profile";
import SkillCard from "./SkillCard";
import type { Skills } from "@shared/Skills.interface";
import { useCallback, useState } from "react";
import { Sparkles } from "lucide-react";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import SectionPage from "../SectionPage";

export default function Skills() {
    const {skills, updateSection} = useProfileStore();
    const [showAddNew, setShowAddNew] = useState(false);

    const handleAddShortcut = useCallback(() => setShowAddNew(true), []);
    useKeyboardShortcut("n", handleAddShortcut, { enabled: !showAddNew });

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
        <SectionPage
            icon={Sparkles}
            title="Skills"
            description="Languages, tools and soft skills, with an optional level"
            noun="skill"
            layout="grid"
            isAdding={showAddNew}
            onAdd={() => setShowAddNew(true)}
            emptyDescription="List what you master. Skills missing from this list show up as gaps on the dashboard."
            // keyed by id, not index: deleting a skill must not shift the edit state of the others
            items={skills.map((skill) => ({
                key: skill.id,
                node: <SkillCard skill={skill} onSave={handleOnSave} onDelete={handleDelete} />,
            }))}
            newItem={<SkillCard skill={{ name: "", id: "" }} onSave={handleNewSave} onDelete={() => setShowAddNew(false)} />}
        />
    )
}
