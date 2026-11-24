import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
    Briefcase, Calendar, Facebook, FolderKanban, Github, Globe, GraduationCap, Instagram, Languages, Link,
    Linkedin, Mail, MapPin, Phone, Sparkles, Twitter, User, Video, Wrench, Youtube, Award,
} from "lucide-react";

/**
 * Icons a template can draw with {{icon "name"}}. Contact keys (mail, phone, linkedin…) are included so
 * {{icon key}} works inside {{#each contacts}}. Add an entry to offer a new icon.
 */
const ICONS: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
    mail: Mail,
    phone: Phone,
    portfolio: Globe,
    globe: Globe,
    linkedin: Linkedin,
    github: Github,
    twitter: Twitter,
    instagram: Instagram,
    tiktok: Video,
    youtube: Youtube,
    facebook: Facebook,
    link: Link,
    location: MapPin,
    calendar: Calendar,
    experience: Briefcase,
    education: GraduationCap,
    projects: FolderKanban,
    skills: Wrench,
    languages: Languages,
    summary: User,
    certification: Award,
    sparkles: Sparkles,
};

export const ICON_NAMES = Object.keys(ICONS);

const cache = new Map<string, string>();

/** Inline SVG markup of an icon (empty for an unknown name), using currentColor so CSS can colour it. */
export const iconSvg = (name: string, size = 12, strokeWidth = 2): string => {
    const key = `${name}:${size}:${strokeWidth}`;
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const Icon = ICONS[name];
    const svg = Icon ? renderToStaticMarkup(createElement(Icon, { size, strokeWidth })).replace("<svg", '<svg class="cv-icon"') : "";
    cache.set(key, svg);
    return svg;
};
