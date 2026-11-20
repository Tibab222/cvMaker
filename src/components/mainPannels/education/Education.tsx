import { useProfileStore } from "@/store/profile";
import EducationCard from "./EducationCard";
import type { Education } from "@shared/Education.interface";
import { useCallback, useState } from "react";
import { BookOpenCheck } from "lucide-react";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import SectionPage from "../SectionPage";

export default function Education() {
    const { education, updateSection } = useProfileStore();
    const [ addNew, setAddNew ] = useState(false);

    const handleAddShortcut = useCallback(() => setAddNew(true), []);
    useKeyboardShortcut("n", handleAddShortcut, { enabled: !addNew });

    const handleOnSave = (updatedEducation: Education) => {
        const newEducationList = education.map((edu) => edu.id === updatedEducation.id ? updatedEducation : edu);
        updateSection("education", newEducationList);
    }

    const handleNewSave = (newEducation: Education) => {
        const id = new Date().getTime().toString();
        const newData = [...education, {...newEducation, id: id}];
        updateSection("education", newData);
        setAddNew(false);
    }

    const handleOnDelete = (id: string) => {
        const filteredEducationList = education.filter((edu) => edu.id !== id);
        updateSection("education", filteredEducationList);
    }

    return (
        <SectionPage
            icon={BookOpenCheck}
            title="Education"
            description="Degrees, schools and certifications"
            noun="education entry"
            isAdding={addNew}
            onAdd={() => setAddNew(true)}
            emptyDescription="Add your degrees and certifications so they can appear on your resumes."
            items={education.map((edu) => ({
                key: edu.id,
                node: <EducationCard education={edu} onSave={handleOnSave} onDelete={handleOnDelete} />,
            }))}
            newItem={
                <EducationCard
                    education={{ id: "", institution: "", degree: "", location: "", startDate: new Date() }}
                    onSave={handleNewSave}
                    onCancel={() => setAddNew(false)}
                    defaultEdit
                />
            }
        />
    )
}
