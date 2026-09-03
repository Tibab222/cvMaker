import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Building2, Check, FileSearch, LoaderCircle, ScanSearch, Sparkles, Target, Wand2, X } from 'lucide-react';
import { useCVSelection } from "../provider/hook";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUiStore } from "@/store/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AnalysisMode = "ai" | "local" | "rewrite";

export default function Analyse() {
    const { aiState, rewritingKeys, runFullAIAnalysis, runLocalAnalysis, removeKeyword, runAIRewrite, jobInfos, updateJobInfos } = useCVSelection();
    const [rawMandate, setRawMandate] = useState(jobInfos?.description || '');
    const { aiAvailable } = useUiStore();
    const reduceMotion = useReducedMotion();
    const [activeMode, setActiveMode] = useState<AnalysisMode | null>(null);

    useEffect(() => {
        const updateMandate = () => setRawMandate(jobInfos?.description || '');
        updateMandate();
    }, [jobInfos?.description]);

    const isBusy = aiState.isCurrentJob || rewritingKeys.length > 0;
    useEffect(() => {
        if (!isBusy) {
            const cleanup = () => setActiveMode(null);
            cleanup();
        }
    }, [isBusy]);

    const handleStartAnalysis = () => {
        setActiveMode("ai");
        runFullAIAnalysis(rawMandate);
    }

    const handleStartLocalAnalysis = () => {
        setActiveMode("local");
        runLocalAnalysis(rawMandate);
    }

    const handleRunAIRewrite = () => {
        setActiveMode("rewrite");
        runAIRewrite();
    }

    const entrance = {
        hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
        visible: { opacity: 1, y: 0 },
    };

    const hasInsights = jobInfos?.keywords && jobInfos.keywords.length > 0;

    return (
        <motion.section
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.06 } } }}
            className="mx-auto w-full max-w-3xl p-4 sm:p-6 lg:p-8"
        >
            <motion.div variants={entrance} transition={{ duration: 0.35 }} className="mb-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
                    <Sparkles className="size-4" /> CV intelligence
                </div>
                <h1 className="text-2xl font-semibold sm:text-3xl">Analyse a job mandate</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Add the role context, review extracted insights, and paste the mandate to find resume opportunities.
                </p>
            </motion.div>

            <motion.div variants={entrance} transition={{ duration: 0.35 }}>
                <Card className="overflow-hidden rounded-lg border-border/80 shadow-sm">
                    <CardHeader className="border-b bg-muted/30 px-5 py-4 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="flex size-9 items-center justify-center rounded-md border bg-background text-primary shadow-sm">
                                    <FileSearch className="size-4" />
                                </span>
                                <div>
                                    <CardTitle className="text-base">Analysis workspace</CardTitle>
                                    <p className="mt-1 text-xs text-muted-foreground">Role, insights and mandate</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs font-medium">
                                {isBusy ? (
                                    <LoaderCircle className="size-3.5 animate-spin text-primary" />
                                ) : (
                                    <span className="size-2 rounded-full bg-emerald-500" />
                                )}
                                {aiState.status || "Idle"}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6 p-5 sm:p-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="analysis-role" className="flex items-center gap-2 text-xs">
                                    <Target className="size-3.5 text-muted-foreground" /> Role
                                </Label>
                                <Input
                                    id="analysis-role"
                                    value={jobInfos?.title || ""}
                                    onChange={(event) => updateJobInfos({ title: event.target.value })}
                                    placeholder="Senior Full-Stack Engineer"
                                    className="bg-background"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="analysis-company" className="flex items-center gap-2 text-xs">
                                    <Building2 className="size-3.5 text-muted-foreground" /> Company
                                </Label>
                                <Input
                                    id="analysis-company"
                                    value={jobInfos?.company || ""}
                                    onChange={(event) => updateJobInfos({ company: event.target.value })}
                                    placeholder="Company name"
                                    className="bg-background"
                                />
                            </div>
                        </div>

                        <AnimatePresence mode="wait">
                            {hasInsights ? (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="space-y-5 rounded-xl border bg-muted/20 p-4 sm:p-5"
                                >
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold">Extracted insights</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Review the signals before rewriting.
                                        </p>
                                    </div>
                                    <span className="flex size-8 items-center justify-center rounded-md border bg-background text-muted-foreground">
                                        <ScanSearch className="size-4" />
                                    </span>
                                </div>

                                {jobInfos?.focus && (
                                    <div className="border-l-2 border-primary pl-3">
                                        <p className="text-[11px] font-medium uppercase text-muted-foreground">
                                            Key focus
                                        </p>
                                        <p className="mt-1 text-sm leading-6">{jobInfos.focus}</p>
                                    </div>
                                )}

                                <div>
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="text-[11px] font-medium uppercase text-muted-foreground">
                                            Extracted skills
                                        </p>
                                        <span className="text-xs tabular-nums text-muted-foreground">
                                            {jobInfos?.keywords?.length || 0}
                                        </span>
                                    </div>
                                    <motion.div layout className="flex flex-wrap gap-2">
                                        <AnimatePresence initial={false}>
                                            {jobInfos?.keywords?.map((skill) => (
                                                <motion.span
                                                    layout
                                                    key={skill}
                                                    initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.92 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.92 }}
                                                    className="inline-flex h-8 items-center gap-1 rounded-md border bg-background pl-2.5 pr-1 text-xs font-medium shadow-sm"
                                                >
                                                    <Check className="size-3 text-emerald-600" />
                                                    {skill}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-6 text-muted-foreground hover:text-destructive"
                                                        onClick={() => removeKeyword(skill)}
                                                        aria-label={`Remove ${skill}`}
                                                        title={`Remove ${skill}`}
                                                    >
                                                        <X className="size-3" />
                                                    </Button>
                                                </motion.span>
                                            ))}
                                        </AnimatePresence>
                                    </motion.div>
                                </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="empty"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex items-center gap-3 rounded-xl border border-dashed p-4 text-muted-foreground"
                                >
                                    <span className="flex size-9 items-center justify-center rounded-lg border bg-background">
                                        <ScanSearch className="size-4" />
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">No insights yet</p>
                                        <p className="text-xs">Run an analysis to extract skills and focus.</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-2">
                            <div className="flex items-end justify-between gap-3">
                                <Label htmlFor="analysis-mandate" className="text-xs">
                                    Job description / mandate
                                </Label>
                                <span className="text-[11px] tabular-nums text-muted-foreground">
                                    {rawMandate.length} characters
                                </span>
                            </div>
                            <Textarea
                                id="analysis-mandate"
                                value={rawMandate}
                                onChange={(event) => setRawMandate(event.target.value)}
                                placeholder="Paste the role, responsibilities, requirements, and preferred skills…"
                                className="min-h-56 resize-y bg-background leading-6 sm:min-h-64"
                            />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            {aiAvailable && (
                                <Button
                                    type="button"
                                    className="sm:flex-1 cursor-pointer"
                                    disabled={!rawMandate.trim() || isBusy}
                                    onClick={handleStartAnalysis}
                                >
                                    {isBusy && activeMode === "ai" ? (
                                        <LoaderCircle className="animate-spin" />
                                    ) : (
                                        <Sparkles />
                                    )}
                                    Analyse with AI
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="outline"
                                className="sm:flex-1 cursor-pointer"
                                disabled={!rawMandate.trim() || isBusy}
                                onClick={handleStartLocalAnalysis}
                            >
                                {isBusy && activeMode === "local" ? (
                                    <LoaderCircle className="animate-spin" />
                                ) : (
                                    <ScanSearch />
                                )}
                                Fast analysis
                            </Button>
                        </div>

                        {hasInsights && (
                            <motion.div
                                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="pt-2"
                            >
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="w-full cursor-pointer"
                                    disabled={isBusy}
                                    onClick={handleRunAIRewrite}
                                >
                                    {isBusy && activeMode === "rewrite" ? (
                                        <LoaderCircle className="animate-spin" />
                                    ) : (
                                        <Wand2 className="size-4" />
                                    )}
                                    Rewrite resume
                                </Button>
                            </motion.div>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </motion.section>
    )
}