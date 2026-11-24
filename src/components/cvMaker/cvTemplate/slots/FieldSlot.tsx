import type { ReactNode } from "react";
import { useCVSelection } from "../../provider/hook";
import { TemplateInput } from "../templateFields/TemplateInput";
import { TemplateTextArea } from "../templateFields/TemplateTextArea";
import { renderFormattedText } from "../utils/renderFormattedText";
import { splitLines, type SlotSpec } from "@/cvm/engine";

type FieldSpec = Extract<SlotSpec, { kind: "field" }>;

/** Same markup as the static rendering (engine.staticFieldHtml), so the template CSS applies to both. */
const renderBullets = (value: string): ReactNode => (
  <ul className="cv-bullets">
    {splitLines(value).map((line, index) => <li key={index}>{renderFormattedText(line)}</li>)}
  </ul>
);

const renderLines = (value: string): ReactNode =>
  splitLines(value).map((line, index) => (
    <span key={index}>{index > 0 && <br />}{renderFormattedText(line)}</span>
  ));

/** A field of a template ({{edit …}}): click to edit, with the AI rewrite placeholder while it is rewritten. */
export default function FieldSlot({ spec }: { spec: FieldSpec }) {
  const { isItemRewriting } = useCVSelection();
  const isLoading = isItemRewriting(spec.entityType, spec.id);
  const className = `cv-field ${spec.className ?? ""}`;

  if (!spec.multiline) {
    return (
      <TemplateInput
        entityType={spec.entityType}
        id={spec.id}
        field={spec.field}
        defaultValue={spec.defaultValue}
        placeholder={spec.placeholder}
        isLoading={isLoading}
        className={className}
        unstyled
      />
    );
  }

  return (
    <TemplateTextArea
      entityType={spec.entityType}
      id={spec.id}
      field={spec.field}
      defaultValue={spec.defaultValue}
      placeholder={spec.placeholder}
      isLoading={isLoading}
      className={className}
      unstyled
      renderValue={spec.display === "bullets" ? renderBullets : spec.display === "lines" ? renderLines : undefined}
    />
  );
}
