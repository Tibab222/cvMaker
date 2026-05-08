import type { Profile } from "@shared/profile.interface";
import { Mail, Phone, Globe, Linkedin, Github } from "lucide-react";

export default function CVHeader({ profile }: { profile: Profile }) {
  return (
    <header className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-2">
      {/* Nom et Titre (Optionnel si tu l'ajoutes au profile plus tard) */}
      <div className="flex flex-col">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">
          {profile.firstName} <span className="text-slate-500">{profile.lastName}</span>
        </h1>
        <p className="text-sm font-bold text-slate-600 uppercase tracking-widest mt-1">
          Étudiant en Génie Informatique
        </p>
      </div>

      {/* Contact & Liens - Grid compacte */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-700">
        <div className="flex items-center gap-1.5 justify-end">
          <a 
            href={`mailto:${profile.mail}`} 
            className="font-medium underline decoration-slate-300"
          >
            {profile.mail}
          </a>
          <Mail size={12} className="text-slate-400" />
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <a 
            href={profile.portfolio} 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-medium underline decoration-slate-300"
          >
            {profile.portfolio.replace(/^https?:\/\//, '')}
          </a>
          <Globe size={12} className="text-slate-400" />
        </div>
        <div className="flex items-center gap-1.5 justify-end">
          <span>{profile.phone}</span>
          <Phone size={12} className="text-slate-400" />
        </div>
        <div className="flex items-center gap-1.5 justify-end text-right">
          <a 
            href={profile.linkedin} 
            target="_blank" 
            rel="noopener noreferrer"
            className="font-medium"
          >
            {profile.linkedin.replace(/^https?:\/\/www\./, '')}
          </a>
          <Linkedin size={12} className="text-slate-400" />
        </div>
        <div className="col-span-2 flex items-center gap-1.5 justify-end mt-0.5">
          <span className="font-mono text-[9px] bg-slate-100 px-1.5 py-0.5 rounded italic">
            github.com/{profile.github}
          </span>
          <Github size={12} className="text-slate-900" />
        </div>
      </div>
    </header>
  );
}