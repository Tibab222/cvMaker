import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Education } from "@shared/Education.interface";
import { ChevronDown, Notebook } from "lucide-react";
import { useEffect, useState } from "react";

export default function EducationCard({education, onSave}: {education: Education, onSave: (education: Education) => void}) {
    const [formData, setFormData] = useState<Education>(education);

    useEffect(() => {
        const updateFormData = () => {
            setFormData(education);
        };
        updateFormData();
    }, [education]);

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <Input placeholder="Institution" value={formData.institution} onChange={(e) => setFormData({...formData, institution: e.target.value})} />
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <InputGroup>
                    <InputGroupInput placeholder="Degree" value={formData.degree} onChange={(e) => setFormData({...formData, degree: e.target.value})} />
                    <InputGroupAddon><Notebook /></InputGroupAddon>
                </InputGroup>

                <InputGroup>
                    <InputGroupTextarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    <InputGroupAddon><Notebook /></InputGroupAddon>
                </InputGroup>

                <InputGroup>
                    <InputGroupInput placeholder="Location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                    <InputGroupAddon><Notebook /></InputGroupAddon>
                </InputGroup>

                <div>
                    <Popover>
                        From:
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} data-empty={!formData.startDate} className="w-53 justify-between text-left font-normal data-[empty=true]:text-muted-foreground">
                                {formData.startDate ? new Date(formData.startDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : "Start date"}
                                <ChevronDown />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode={"single"}
                                selected={new Date(formData.startDate)}
                                onSelect={(date: Date) => {setFormData({ ...formData, startDate: date})}}
                                defaultMonth={formData.startDate}
                                captionLayout="dropdown"
                                required
                            />
                        </PopoverContent>
                    </Popover>
                    <Popover>
                        To:
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} data-empty={!formData.endDate} className="w-53 justify-between text-left font-normal data-[empty=true]:text-muted-foreground">
                                {formData.endDate ? new Date(formData.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : "End date"}
                                <ChevronDown />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode={"single"}
                                selected={new Date(formData.endDate || new Date())}
                                onSelect={(date: Date) => {setFormData({ ...formData, endDate: date})}}
                                defaultMonth={formData.endDate === "Present" ? new Date() : formData.endDate}
                                captionLayout="dropdown"
                                required
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                
            </CardContent>
            <CardFooter>
                <Button variant="default" className="ml-auto" onClick={handleSave}>
                    Save
                </Button>
            </CardFooter>
        </Card>
    )
}