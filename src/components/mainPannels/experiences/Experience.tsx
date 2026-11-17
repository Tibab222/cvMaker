import { useProfileStore } from "@/store/profile";
import { useCallback, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import type { Experience } from "@shared/Experience.interface";
import ExperienceCard from "./ExperienceCard";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import SectionPage from "../SectionPage";

export default function ExperienceComponent() {
    const { experience, updateSection } = useProfileStore();
    const [ addNew, setAddNew ] = useState(false);

    const handleAddShortcut = useCallback(() => setAddNew(true), []);
    useKeyboardShortcut("n", handleAddShortcut, { enabled: !addNew });

    const handleOnSave = (updatedExperience: Experience) => {
        const newExperienceList = experience.map((exp) => exp.id === updatedExperience.id ? updatedExperience : exp);
        updateSection("experience", newExperienceList);
    }

    const handleNewSave = (newExperience: Experience) => {
        const id = new Date().getTime().toString();
        const newData = [...experience, { ...newExperience, id }];
        updateSection("experience", newData);
        setAddNew(false);
    }

    const handleOnDelete = (id: string) => {
        const newExperienceList = experience.filter((exp) => exp.id !== id);
        updateSection("experience", newExperienceList);
    }

    return (
        <SectionPage
            icon={BriefcaseBusiness}
            title="Experience"
            description="The jobs your resumes are built from"
            noun="experience"
            isAdding={addNew}
            onAdd={() => setAddNew(true)}
            emptyDescription="Add the positions you held. Each resume picks the most relevant ones for the offer."
            items={experience.map((exp) => ({
                key: exp.id,
                node: <ExperienceCard experience={exp} onSave={handleOnSave} onDelete={handleOnDelete} />,
            }))}
            newItem={
                <ExperienceCard
                    experience={{ id: "", company: "", jobTitle: "", location: "", startDate: new Date() }}
                    onSave={handleNewSave}
                    onCancel={() => setAddNew(false)}
                    defaultEdit={true}
                />
            }
        />
    )
}
