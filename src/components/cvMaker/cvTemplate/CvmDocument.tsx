import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PAGE_SIZES_MM, parseMarginMm, type CvmTemplate } from "@shared/cvm/format";
import { compileCvm, type RenderMode } from "@/cvm/engine";
import { scopeCss } from "@/cvm/css";
import { pageStyle, scopeSelector } from "@/cvm/page";
import FieldSlot from "./slots/FieldSlot";
import SummarySlot from "./slots/SummarySlot";

const PX_PER_MM = 96 / 25.4;

/**
 * Rules every template gets. cv-slot is the empty marker an editor is mounted into: display: contents makes
 * the editor behave as if it were written in the template. --cv-push is set by the preview to show a forced
 * page break where the PDF will put it; it only exists on screen.
 */
const ENGINE_CSS = `
.cvm-root { text-align: left; font-size: 16px; line-height: 1.5; font-weight: 400; font-style: normal; letter-spacing: normal; text-transform: none; white-space: normal; }
cv-slot { display: contents; }
/* 1px tall (cancelled by the negative margin) so that margins cannot collapse through it */
.cv-page-break { break-before: page; page-break-before: always; height: 1px; margin-bottom: -1px; }
@media screen { [data-cv-push] { margin-top: var(--cv-push) !important; } }
@media print { [data-cv-push] { --cv-push: 0; } }
`;

/** Compiled templates are cached by source: switching back and forth between templates costs nothing. */
const compiledCache = new Map<string, ReturnType<typeof compileCvm>>();
const getCompiled = (template: CvmTemplate) => {
    let compiled = compiledCache.get(template.source);
    if (!compiled) {
        compiled = compileCvm(template);
        compiledCache.set(template.source, compiled);
    }
    return compiled;
};

interface Props {
    template: CvmTemplate;
    context: Record<string, unknown>;
    lang: string;
    /** "static": plain HTML (thumbnails); "interactive": the resume being edited, with its editors. */
    mode?: RenderMode;
    /** Set on the edited resume only: the PDF export reads the element with this id. */
    domId?: string;
}

export default function CvmDocument({ template, context, lang, mode = "interactive", domId }: Props) {
    const rootRef = useRef<HTMLDivElement>(null);
    const output = useMemo(() => getCompiled(template).render(context, mode), [template, context, mode]);
    const css = useMemo(() => scopeCss(template.css, scopeSelector(template)), [template]);
    // React compares this prop by identity: a new object on each render would re-write the HTML and detach
    // the editors mounted into it
    const innerHtml = useMemo(() => ({ __html: output.html }), [output.html]);
    // the slot elements of the HTML currently in the DOM, kept with that HTML so they never get mixed up
    const [mounted, setMounted] = useState<{ html: string; targets: Element[] }>({ html: "", targets: [] });
    const [pages, setPages] = useState(1);

    const size = PAGE_SIZES_MM[template.meta.page.size];
    const margin = parseMarginMm(template.meta.page.margin);
    const contentHeightPx = (size.height - margin.top - margin.bottom) * PX_PER_MM;
    const marginTopPx = margin.top * PX_PER_MM;

    useLayoutEffect(() => {
        if (mode !== "interactive" || !rootRef.current) return;
        const targets: Element[] = [];
        rootRef.current.querySelectorAll("cv-slot[data-slot]").forEach((element) => {
            targets[Number(element.getAttribute("data-slot"))] = element;
        });
        setMounted({ html: output.html, targets });
        // keyed on the prop object, not the string: whenever React writes the HTML (hot reload included),
        // the markers are new elements and must be collected again
    }, [innerHtml, output.html, mode]);

    /**
     * Shows the pagination the PDF will have: elements with `break-before: page` are pushed to the next page
     * start, and the page count drives the page separators. Writes only when something changed, so the
     * ResizeObserver that calls it settles.
     */
    const paginate = useCallback(() => {
        const root = rootRef.current;
        if (!root || mode !== "interactive") return;
        const rootRect = root.getBoundingClientRect();
        const rootTop = rootRect.top;
        // the editor may show the page zoomed (a transform): screen distances are divided back to page pixels
        const scale = root.offsetWidth > 0 ? rootRect.width / root.offsetWidth || 1 : 1;
        const breaks = Array.from(root.querySelectorAll<HTMLElement>("*")).filter((element) => {
            const style = getComputedStyle(element);
            return style.breakBefore === "page" || style.pageBreakBefore === "always";
        });
        const setPush = (element: HTMLElement, push: number) => {
            if (push > 0.5) {
                element.dataset.cvPush = "";
                element.style.setProperty("--cv-push", `${push}px`);
            } else {
                delete element.dataset.cvPush;
                element.style.removeProperty("--cv-push");
            }
        };
        // content pixels from the top of page 1 to the element's border box
        const topOf = (element: HTMLElement) => (element.getBoundingClientRect().top - rootTop) / scale - marginTopPx;
        for (const element of breaks) {
            // measured from scratch each time (push removed), so the result is the same on every call: the
            // final layout does not change and the ResizeObserver does not fire again
            setPush(element, 0);
            const naturalTop = topOf(element);
            const offsetInPage = ((naturalTop % contentHeightPx) + contentHeightPx) % contentHeightPx;
            if (naturalTop <= 0.5 || offsetInPage < 0.5 || contentHeightPx - offsetInPage < 0.5) continue;
            const target = naturalTop + contentHeightPx - offsetInPage;
            const naturalMargin = parseFloat(getComputedStyle(element).marginTop) || 0;
            let push = naturalMargin + target - naturalTop;
            setPush(element, push);
            // margins collapsing with the previous sibling make the first guess slightly off: correct it once
            push += target - topOf(element);
            setPush(element, push);
        }
        let bottom = 0;
        for (const child of Array.from(root.children)) {
            const rect = child.getBoundingClientRect();
            bottom = Math.max(bottom, (rect.bottom - rootTop) / scale + (parseFloat(getComputedStyle(child).marginBottom) || 0));
        }
        const count = Math.max(1, Math.ceil((bottom - marginTopPx - 1) / contentHeightPx));
        setPages((previous) => (previous === count ? previous : count));
    }, [mode, contentHeightPx, marginTopPx]);

    useLayoutEffect(() => {
        const root = rootRef.current;
        if (!root || mode !== "interactive") return;
        paginate();
        const observer = new ResizeObserver(() => paginate());
        observer.observe(root);
        Array.from(root.children).forEach((child) => observer.observe(child));
        return () => observer.disconnect();
    }, [paginate, mounted, mode]);

    // links are for the PDF: in the app, a click must not navigate the window away
    const preventNavigation = (event: React.MouseEvent) => {
        if ((event.target as Element).closest("a")) event.preventDefault();
    };

    const rootStyle = pageStyle(template);
    if (mode === "interactive" && pages > 1) {
        // the last page is drawn full, like the sheet it will be printed on
        rootStyle.minHeight = `${(margin.top + margin.bottom) * PX_PER_MM + pages * contentHeightPx}px`;
    }

    if (output.error) {
        return (
            <div style={pageStyle(template)} className="font-mono text-xs text-red-700">
                <p className="font-sans font-bold text-sm mb-2">The template "{template.meta.name}" could not be rendered</p>
                <pre className="whitespace-pre-wrap">{output.error}</pre>
            </div>
        );
    }

    return (
        <div className="relative">
            <style>{ENGINE_CSS}</style>
            <style>{css}</style>
            <div
                ref={rootRef}
                id={domId}
                data-cvm={template.meta.id}
                data-lang={lang}
                className="cvm-root"
                style={rootStyle}
                onClickCapture={preventNavigation}
                dangerouslySetInnerHTML={innerHtml}
            />
            {mode === "interactive" && mounted.html === output.html && mounted.targets.map((target, index) => {
                const spec = output.slots[index];
                if (!target || !spec) return null;
                return createPortal(
                    spec.kind === "summary"
                        ? <SummarySlot display={spec.display} lang={lang} className={spec.className} />
                        : <FieldSlot spec={spec} />,
                    target,
                    `${index}`,
                );
            })}
            {mode === "interactive" && Array.from({ length: pages - 1 }, (_, index) => (
                <div
                    key={index}
                    className="hidden-print print:hidden pointer-events-none absolute left-0 w-full border-t border-dashed border-red-400"
                    style={{ top: marginTopPx + (index + 1) * contentHeightPx }}
                >
                    <span className="absolute right-1 -top-4 text-[9px] italic text-red-500/70">Page {index + 2}</span>
                </div>
            ))}
        </div>
    );
}
