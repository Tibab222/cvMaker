import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupTextarea } from "@/components/ui/input-group";
import type { Project } from "@shared/projects.interface";
import { Building, Link } from "lucide-react";
import { useEffect, useState } from "react";
import { BulletListEditor } from "./BulletList";

export default function ProjectCard({project, onSave}: { project: Project; onSave: (updatedProject: Project) => void }) {
    const [formData, setFormData] = useState<Project>(project);

    useEffect(() => {
        const updateFormData = () => {
            setFormData(project);
        };
        updateFormData();
    }, [project]);

    const handleSave = () => {
        onSave(formData);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <Input placeholder="Project title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <InputGroup>
                    <InputGroupTextarea placeholder="sub-title" value={formData.subtitle} onChange={(e) => setFormData({...formData, subtitle: e.target.value})} />
                    <InputGroupAddon><Building /></InputGroupAddon>
                </InputGroup>

                <InputGroup>
                    <InputGroupInput placeholder="Link" value={formData.link} onChange={(e) => setFormData({...formData, link: e.target.value})} />
                    <InputGroupAddon><Link /></InputGroupAddon>
                </InputGroup>

                <BulletListEditor 
                    bullets={formData.bullets || []} 
                    onChange={(newBullets) => setFormData({ ...formData, bullets: newBullets })}
                />
            </CardContent>
            <CardFooter>
                <Button variant="default" className="ml-auto" onClick={handleSave}>
                    Save
                </Button>
            </CardFooter>
        </Card>
    )
}