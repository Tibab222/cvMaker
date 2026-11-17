import { useProfileStore } from "@/store/profile";
import { motion } from "framer-motion";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupHint } from "../ui/input-group";
import { Facebook, Github, Globe, Instagram, Linkedin, Mail, Phone, Plus, Save, Trash2, Twitter, UserRound, Youtube } from "lucide-react";
import { Button } from "../ui/button";
import type { Profile } from "@shared/profile.interface";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ProfilePhoto from "./photo/ProfilePhoto";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";

interface FieldProps {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  optional?: boolean;
  hint?: string;
  value?: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}

function Field({
  label,
  icon: Icon,
  optional = false,
  hint,
  value = "",
  placeholder,
  type = "text",
  onChange,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-sm font-medium">
          {label}
          {optional && (
            <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
              Optional
            </span>
          )}
        </Label>
        {hint && <span className="text-xs text-muted-foreground/70">{hint}</span>}
      </div>
      <InputGroup>
        {Icon && (
          <InputGroupAddon>
            <Icon />
          </InputGroupAddon>
        )}
        <InputGroupInput
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        {optional && !value && (
          <InputGroupHint>Leave empty to hide</InputGroupHint>
        )}
      </InputGroup>
    </div>
  );
}

function TikTok({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.9 2.9 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

interface SectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function Section({ title, description, children }: SectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </motion.section>
  );
}

export default function Personal() {
    const { profile, updateSection } = useProfileStore();
    const [formData, setFormData] = useState<Profile | null>(null);

    useEffect(() => {
        const udpateFormData = () => {
            if (profile) setFormData(profile);
        };
        udpateFormData();
    }, [profile]);

    const handleChange = (field: keyof Profile, value: string) => {
        if (!formData) return;
        setFormData({ ...formData, [field]: value });
    };

    const handlePhotoChange = (photo: string | undefined) => {
        if (!formData) return;
        setFormData({ ...formData, photo });
    };

    const handleCustomLinkChange = (index: number, patch: { label?: string; url?: string }) => {
        if (!formData) return;
        const customLinks = (formData.customLinks ?? []).map((link, i) =>
            i === index ? { ...link, ...patch } : link,
        );
        setFormData({ ...formData, customLinks });
    };

    const handleAddCustomLink = () => {
        if (!formData) return;
        setFormData({
            ...formData,
            customLinks: [...(formData.customLinks ?? []), { label: "", url: "" }],
        });
    };

    const handleRemoveCustomLink = (index: number) => {
        if (!formData) return;
        setFormData({
            ...formData,
            customLinks: (formData.customLinks ?? []).filter((_, i) => i !== index),
        });
    };

    const handleSave = async () => {
        if (!formData) return;
        const customLinks = (formData.customLinks ?? []).filter(
            (link) => link.label.trim() && link.url.trim(),
        );
        await updateSection("profile", {...formData, customLinks});
        toast.success("Profile updated successfully!");
    };

    if (!formData) return <p className="text-sm text-muted-foreground">Loading…</p>;

    const customLinks = formData.customLinks ?? [];

    return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="w-full p-4"
    >
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="flex flex-col gap-5 border-b border-border/60 bg-muted/30 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <ProfilePhoto photo={formData.photo} onChange={handlePhotoChange} isDirty={formData.photo !== profile?.photo} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:justify-end">
            <UserRound className="size-4" />
            <span>Fields marked Optional stay off your CV until you fill them in.</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-7 pt-6">
          <Section
            title="Identity"
            description="The basics recruiters see first."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="First name"
                icon={UserRound}
                placeholder="Alex"
                value={formData.firstName}
                onChange={(value) => handleChange("firstName", value)}
              />
              <Field
                label="Last name"
                icon={UserRound}
                placeholder="Morgan"
                value={formData.lastName}
                onChange={(value) => handleChange("lastName", value)}
              />
            </div>
          </Section>

          <Separator className="bg-border/60" />

          <Section
            title="Contact"
            description="Only what you fill in appears on the generated CV."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Email"
                icon={Mail}
                optional
                type="email"
                placeholder="alex.morgan@email.com"
                value={formData.mail ?? ""}
                onChange={(value) => handleChange("mail", value)}
              />
              <Field
                label="Phone"
                icon={Phone}
                optional
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone ?? ""}
                onChange={(value) => handleChange("phone", value)}
              />
            </div>
          </Section>

          <Separator className="bg-border/60" />

          <Section
            title="Professional profiles"
            description="Modern recruiters prefer clear profile links over a phone number."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="LinkedIn"
                icon={Linkedin}
                optional
                placeholder="linkedin.com/in/you"
                value={formData.linkedin ?? ""}
                onChange={(value) => handleChange("linkedin", value)}
              />
              <Field
                label="GitHub"
                icon={Github}
                optional
                placeholder="github.com/you"
                value={formData.github ?? ""}
                onChange={(value) => handleChange("github", value)}
              />
              <Field
                label="Portfolio"
                icon={Globe}
                optional
                placeholder="yourname.dev"
                value={formData.portfolio ?? ""}
                onChange={(value) => handleChange("portfolio", value)}
              />
              <Field
                label="X / Twitter"
                icon={Twitter}
                optional
                placeholder="x.com/you"
                value={formData.twitter ?? ""}
                onChange={(value) => handleChange("twitter", value)}
              />
              <Field
                label="Instagram"
                icon={Instagram}
                optional
                placeholder="instagram.com/you"
                value={formData.instagram ?? ""}
                onChange={(value) => handleChange("instagram", value)}
              />
              <Field
                label="TikTok"
                icon={TikTok}
                optional
                placeholder="tiktok.com/@you"
                value={formData.tiktok ?? ""}
                onChange={(value) => handleChange("tiktok", value)}
              />
              <Field
                label="YouTube"
                icon={Youtube}
                optional
                placeholder="youtube.com/@you"
                value={formData.youtube ?? ""}
                onChange={(value) => handleChange("youtube", value)}
              />
              <Field
                label="Facebook"
                icon={Facebook}
                optional
                placeholder="facebook.com/you"
                value={formData.facebook ?? ""}
                onChange={(value) => handleChange("facebook", value)}
              />
            </div>

            {customLinks.length > 0 && (
              <div className="space-y-3">
                {customLinks.map((link, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-center"
                  >
                    <InputGroup className="h-9">
                      <InputGroupInput
                        placeholder="Platform (e.g. Behance)"
                        value={link.label}
                        onChange={(event) =>
                          handleCustomLinkChange(index, { label: event.target.value })
                        }
                      />
                    </InputGroup>
                    <InputGroup className="h-9">
                      <InputGroupAddon>
                        <Globe />
                      </InputGroupAddon>
                      <InputGroupInput
                        placeholder="https://link-to-your-profile"
                        value={link.url}
                        onChange={(event) =>
                          handleCustomLinkChange(index, { url: event.target.value })
                        }
                      />
                    </InputGroup>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 text-muted-foreground hover:text-destructive"
                      aria-label={`Remove link ${link.label || index + 1}`}
                      onClick={() => handleRemoveCustomLink(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground"
              onClick={handleAddCustomLink}
            >
              <Plus className="size-3.5" />
              Add another profile link
            </Button>
          </Section>
        </CardContent>

        <CardFooter className="justify-end border-t border-border/60 bg-muted/30">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button className="h-9 gap-2" onClick={handleSave}>
              <Save className="size-4" />
              Save
            </Button>
          </motion.div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}