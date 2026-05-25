import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Education } from "@shared/Education.interface";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarIcon, ChevronDown, MapPin, Notebook, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface EducationCardProps {
  education: Education;
  onSave: (education: Education) => void;
  defaultEdit?: boolean;
  onDelete?: (id: string) => void;
  onCancel?: () => void;
}

export default function EducationCard({education, onSave, defaultEdit = false, onDelete, onCancel}: EducationCardProps) {
    const [formData, setFormData] = useState<Education>(education);
    const [isEditing, setIsEditing] = useState<boolean>(defaultEdit);

    useEffect(() => {
        const updateFormData = () => {
            setFormData(education);
        };
        updateFormData();
    }, [education]);

    const handleSave = () => {
        onSave(formData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            setFormData(education);
            setIsEditing(false);
        }
    };

    const formatDate = (dateValue: string | Date | undefined) => {
        if (!dateValue || dateValue === "Present") return "Present";
        return new Date(dateValue).toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    };

    return (
        <Card className="overflow-hidden transition-all duration-300 hover:shadow-md border-muted/60">
            <AnimatePresence mode="wait">
                {!isEditing ? (
                <motion.div
                    key="view"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                >
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold text-primary tracking-tight">
                        {formData.institution || "Institution non spécifiée"}
                        </CardTitle>
                        <p className="text-md font-medium text-muted-foreground flex items-center gap-1.5">
                        <Notebook className="h-4 w-4 shrink-0" />
                        {formData.degree || "Diplôme non spécifié"}
                        </p>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={() => setIsEditing(true)}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0">
                    {/* Dates & Location Badge Row */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {formatDate(formData.startDate)} – {formatDate(formData.endDate)}
                        </span>
                        {formData.location && (
                        <span className="flex items-center gap-1 border-l pl-4 border-muted">
                            <MapPin className="h-3.5 w-3.5" />
                            {formData.location}
                        </span>
                        )}
                    </div>

                    {/* Description */}
                    {formData.description && (
                        <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-lg border border-muted/40 whitespace-pre-line">
                        {formData.description}
                        </p>
                    )}
                    </CardContent>
                </motion.div>
                ) : (
                <motion.div
                    key="edit"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                >
                    <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Modifier l'éducation
                    </CardTitle>
                    <Input 
                        placeholder="Institution" 
                        value={formData.institution} 
                        onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                        className="font-medium text-base focus-visible:ring-primary/50"
                    />
                    </CardHeader>

                    <CardContent className="flex flex-col gap-3.5">
                    <InputGroup>
                        <InputGroupInput 
                        placeholder="Degree" 
                        value={formData.degree} 
                        onChange={(e) => setFormData({ ...formData, degree: e.target.value })} 
                        />
                        <InputGroupAddon><Notebook className="h-4 w-4 text-muted-foreground" /></InputGroupAddon>
                    </InputGroup>

                    <InputGroup>
                        <InputGroupTextarea 
                        placeholder="Description" 
                        value={formData.description} 
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="min-h-25 resize-y"
                        />
                        <InputGroupAddon><Notebook className="h-4 w-4 text-muted-foreground" /></InputGroupAddon>
                    </InputGroup>

                    <InputGroup>
                        <InputGroupInput 
                        placeholder="Location" 
                        value={formData.location} 
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                        />
                        <InputGroupAddon><MapPin className="h-4 w-4 text-muted-foreground" /></InputGroupAddon>
                    </InputGroup>

                    {/* Date pickers row */}
                    <div className="flex flex-wrap items-center gap-4 bg-muted/20 p-3 rounded-lg border border-dashed border-muted/80">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-45">
                        <span className="w-10">From:</span>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant={"outline"} data-empty={!formData.startDate} className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground bg-background">
                                {formData.startDate ? formatDate(formData.startDate) : "Start date"}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode={"single"}
                                selected={formData.startDate ? new Date(formData.startDate) : undefined}
                                onSelect={(date: Date | undefined) => {
                                    if (date) setFormData({ ...formData, startDate: date })
                                }}
                                defaultMonth={formData.startDate ? new Date(formData.startDate) : undefined}
                                captionLayout="dropdown"
                                required
                            />
                            </PopoverContent>
                        </Popover>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-45">
                        <span className="w-10">To:</span>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant={"outline"} data-empty={!formData.endDate} className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground bg-background">
                                {formData.endDate ? formatDate(formData.endDate) : "End date"}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode={"single"}
                                selected={formData.endDate && formData.endDate !== "Present" ? new Date(formData.endDate) : new Date()}
                                onSelect={(date: Date | undefined) => { 
                                    if(date) setFormData({ ...formData, endDate: date })
                                }}
                                defaultMonth={formData.endDate && formData.endDate !== "Present" ? new Date(formData.endDate) : new Date()}
                                captionLayout="dropdown"
                                required
                            />
                            </PopoverContent>
                        </Popover>
                        </div>
                    </div>
                    </CardContent>

                    <CardFooter className="flex justify-end gap-2 bg-muted/10 pt-3 border-t border-muted/40">
                        {formData.id ? (
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="gap-2"
                                onClick={() => onDelete && onDelete(formData.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                        ) : (
                            <div />
                        )}
                        <Button variant="ghost" onClick={handleCancel}>
                            Cancel
                        </Button>
                        <Button variant="default" onClick={handleSave} className="shadow-sm">
                            Save
                        </Button>
                    </CardFooter>
                </motion.div>
                )}
            </AnimatePresence>
        </Card>
    )
}