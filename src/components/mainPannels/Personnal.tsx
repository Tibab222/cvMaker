import { useProfileStore } from "@/store/profile";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";
import { Github, Link, Linkedin, Mail, PersonStanding, Phone, Smile } from "lucide-react";
import { Button } from "../ui/button";
import type { Profile } from "@shared/profile.interface";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Personal() {
    const { profile, updateSection } = useProfileStore();
    const [formData, setFormData] = useState<Profile | null>(null);

    useEffect(() => {
        const udpateFormData = () => {
            if (profile) {
                setFormData(profile);
            }
        };
        udpateFormData();
    }, [profile]);

    const handleChange = (field: keyof Profile, value: string) => {
        if (!formData) return;
        setFormData({ ...formData, [field]: value });
    };

    const handleSave = async () => {
        if (formData) {
            await updateSection("profile", formData);
            toast.success("Profile updated successfully!");
        }
    };

    if (!formData) return <p>Loading...</p>;

    return (
        <motion.div className="w-full h-full flex p-4" initial={{ opacity: 0, x: -200 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
            <Card className="w-full h-fit">
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    <InputGroup>
                        <InputGroupInput placeholder="Surname" value={formData?.firstName} onChange={(e) => handleChange("firstName", e.target.value)} />
                        <InputGroupAddon><PersonStanding /></InputGroupAddon>
                    </InputGroup>
                    <InputGroup>
                        <InputGroupInput placeholder="Last Name" value={formData?.lastName} onChange={(e) => handleChange("lastName", e.target.value)} />
                        <InputGroupAddon><Smile /></InputGroupAddon>
                    </InputGroup>
                    <InputGroup>
                        <InputGroupInput placeholder="Mail" value={formData?.mail} onChange={(e) => handleChange("mail", e.target.value)} />
                        <InputGroupAddon><Mail /></InputGroupAddon>
                    </InputGroup>
                    <InputGroup>
                        <InputGroupInput placeholder="Phone number" value={formData?.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                        <InputGroupAddon><Phone /></InputGroupAddon>
                    </InputGroup>
                    <InputGroup>
                        <InputGroupInput placeholder="Portfolio" value={formData?.portfolio} onChange={(e) => handleChange("portfolio", e.target.value)} />
                        <InputGroupAddon><Link /></InputGroupAddon>
                    </InputGroup>
                    <InputGroup>
                        <InputGroupInput placeholder="Linkedin" value={formData?.linkedin} onChange={(e) => handleChange("linkedin", e.target.value)} />
                        <InputGroupAddon><Linkedin /></InputGroupAddon>
                    </InputGroup>
                    <InputGroup>
                        <InputGroupInput placeholder="Github" value={formData?.github} onChange={(e) => handleChange("github", e.target.value)} />
                        <InputGroupAddon><Github /></InputGroupAddon>
                    </InputGroup>
                </CardContent>
                <CardFooter>
                    <Button variant="default" className="ml-auto cursor-pointer" onClick={handleSave}>
                        Save
                    </Button>
                </CardFooter>
            </Card>
        </motion.div>
    )
}