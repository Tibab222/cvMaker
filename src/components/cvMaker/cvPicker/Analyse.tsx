import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { ScanSearch, Sparkles } from 'lucide-react';
import { useCVSelection } from "../provider/hook";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useUiStore } from "@/store/ui";

export default function Analyse() {
    const { AIanalysis, runFullAIAnalysis, runLocalAnalysis, removeKeyword, runAIRewrite } = useCVSelection();
    const [rawMandate, setRawMandate] = useState('');
    const { aiAvailable } = useUiStore();

    const handleStartAnalysis = () => {
        runFullAIAnalysis(rawMandate);
    }

    const handleStartLocalAnalysis = () => {
        runLocalAnalysis(rawMandate);
    }

    return (
        <motion.div className="p-4">
            {
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
                                            <li key={index}>
                                                <Button variant="destructive" size="xs" onClick={() => removeKeyword(skill)}>-</Button>
                                                {skill}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            }
            <p className="italic text-black/50">Paste a mandate here to analyse it, or write a custom description of the role you're applying for.</p>
            <Textarea className="bg-white" value={rawMandate} onChange={(e) => setRawMandate(e.target.value)}></Textarea>
            <div className="w-full flex justify-around">
                {aiAvailable && (
                    <Button className={"mt-2 cursor-pointer"} onClick={handleStartAnalysis} disabled={AIanalysis.isCurrentJob}>
                        Analyse {AIanalysis.isCurrentJob ? <Spinner /> : <Sparkles />}
                    </Button>
                )}
                <Button className={"mt-2 cursor-pointer"} onClick={handleStartLocalAnalysis} disabled={AIanalysis.isCurrentJob}>
                    Fast Analyse {AIanalysis.isCurrentJob ? <Spinner /> : <ScanSearch />}
                </Button>
                {/* Add a button to rewrite the resume if there is a valid analysis result */}
                {AIanalysis.keywords.length > 0 && (
                    <Button className={"mt-2 cursor-pointer"} onClick={runAIRewrite} disabled={AIanalysis.isCurrentJob}>
                        Rewrite Resume {AIanalysis.isCurrentJob ? <Spinner /> : <Sparkles />}
                    </Button>
                )}
            </div>
        </motion.div>
    )
}