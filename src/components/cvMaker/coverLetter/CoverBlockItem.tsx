// import type { CoverLetterBlock } from "@shared/coverLetter.types";

import type { CoverLetterBlock } from "@shared/CoverLetter.types";

// this can be changed if necessary
interface Props {
  block: CoverLetterBlock;
}

/**
 * Renders an individual paragraph block
 * Support inline text editing when block.isEditable is true
 */
export default function CoverLetterBlockItem({ block }: Props) {
  return (
    <div className="my-2">
      {/* TODO: Render block.content.
          If block.isEditable is true, allow inline editing (using auto-resizing textarea).
      */}
      <p className="text-sm leading-relaxed text-slate-800">{block?.content}</p>
    </div>
  );
}