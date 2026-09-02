import { api } from "@/api";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "../ui/input-group";
import { LucideSmile, PersonStanding } from "lucide-react";
import { useProfileStore } from "@/store/profile";
import { Tabs, useUiStore } from "@/store/ui";
import { Language } from "@shared/profile.interface";
import { ButtonGroup } from "../ui/button-group";

export default function Home() {
    const [newProfileMode, setNewProfileMode] = useState(false);

    return (
        <motion.div 
            className="w-full h-full flex items-center justify-center p-4" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.5 }}
        >
            {!newProfileMode ? <ExistingProfilesCard setNewProfileMode={setNewProfileMode} /> : <NewProfileForm setNewProfileMode={setNewProfileMode} />}
        </motion.div>
    )
}

const ExistingProfilesCard = ({setNewProfileMode}: {setNewProfileMode: (mode: boolean) => void}) => {
    const [profiles, setProfiles] = useState<{id: string, firstName: string; lastName: string; language: Language}[]>([]);
    const { loadProfile } = useProfileStore();
    const { setSelectedTab, setAiAvailable } = useUiStore();

    useEffect(() => {
        const fetchProfiles = async () => {
            const profilesList = await api.getProfilesList();
            if(profilesList && Array.isArray(profilesList)) {
                const profilesData = profilesList.map((profileName: string) => {
                    const [firstName, lastName, language] = profileName.split('_');
                    return { id: profileName, firstName, lastName, language: language as Language };
                });
                setProfiles(profilesData);
            }
        }
        fetchProfiles();
    }, []);

    useEffect(() => {
        const checkAI = async () => {
            const isAIAvailable = await api.checkAIAvailability();
            setAiAvailable(isAIAvailable);
        }
        checkAI();
    }, [setAiAvailable]);

    const handleProfileSelect = (profileId: string) => {
        const selectedProfile = profiles.find(profile => profile.id === profileId);
        if (selectedProfile) {
            loadProfile(selectedProfile.id);
            setSelectedTab(Tabs.DASHBOARD);
        }
    }

    return (
        <Card className="w-1/3 mx-auto">
            <CardHeader>
                <CardTitle>Existing Profiles</CardTitle>
                <CardDescription>Select a profile to use or edit it.</CardDescription>
            </CardHeader>
            <CardContent>
                {profiles.length > 0 ? (
                    <ul className="list-disc list-inside">
                        {profiles.map((profile) => (
                            <li key={profile.id} className="hover:underline cursor-pointer" onClick={() => handleProfileSelect(profile.id)}>
                                {profile.firstName} {profile.lastName} {profile.language && `(${profile.language})`}
                            </li>
                        ))}
                    </ul>
                ) : (<p>No profiles found. Please create a new profile.</p>)}
            </CardContent>
            <CardFooter>
                <Button variant={"outline"} className="m-2" onClick={() => setNewProfileMode(true)}>
                    Create new profile
                </Button>
            </CardFooter>
        </Card>
    )
}

const NewProfileForm = ({ setNewProfileMode }: { setNewProfileMode: (mode: boolean) => void }) => {
    const [firstname, setFirstname] = useState('');
    const [lastname, setLastname] = useState('');
    const [language, setLanguage] = useState(Language.FRENCH);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firstname || !lastname) {
            setError('Please fill in both fields');
            return;
        }
        const result = await api.addProfile(firstname, lastname, language);
        if (result.success) {
            setNewProfileMode(false);
        } else {
            setError(result.error || 'An error occurred');
        }
    }

    return (
        <Card className="w-1/3 mx-auto">
            <CardHeader>
                <CardTitle>Create a New Profile</CardTitle>
                <CardDescription>Fill in the details to create a new profile.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
                <InputGroup>
                    <InputGroupInput placeholder="FirstName" value={firstname} onChange={(e) => setFirstname(e.target.value)} />
                    <InputGroupAddon>
                        <PersonStanding className="text-muted-foreground" />
                    </InputGroupAddon>
                </InputGroup>
                <InputGroup>
                    <InputGroupInput placeholder="LastName" value={lastname} onChange={(e) => setLastname(e.target.value)} />
                    <InputGroupAddon>
                        <LucideSmile className="text-muted-foreground" />
                    </InputGroupAddon>
                </InputGroup>
                <ButtonGroup>
                    <Button variant={language === Language.FRENCH ? 'default' : 'outline'} onClick={() => setLanguage(Language.FRENCH)} disabled={language === Language.FRENCH}>
                        French
                    </Button>
                    <Button variant={language === Language.ENGLISH ? 'default' : 'outline'} onClick={() => setLanguage(Language.ENGLISH)} disabled={language === Language.ENGLISH}>
                        English
                    </Button>
                </ButtonGroup>
                <Button className="cursor-pointer" onClick={handleSubmit}>Create Profile</Button>
                {error && <p className="text-red-500">{error}</p>}
            </CardContent>
        </Card>
    )
}