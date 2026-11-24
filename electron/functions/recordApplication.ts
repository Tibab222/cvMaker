import type { Application, ApplicationsChangedEvent, BrowserApplicationDto, PastApplicationDto } from "../../shared/jobApplications.type";
import { getDiscoveryManager } from "../services/discovery";
import { JobApplicationManager, MANUAL_ORIGIN, type RecordSource } from "../services/jobApplications/jobApplicationManager";
import { broadcast } from "../utils/broadcast";
import { recordApplicationFromBrowser, type LinkedApplicationResult } from "./applicationFromOffer";
import { offerKeywords, offerKeywordsIn, profileLanguage } from "./offerKeywords";

/**
 * An application sent outside the app, already at its final stage (e.g. rejected): the status is set at creation,
 * dated on the day it was sent, so the response-time stats do not count it as a late answer.
 */
export async function addPastApplication(dto: PastApplicationDto, origin: string = MANUAL_ORIGIN): Promise<{ application: Application; offerId: number | null }> {
    // a real application: it belongs in the market stats like the offers tailored in the editor
    const keywords = await offerKeywords(dto?.description);
    const application = JobApplicationManager.getInstance().addPastApplication(dto, keywords, new Date(), origin);
    // made for an offer of the Opportunities queue: it leaves the queue
    try {
        const offer = getDiscoveryManager().findOfferFor({ url: dto.url, company: dto.company, title: dto.title });
        if (offer) {
            getDiscoveryManager().markApplied(offer.id, application.id);
            return { application, offerId: offer.id };
        }
    } catch (error) {
        console.warn("[applications] Could not link the offer:", error);
    }
    return { application, offerId: null };
}

/** An application sent outside the editor (seen by the extension, or told to Claude), linked to its queue offer. */
export async function recordSentApplication(dto: BrowserApplicationDto, source: RecordSource): Promise<LinkedApplicationResult> {
    const language = await profileLanguage();
    return recordApplicationFromBrowser(JobApplicationManager.getInstance(), getDiscoveryManager(), dto, () => offerKeywordsIn(dto.description, language), new Date(), source);
}

/** The dashboard refreshes and says what came in. */
export function announceApplicationsChanged(event: ApplicationsChangedEvent): void {
    broadcast("applications:changed", event);
}
