import type { Profile } from "@shared/profile.interface";
import { Mail, Phone, Globe, Linkedin, Github, Twitter, Instagram, Video, Youtube, Facebook, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCVSelection } from "../../provider/hook";

export default function CVHeader({ profile, showPhoto = false }: { profile: Profile; showPhoto?: boolean }) {
  const photo = showPhoto ? profile.photo : undefined;
  const { selection } = useCVSelection();
  const header = selection.headerInfos;

  const standardItems = [
    {
      key: "mail",
      show: profile.mail && header.mail,
      content: (
        <a href={`mailto:${profile.mail}`} className="font-medium underline decoration-slate-300">
          {profile.mail}
        </a>
      ),
      icon: <Mail size={12} className="text-slate-400" />,
    },
    {
      key: "phone",
      show: profile.phone && header.phone,
      content: <span>{profile.phone}</span>,
      icon: <Phone size={12} className="text-slate-400" />,
    },
    {
      key: "portfolio",
      show: profile.portfolio && header.portfolio,
      content: (
        <a href={profile.portfolio} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-slate-300">
          {profile.portfolio?.replace(/^https?:\/\//, "")}
        </a>
      ),
      icon: <Globe size={12} className="text-slate-400" />,
    },
    {
      key: "linkedin",
      show: profile.linkedin && header.linkedin,
      content: (
        <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="font-medium">
          {profile.linkedin?.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      ),
      icon: <Linkedin size={12} className="text-slate-400" />,
    },
    {
      key: "github",
      show: profile.github && header.github,
      content: (
        <a href={`https://github.com/${profile.github}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded italic">
          github.com/{profile.github}
        </a>
      ),
      icon: <Github size={12} className="text-slate-900" />,
    },
    {
      key: "twitter",
      show: profile.twitter && header.twitter,
      content: (
        <a href={profile.twitter} target="_blank" rel="noopener noreferrer" className="font-medium">
          {profile.twitter?.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      ),
      icon: <Twitter size={12} className="text-slate-400" />,
    },
    {
      key: "instagram",
      show: profile.instagram && header.instagram,
      content: (
        <a href={profile.instagram} target="_blank" rel="noopener noreferrer" className="font-medium">
          {profile.instagram?.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      ),
      icon: <Instagram size={12} className="text-slate-400" />,
    },
    {
      key: "tiktok",
      show: profile.tiktok && header.tiktok,
      content: (
        <a href={profile.tiktok} target="_blank" rel="noopener noreferrer" className="font-medium">
          {profile.tiktok?.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      ),
      icon: <Video size={12} className="text-slate-400" />,
    },
    {
      key: "youtube",
      show: profile.youtube && header.youtube,
      content: (
        <a href={profile.youtube} target="_blank" rel="noopener noreferrer" className="font-medium">
          {profile.youtube?.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      ),
      icon: <Youtube size={12} className="text-slate-400" />,
    },
    {
      key: "facebook",
      show: profile.facebook && header.facebook,
      content: (
        <a href={profile.facebook} target="_blank" rel="noopener noreferrer" className="font-medium">
          {profile.facebook?.replace(/^https?:\/\/(www\.)?/, "")}
        </a>
      ),
      icon: <Facebook size={12} className="text-slate-400" />,
    },
  ];

  const customItems = (profile.customLinks || [])
    .filter((link) => header.customLinks?.[link.label])
    .map((link) => ({
      key: `custom-${link.label}`,
      show: true,
      content: (
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-slate-300">
          {link.label}
        </a>
      ),
      icon: <LinkIcon size={12} className="text-slate-400" />,
    }));

  const visibleItems = [...standardItems.filter((item) => item.show), ...customItems];

  return (
    <header className={cn("flex justify-between border-b-2 border-slate-900 pb-4 mb-2 gap-4", photo ? "items-center" : "items-start")}>
      {/* Nom, Prénom & Titre */}
      <div className="flex items-center gap-4">
        {photo && (
          <img
            src={photo}
            alt={`${profile.firstName} ${profile.lastName}`}
            className="size-[24mm] shrink-0 rounded-full object-cover"
          />
        )}
        <div className="flex flex-col">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">
            {profile.firstName} <span className="text-slate-500">{profile.lastName}</span>
          </h1>
          {header.title && (
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mt-0.5">
              {header.title}
            </p>
          )}
        </div>
      </div>

      {/* Bloc Contact & Liens - Auto-adaptatif */}
      {visibleItems.length > 0 && (
        <div className="flex flex-wrap justify-end items-center gap-x-4 gap-y-1.5 text-[10px] text-slate-700 max-w-[55%]">
          {visibleItems.map((item) => (
            <div key={item.key} className="flex items-center gap-1.5 justify-end">
              {item.content}
              {item.icon}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}