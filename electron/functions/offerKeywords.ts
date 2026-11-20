import { Language } from '../../shared/profile.interface';
import { LocalkeywordsExtractor } from '../services/KeywordsExtractor/localKeywordsExtract';
import { ProfileService } from '../services/ProfileService';
import { detectLanguage } from '../services/vault/VaultManager';

/** Language of the open profile, for texts too short to tell their own. */
export async function profileLanguage(): Promise<Language> {
    return (await ProfileService.getInstance().getCurrentProfile())?.profile.language ?? Language.ENGLISH;
}

/**
 * Terms of an offer the user applied to. They feed the market stats like the offers tailored in the editor:
 * the extractor records them in the keyword affinity, so call it once per new application only.
 */
export function offerKeywordsIn(description: string | undefined | null, fallback: Language): string[] {
    const text = typeof description === 'string' ? description.trim() : '';
    if (!text) return [];
    return LocalkeywordsExtractor.extractKeywords(text, detectLanguage(text) ?? fallback).slice(0, 12);
}

export async function offerKeywords(description: string | undefined | null): Promise<string[]> {
    const text = typeof description === 'string' ? description.trim() : '';
    return text ? offerKeywordsIn(text, await profileLanguage()) : [];
}
