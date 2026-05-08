import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Experience } from "@shared/Experience.interface";
import { Building, ChevronDown, LocationEdit } from "lucide-react";
import { useEffect, useState } from "react";

export default function ExperienceCard({experience, onSave}: { experience: Experience; onSave: (updatedExperience: Experience) => void }) {
    const [formData, setFormData] = useState<Experience>(experience);
    const [isCurrent, setIsCurrent] = useState(experience.endDate === "Present");

    useEffect(() => {
        const updateFormData = () => {
            setFormData(experience);
            setIsCurrent(experience.endDate === "Present");
        };
        updateFormData();
    }, [experience]);

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <Input placeholder="Company name, Association name, ..." value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} />
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <InputGroup>
                    <InputGroupInput placeholder="Job title" value={formData.jobTitle} onChange={(e) => setFormData({...formData, jobTitle: e.target.value})} />
                    <InputGroupAddon><Building /></InputGroupAddon>
                </InputGroup>

                <InputGroup>
                    <InputGroupTextarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    <InputGroupAddon><Building /></InputGroupAddon>
                </InputGroup>

                <InputGroup>
                    <InputGroupInput placeholder="Location" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
                    <InputGroupAddon><LocationEdit /></InputGroupAddon>
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
                    {!isCurrent && <Popover>
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
                    </Popover>}
                    <Checkbox className="ml-2" checked={isCurrent} onCheckedChange={(checked: boolean) => {
                        setIsCurrent(checked);
                        setFormData({ ...formData, endDate: checked ? "Present" : formData.endDate });
                    }} /> Currently working here
                    
                </div>

                
            </CardContent>
            <CardFooter>
                <Button variant="default" className="ml-auto" onClick={handleSave}>
                    Save
                </Button>
            </CardFooter>
        </Card>
    );
}