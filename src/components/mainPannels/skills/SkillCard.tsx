import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { Skills } from "@shared/Skills.interface";
import { BicepsFlexed } from "lucide-react";
import { useEffect, useState } from "react";

export default function SkillCard({skill, onSave, onDelete}: { skill: Skills; onSave: (updatedSkill: Skills) => void; onDelete: (skillId: string) => void }) {
    const [formData, setFormData] = useState<Skills>(skill);

    useEffect(() => {
        const updateFormData = () => {
            setFormData(skill);
        };
        updateFormData();
    }, [skill]);

    const handleSave = () => {
        onSave(formData);
    };

    const handleDelete = () => {
        onDelete(skill.id);
    };

    return <Card>
        <CardContent>
            <InputGroup>
                <InputGroupInput placeholder="skill" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                <InputGroupAddon>
                    <BicepsFlexed />
                </InputGroupAddon>
            </InputGroup>
            <InputGroup>
                <InputGroupInput placeholder="level (optional)" value={formData.proficiency} onChange={(e) => setFormData({...formData, proficiency: e.target.value})} />
            </InputGroup>
        </CardContent>
        <CardFooter>
            <Button variant="default" className="ml-auto" onClick={handleSave}>
                Save
            </Button>
            <Button variant="destructive" className="ml-2" onClick={handleDelete}>
                Delete
            </Button>
        </CardFooter>
    </Card>
}