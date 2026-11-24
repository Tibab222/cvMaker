/**
 * Template CSS handling: imported templates are untrusted, so their CSS may not load anything from outside
 * (tracking pixels, remote fonts) nor break out of its <style> element, and it must only style the resume.
 */

/** Only inline data is allowed: images and fonts embedded in the file. */
const SAFE_DATA_URL = /^data:(image\/(png|jpe?g|gif|webp|svg\+xml)|font\/[\w.+-]+|application\/(font-[\w.+-]+|x-font-[\w.+-]+|octet-stream))[;,]/i;

const isSafeUrl = (value: string) => SAFE_DATA_URL.test(value.trim());

/** Removes every way CSS can fetch a resource or run code, and anything that could close the <style> tag. */
export const sanitizeCss = (css: string): string => {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/<\/?\s*style/gi, "")
        .replace(/<!--|-->/g, "")
        .replace(/@import[^;]*;?/gi, "")
        .replace(/@charset[^;]*;?/gi, "")
        .replace(/@namespace[^;]*;?/gi, "")
        .replace(/url\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi, (match, _quote, value: string) => (isSafeUrl(value) ? match : "none"))
        // image-set("x.png") fetches without url()
        .replace(/(?:-webkit-)?image-set\(([^()]|\([^()]*\))*\)/gi, (match) => (/["']\s*(?!data:)[^"']+["']/i.test(match) ? "none" : match))
        .replace(/expression\s*\(/gi, "(")
        .replace(/javascript:/gi, "")
        .replace(/-moz-binding|behavior\s*:/gi, "");
};

type CssNode =
    | { type: "rule"; prelude: string; body: string }
    | { type: "statement"; text: string };

/** Splits CSS into its top-level rules, respecting strings and nested braces. */
const splitTopLevel = (css: string): CssNode[] => {
    const nodes: CssNode[] = [];
    let i = 0;
    let start = 0;
    while (i < css.length) {
        const char = css[i];
        if (char === '"' || char === "'") {
            const end = css.indexOf(char, i + 1);
            i = end === -1 ? css.length : end + 1;
            continue;
        }
        if (char === ";") {
            const text = css.slice(start, i + 1).trim();
            if (text) nodes.push({ type: "statement", text });
            start = ++i;
            continue;
        }
        if (char === "{") {
            const prelude = css.slice(start, i).trim();
            let depth = 1;
            let j = i + 1;
            while (j < css.length && depth > 0) {
                const c = css[j];
                if (c === '"' || c === "'") {
                    const end = css.indexOf(c, j + 1);
                    j = end === -1 ? css.length : end + 1;
                    continue;
                }
                if (c === "{") depth++;
                else if (c === "}") depth--;
                j++;
            }
            nodes.push({ type: "rule", prelude, body: css.slice(i + 1, j - 1) });
            start = i = j;
            continue;
        }
        i++;
    }
    const rest = css.slice(start).trim();
    if (rest) nodes.push({ type: "statement", text: rest });
    return nodes;
};

/** At-rules that cannot live inside @scope, or that are global by nature. */
const GLOBAL_AT_RULES = /^@(font-face|(-webkit-)?keyframes|property|counter-style|font-feature-values)\b/i;
/** At-rules whose body holds more rules. */
const GROUPING_AT_RULES = /^@(media|supports|container|layer|scope|starting-style)\b/i;

/** html/body/:root mean "the resume page" in a template: they become :scope. */
const rewriteSelector = (prelude: string) =>
    prelude.replace(/(^|[\s,>+~(])(?:html|body|:root)(?=$|[\s,.:#[>+~)])/gi, "$1:scope");

const rewriteRules = (css: string): string =>
    splitTopLevel(css)
        .map((node) => {
            if (node.type === "statement") return node.text;
            if (GROUPING_AT_RULES.test(node.prelude)) return `${node.prelude} {\n${rewriteRules(node.body)}\n}`;
            if (node.prelude.startsWith("@")) return `${node.prelude} {${node.body}}`;
            return `${rewriteSelector(node.prelude)} {${node.body}}`;
        })
        .join("\n");

/**
 * Wraps the template CSS in @scope so it only styles the resume root matching `scopeSelector`.
 * @font-face/@keyframes stay global (they are not allowed in @scope); @page is dropped: the page size and
 * margins come from the template meta.
 */
export const scopeCss = (css: string, scopeSelector: string): string => {
    const global: string[] = [];
    const scoped: string[] = [];
    for (const node of splitTopLevel(sanitizeCss(css))) {
        if (node.type === "statement") continue; // stray declarations at the top level mean nothing
        if (/^@page\b/i.test(node.prelude)) continue;
        if (GLOBAL_AT_RULES.test(node.prelude)) {
            global.push(`${node.prelude} {${node.body}}`);
            continue;
        }
        scoped.push(rewriteRules(`${node.prelude} {${node.body}}`));
    }
    return `${global.join("\n")}\n@scope (${scopeSelector}) {\n${scoped.join("\n")}\n}`;
};

/** Checks a single CSS value used in an inline style (template vars). */
export const isSafeCssValue = (value: string) => !/[;{}<>]|url\s*\(|expression\s*\(|@import/i.test(value);
