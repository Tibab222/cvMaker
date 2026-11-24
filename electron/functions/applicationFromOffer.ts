import { ApplicationChannel, type BrowserApplicationDto, type BrowserApplicationResult } from "../../shared/jobApplications.type";
import { JobSourceKind, type DiscoveredJob } from "../../shared/discovery.types";
import { BROWSER_SOURCE, type JobApplicationManager, type RecordSource } from "../services/jobApplications/jobApplicationManager";
import type { DiscoveryManager } from "../services/discovery/DiscoveryManager";

/** A description this short is a page heading, not the offer: the queue's full text is better. */
const SHORT_DESCRIPTION = 400;

/** How the user found an offer of the queue: a job board search, or the company's own board. */
function channelOf(offer: DiscoveredJob): ApplicationChannel | null {
    if (offer.source_kind === JobSourceKind.ADZUNA) return ApplicationChannel.JOB_BOARD;
    if (offer.source_kind) return ApplicationChannel.COMPANY_SITE;
    return null;
}

export interface LinkedApplicationResult extends BrowserApplicationResult {
    /** The offer of the Opportunities queue it was made for, now marked applied. */
    offer: { id: number; title: string; company: string } | null;
}

/**
 * Records an application sent in the browser, linked to the offer of the Opportunities queue it was made for when
 * there is one: that offer leaves the queues (Applied), and the application takes what the queue already knows
 * (the full offer text, its keywords, salary, where it was found) instead of reading the offer again.
 * @param keywords Reads the keywords of the offer text; only called when no queue offer gives them.
 */
export function recordApplicationFromBrowser(
    jobs: JobApplicationManager,
    discovery: DiscoveryManager | null,
    dto: BrowserApplicationDto,
    keywords: () => string[],
    now: Date = new Date(),
    source: RecordSource = BROWSER_SOURCE,
): LinkedApplicationResult {
    let offer: DiscoveredJob | null = null;
    try {
        offer = discovery?.findOfferFor(dto) ?? null;
    } catch (error) {
        // the queue is a bonus: the application is recorded anyway
        console.warn("[applications] Could not look for the offer in the queue:", error);
    }
    if (!offer) return { ...jobs.recordBrowserApplication(dto, keywords, now, undefined, source), offer: null };

    const pageText = dto.description?.trim() ?? "";
    const enriched: BrowserApplicationDto = {
        ...dto,
        description: pageText.length >= SHORT_DESCRIPTION || !offer.description ? pageText : offer.description,
        salary: dto.salary?.trim() || offer.salary || "",
        channel: dto.channel ?? channelOf(offer),
    };
    const analyzed = [...offer.matched_keywords, ...offer.missing_keywords];
    const result = jobs.recordBrowserApplication(enriched, analyzed.length ? () => analyzed : keywords, now, offer.url, source);
    discovery!.markApplied(offer.id, result.application.id);
    return { ...result, offer: { id: offer.id, title: offer.title, company: offer.company } };
}
