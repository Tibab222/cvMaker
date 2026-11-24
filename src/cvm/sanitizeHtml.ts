import DOMPurify from "dompurify";
import { sanitizeCss } from "./css";

/**
 * Cleans the HTML a template produced. Imported templates are untrusted: no script, no form, no frame, and no
 * resource fetched from outside (images and fonts must be embedded as data: URLs).
 */
const purifier = DOMPurify(window);

const SAFE_DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|svg\+xml)[;,]/i;
const FETCHING_ATTRIBUTES = new Set(["src", "srcset", "poster", "background", "xlink:href", "data"]);

purifier.addHook("uponSanitizeAttribute", (node, data) => {
    const name = data.attrName.toLowerCase();
    // <a href> is a link, nothing is fetched; any other href (svg <use>, <image>) would fetch
    if (name === "href" && node.nodeName.toLowerCase() !== "a") {
        if (!data.attrValue.trim().startsWith("#")) data.keepAttr = false;
        return;
    }
    if (FETCHING_ATTRIBUTES.has(name) && !SAFE_DATA_IMAGE.test(data.attrValue.trim())) {
        data.keepAttr = false;
        return;
    }
    if (name === "style") {
        data.attrValue = sanitizeCss(data.attrValue);
        if (/[{}<>]/.test(data.attrValue)) data.keepAttr = false;
    }
});

export const sanitizeTemplateHtml = (html: string): string =>
    purifier.sanitize(html, {
        ADD_TAGS: ["cv-slot"],
        FORBID_TAGS: ["style", "script", "iframe", "frame", "object", "embed", "form", "input", "button", "textarea", "select", "option", "link", "meta", "base", "video", "audio", "source", "track", "portal"],
        FORBID_ATTR: ["srcset", "action", "formaction", "ping"],
        ALLOW_DATA_ATTR: true,
        ALLOW_UNKNOWN_PROTOCOLS: false,
    }) as string;
