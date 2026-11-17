import type { AutofillProfile } from "../../shared/discovery.types";
import type { ProfilesData } from "../../shared/profilesData.interface";

const toTime = (value: unknown): number => {
    const time = new Date(value as string).getTime();
    return Number.isNaN(time) ? 0 : time;
};

/** The small subset of the profile an application form asks for. Everything else stays in the app. */
export function buildAutofillProfile(data: ProfilesData): AutofillProfile {
    const { profile } = data;
    // current job first (no end date / "Present"), then the most recent start
    const latest = [...data.experience].sort((a, b) => {
        const aCurrent = !a.endDate || a.endDate === "Present" ? 1 : 0;
        const bCurrent = !b.endDate || b.endDate === "Present" ? 1 : 0;
        return bCurrent - aCurrent || toTime(b.startDate) - toTime(a.startDate);
    })[0];

    return {
        firstName: profile.firstName ?? "",
        lastName: profile.lastName ?? "",
        fullName: `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim(),
        email: profile.mail ?? "",
        phone: profile.phone ?? "",
        linkedin: profile.linkedin ?? "",
        github: profile.github ?? "",
        portfolio: profile.portfolio ?? profile.customLinks?.[0]?.url ?? "",
        location: latest?.location ?? "",
        currentTitle: latest?.jobTitle ?? "",
        currentCompany: latest?.company ?? "",
    };
}
