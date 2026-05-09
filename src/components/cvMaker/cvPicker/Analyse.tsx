import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { Sparkles } from 'lucide-react';
import { useCVSelection } from "../provider/hook";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function Analyse() {
    const { AIanalysis, runFullAnalysis } = useCVSelection();
    const [rawMandate, setRawMandate] = useState('');

    const handleStartAnalysis = () => {
        runFullAnalysis(rawMandate);
    }

    return (
        <motion.div className="p-4">
            {
                AIanalysis.isCurrentJob && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
                        <Card>
                            <CardHeader>
                                <CardTitle>Status: {AIanalysis.status || 'Idle'}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {
                                    AIanalysis.jobTitle && <p><strong>Job Title:</strong> {AIanalysis.jobTitle}</p>
                                }
                                {
                                    AIanalysis.focus && <p><strong>Key Focus:</strong> {AIanalysis.focus}</p>
                                }
                                {AIanalysis.keywords.length > 0 && (
                                    <div>
                                        <strong>Extracted Skills:</strong>
                                        <ul className="list-disc list-inside">
                                            {AIanalysis.keywords.map((skill, index) => (
                                                <li key={index}>{skill}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                )
            }
            <p className="italic text-black/50">Paste a mandate here to analyse it, or write a custom description of the role you're applying for.</p>
            <Textarea className="bg-white" value={rawMandate} onChange={(e) => setRawMandate(e.target.value)}></Textarea>
            <Button className={"mt-2 cursor-pointer"} onClick={handleStartAnalysis} disabled={AIanalysis.isCurrentJob}>
                Analyse {AIanalysis.isCurrentJob ? <Spinner /> : <Sparkles />}
            </Button>
        </motion.div>
    )
}