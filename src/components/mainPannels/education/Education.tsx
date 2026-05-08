import { useProfileStore } from "@/store/profile";
import EducationCard from "./EducationCard";
import type { Education } from "@shared/Education.interface";
import { useState } from "react";
import { motion } from "framer-motion";

export default function Education() {
    const { education, updateSection } = useProfileStore();
    const [ addNew, setAddNew ] = useState(false);

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

    return (
        <motion.div className="w-full h-full flex flex-col gap-4" initial={{ opacity: 0, x: -200 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            { education.length === 0 && <h2 className="text-2xl font-bold">No education entries yet.</h2> }
            {education.map((edu) => (
                <EducationCard key={edu.id} education={edu} onSave={handleOnSave} />
            ))}
            {addNew ? (
                <EducationCard education={{ id: "", institution: "", degree: "", location: "", startDate: new Date() }} onSave={handleNewSave} />
            ) : (
                <button
                    onClick={() => setAddNew(true)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Add Education
                </button>
            )}
        </motion.div>
    )
}