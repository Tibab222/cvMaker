import { useProfileStore } from "@/store/profile";
import EducationCard from "./EducationCard";
import type { Education } from "@shared/Education.interface";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { getModifierKeyLabel, useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";

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
        const id = new Date().getTime().toString(); // id here is fine
        const newData = [...education, {...newEducation, id: id}];
        updateSection("education", newData);
        setAddNew(false);
    }

    const handleOnDelete = (id: string) => {
        const filteredEducationList = education.filter((edu) => edu.id !== id);
        updateSection("education", filteredEducationList);
    }

    return (
        <motion.div className="w-full h-full flex flex-col gap-4 px-4 pt-2 overflow-y-auto max-h-full:" initial={{ opacity: 0, x: -200 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            { education.length === 0 && <h2 className="text-2xl font-bold">No education entries yet.</h2> }
            {education.map((edu) => (
                <EducationCard key={edu.id} education={edu} onSave={handleOnSave} onDelete={handleOnDelete} />
            ))}
            {addNew ? (
                <EducationCard education={{ id: "", institution: "", degree: "", location: "", startDate: new Date() }} onSave={handleNewSave} onCancel={() => setAddNew(false)} defaultEdit />
            ) : (
                <button
                    onClick={() => setAddNew(true)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center gap-2 w-fit"
                >
                    Add Education
                    <kbd className="text-xs font-normal bg-blue-700/60 px-1.5 py-0.5 rounded">{getModifierKeyLabel()}+N</kbd>
                </button>
            )}
        </motion.div>
    )
}