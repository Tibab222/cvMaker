import type { CSSProperties } from "react";
import { PAGE_SIZES_MM, type CvmTemplate } from "@shared/cvm/format";

/** The CSS @scope root of a template: its styles only apply inside the element carrying its id. */
export const scopeSelector = (template: CvmTemplate) => `[data-cvm="${template.meta.id}"]`;

/** Page box of a template on screen: size, margins (as padding) and the template variables. */
export const pageStyle = (template: CvmTemplate): CSSProperties => {
    const size = PAGE_SIZES_MM[template.meta.page.size];
    const vars = Object.fromEntries(Object.entries(template.meta.vars ?? {}).map(([key, value]) => [`--${key}`, value]));
    return {
        width: `${size.width}mm`,
        minHeight: `${size.height}mm`,
        padding: template.meta.page.margin,
        boxSizing: "border-box",
        background: "white",
        color: "black",
        position: "relative",
        ...vars,
    };
};
