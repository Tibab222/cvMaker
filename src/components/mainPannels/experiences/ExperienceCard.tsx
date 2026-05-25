import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Experience } from "@shared/Experience.interface";
import { Building, ChevronDown, MapPin, Calendar as LucideCalendar, Edit2, Trash2, X, Save, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ExperienceCard({
    experience,
    onSave,
    onCancel,
    onDelete,
    defaultEdit = false
}: {
    experience: Experience;
    onSave: (updatedExperience: Experience) => void;
    onCancel?: () => void;
    onDelete?: (id: string) => void;
    defaultEdit?: boolean;
}) {
    const [formData, setFormData] = useState<Experience>(experience);
    const [isCurrent, setIsCurrent] = useState(experience.endDate === "Present");
    const [isEditing, setIsEditing] = useState(defaultEdit);

    useEffect(() => {
        const updateFormData = () => {
            setFormData(experience);
            setIsCurrent(experience.endDate === "Present");
        };
        updateFormData();
    }, [experience]);

    const handleSave = () => {
        onSave(formData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (!experience.id) {
            // New unsaved card
            onCancel?.();
        } else {
            // Existing card: reset and close
            setFormData(experience);
            setIsCurrent(experience.endDate === "Present");
            setIsEditing(false);
            onCancel?.();
        }
    };

    const handleDelete = () => {
        if (experience.id && onDelete) {
            onDelete(experience.id);
        }
    };

    const formatDate = (date: Date | 'Present' | undefined) => {
        if (!date) return '';
        if (date === 'Present') return 'Present';
        return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    };

    return (
        <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-md border border-muted/80">
            <AnimatePresence mode="wait">
                {!isEditing ? (
                    <motion.div
                        key="view"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1 flex-1">
                                    <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                                        {formData.jobTitle || <span className="text-muted-foreground/50 italic">Untitled Position</span>}
                                    </CardTitle>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground mt-1.5">
                                        <span className="flex items-center gap-1.5 font-medium text-primary/95">
                                            <Building className="h-4 w-4 shrink-0 text-primary/75" />
                                            {formData.company || <span className="italic text-muted-foreground/50">Unnamed Company</span>}
                                        </span>
                                        {formData.location && (
                                            <span className="flex items-center gap-1.5 text-muted-foreground/80">
                                                <MapPin className="h-4 w-4 shrink-0" />
                                                {formData.location}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/90 font-mono bg-muted/50 px-2.5 py-1 rounded-md shrink-0 border border-muted">
                                    <LucideCalendar className="h-3.5 w-3.5" />
                                    <span>{formatDate(formData.startDate)}</span>
                                    <span>—</span>
                                    <span>{formData.endDate === "Present" ? "Present" : formatDate(formData.endDate)}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-2 pb-4">
                            {formData.description ? (
                                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pl-4 border-l-2 border-primary/20 bg-muted/10 py-1 rounded-r-md">
                                    {formData.description}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground/50 italic pl-4 border-l-2 border-muted py-1">
                                    No description provided.
                                </p>
                            )}
                        </CardContent>
                        <CardFooter className="pt-0 border-t border-muted/40 bg-muted/5 flex justify-end gap-2 py-3">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="gap-1.5 hover:bg-background"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit2 className="h-3.5 w-3.5" />
                                Edit
                            </Button>
                        </CardFooter>
                    </motion.div>
                ) : (
                    <motion.div
                        key="edit"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-semibold text-muted-foreground flex items-center gap-2">
                                <Building className="h-4 w-4 text-primary" />
                                {experience.id ? "Edit Experience" : "Add New Experience"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3.5 pb-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Company or Organization</label>
                                <Input 
                                    placeholder="Company name, Association name, ..." 
                                    value={formData.company} 
                                    onChange={(e) => setFormData({...formData, company: e.target.value})} 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Job Title or Role</label>
                                <InputGroup>
                                    <InputGroupInput 
                                        placeholder="Job title" 
                                        value={formData.jobTitle} 
                                        onChange={(e) => setFormData({...formData, jobTitle: e.target.value})} 
                                    />
                                    <InputGroupAddon><Building className="h-4 w-4" /></InputGroupAddon>
                                </InputGroup>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Role Description</label>
                                <InputGroup>
                                    <InputGroupTextarea 
                                        placeholder="Describe your achievements and key responsibilities..." 
                                        value={formData.description} 
                                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                                    />
                                    <InputGroupAddon><Building className="h-4 w-4" /></InputGroupAddon>
                                </InputGroup>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-muted-foreground">Location</label>
                                <InputGroup>
                                    <InputGroupInput 
                                        placeholder="Location (e.g. San Francisco, CA or Remote)" 
                                        value={formData.location} 
                                        onChange={(e) => setFormData({...formData, location: e.target.value})} 
                                    />
                                    <InputGroupAddon><MapPin className="h-4 w-4" /></InputGroupAddon>
                                </InputGroup>
                            </div>

                            <div className="space-y-2 mt-1">
                                <label className="text-xs font-medium text-muted-foreground block">Timeline</label>
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground font-medium shrink-0">From:</span>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button 
                                                    variant="outline" 
                                                    data-empty={!formData.startDate} 
                                                    className="w-48 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                                                >
                                                    {formData.startDate ? new Date(formData.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : "Start date"}
                                                    <ChevronDown className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={new Date(formData.startDate)}
                                                    onSelect={(date: Date) => {setFormData({ ...formData, startDate: date})}}
                                                    defaultMonth={formData.startDate}
                                                    captionLayout="dropdown"
                                                    required
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {!isCurrent && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground font-medium shrink-0">To:</span>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button 
                                                        variant="outline" 
                                                        data-empty={!formData.endDate} 
                                                        className="w-48 justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
                                                    >
                                                        {formData.endDate ? new Date(formData.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : "End date"}
                                                        <ChevronDown className="h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={new Date(formData.endDate || new Date())}
                                                        onSelect={(date: Date) => {setFormData({ ...formData, endDate: date})}}
                                                        defaultMonth={formData.endDate === "Present" ? new Date() : formData.endDate}
                                                        captionLayout="dropdown"
                                                        required
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 ml-1">
                                        <Checkbox 
                                            id={`current-${experience.id || 'new'}`}
                                            checked={isCurrent} 
                                            onCheckedChange={(checked: boolean) => {
                                                setIsCurrent(checked);
                                                setFormData({ ...formData, endDate: checked ? "Present" : undefined });
                                            }} 
                                        />
                                        <label 
                                            htmlFor={`current-${experience.id || 'new'}`}
                                            className="text-xs font-medium text-muted-foreground select-none cursor-pointer"
                                        >
                                            Currently working here
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t border-muted/40 bg-muted/5 flex items-center justify-between py-3">
                            <div>
                                {experience.id && onDelete && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                                        onClick={handleDelete}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Delete
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-1.5"
                                    onClick={handleCancel}
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancel
                                </Button>
                                <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="gap-1.5 shadow-sm"
                                    onClick={handleSave}
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    Save
                                </Button>
                            </div>
                        </CardFooter>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    );
}