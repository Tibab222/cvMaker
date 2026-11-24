/** "Montréal" and "Montreal", "Ingénieur" and "ingenieur" are the same word. */
export const foldText = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-term search that also works for "c++", "c#" or "node.js" (\b does not), accent and case insensitive.
 * @param foldedHaystack text already passed through foldText: callers testing many terms fold it once
 */
export function containsTerm(foldedHaystack: string, term: string): boolean {
    const needle = foldText(term.trim());
    if (!needle) return false;
    return new RegExp(`(?<![a-z0-9])${escapeRegExp(needle)}(?![a-z0-9])`).test(foldedHaystack);
}

/**
 * Whole-word match, accent and case insensitive, plural allowed: "intern" does not hit "Internal Tools",
 * "developer" hits "Developers". Matching inside words would make short filter words reject good offers.
 * Hyphenated compounds are written three ways: "front-end", "front end" and "frontend" all match each other.
 */
export function mentions(haystack: string, term: string): boolean {
    const needle = foldText(term.trim());
    if (!needle) return false;
    const folded = foldText(haystack);
    const texts = [folded.replace(/-/g, " "), folded.replace(/-/g, "")];
    const needles = [...new Set([needle.replace(/-/g, " "), needle.replace(/-/g, "")])];
    return needles.some((variant) => {
        const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(variant)}(?:s|es)?(?![a-z0-9])`);
        return texts.some((text) => pattern.test(text));
    });
}
