import { useProfileStore } from "@/store/profile";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
        <motion.div 
            className="w-full h-full flex flex-col gap-4" 
            initial={{ opacity: 0, x: -200 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.5 }}
        >
            { experience.length === 0 && <h2 className="text-2xl font-bold">No experience entries yet.</h2> }
            
            <AnimatePresence mode="popLayout">
                {experience.map((exp) => (
                    <motion.div
                        key={exp.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ExperienceCard 
                            experience={exp} 
                            onSave={handleOnSave} 
                            onDelete={handleOnDelete} 
                        />
                    </motion.div>
                ))}
                {addNew && (
                    <motion.div
                        key="new-experience"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                    >
                        <ExperienceCard 
                            experience={{ id: "", company: "", jobTitle: "", location: "", startDate: new Date() }} 
                            onSave={handleNewSave} 
                            onCancel={() => setAddNew(false)}
                            defaultEdit={true}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {!addNew && (
                <button
                    onClick={() => setAddNew(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200 mt-2"
                >
                    Add Experience
                </button>
            )}
        </motion.div>
    )
}