import { useProfileStore } from "@/store/profile";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Experience } from "@shared/Experience.interface";
import ExperienceCard from "./ExperienceCard";

export default function ExperienceComponent() {
    const { experience, updateSection } = useProfileStore();
    const [ addNew, setAddNew ] = useState(false);

    const handleOnSave = (updatedExperience: Experience) => {
        const newExperienceList = experience.map((exp) => exp.id === updatedExperience.id ? updatedExperience : exp);
        updateSection("experience", newExperienceList);
    }

    const handleNewSave = (newExperience: Experience) => {
        const id = new Date().getTime().toString(); // id here is fine
        const newData = [...experience, {...newExperience, id: id}];
        updateSection("experience", newData);
        setAddNew(false);
    }

    return (
        <motion.div className="w-full h-full flex flex-col gap-4" initial={{ opacity: 0, x: -200 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            { experience.length === 0 && <h2 className="text-2xl font-bold">No experience entries yet.</h2> }
            {experience.map((exp) => (
                <ExperienceCard key={exp.id} experience={exp} onSave={handleOnSave} />
            ))}
            {addNew ? (
                <ExperienceCard experience={{ id: "", company: "", jobTitle: "", location: "", startDate: new Date() }} onSave={handleNewSave} />
            ) : (
                <button
                    onClick={() => setAddNew(true)}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Add Experience
                </button>
            )}
        </motion.div>
    )
}