import { useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Pencil, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PhotoEditorDialog from "./PhotoEditorDialog";
import { ACCEPTED_PHOTO_TYPES, readFileAsDataUrl, validatePhotoFile } from "./photoEditing";

interface ProfilePhotoProps {
    photo?: string;
    isDirty: boolean; // photo differs from the saved profile
    onChange: (photo: string | undefined) => void;
}

export default function ProfilePhoto({ photo, isDirty, onChange }: ProfilePhotoProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [editorSource, setEditorSource] = useState<string | null>(null);

    const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // lets the same file be picked again after cancelling
        if (!file) return;

        const error = validatePhotoFile(file);
        if (error) {
            toast.error(error);
            return;
        }
        try {
            setEditorSource(await readFileAsDataUrl(file));
        } catch (err) {
            console.error("Error reading photo:", err);
            toast.error("Could not read this file.");
        }
    };

    const handleApply = (edited: string) => {
        onChange(edited);
        setEditorSource(null);
    };

    return (
        <div className="flex items-center gap-4">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-foreground/10">
                {photo
                    ? <img src={photo} alt="Profile photo" className="size-full object-cover" />
                    : <UserRound className="size-10 text-muted-foreground" aria-hidden />}
            </div>
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => inputRef.current?.click()}>
                        <ImagePlus /> {photo ? "Replace" : "Upload photo"}
                    </Button>
                    {photo && (
                        <>
                            <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setEditorSource(photo)}>
                                <Pencil /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => onChange(undefined)}>
                                <Trash2 /> Remove
                            </Button>
                        </>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                    {isDirty
                        ? "Unsaved change: click Save to keep it."
                        : "JPEG, PNG or WebP, up to 10 MB. You can hide it on individual resumes."}
                </p>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_PHOTO_TYPES.join(",")}
                className="hidden"
                onChange={handleFileSelected}
            />
            <PhotoEditorDialog source={editorSource} onCancel={() => setEditorSource(null)} onApply={handleApply} />
        </div>
    );
}
