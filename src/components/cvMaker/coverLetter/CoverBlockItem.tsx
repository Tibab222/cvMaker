import { useEffect, useRef, useState } from "react";
import type { CoverLetterBlock } from "@shared/CoverLetter.types";
import useCoverLetterContext from "../CoverLetterProvider/hook";

interface Props {
  block: CoverLetterBlock;
  className?: string;
  placeholder?: string;
}

/**
 * Renders an individual paragraph block
 * Supports inline click-to-edit when block.isEditable is true
 */
export default function CoverLetterBlockItem({
  block,
  className = "",
  placeholder = "Click to add content...",
}: Props) {
  const { setCoverLetter } = useCoverLetterContext();
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(block.content ?? "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saveLocal = () => setTempValue(block.content ?? "");
    saveLocal();
  }, [block.content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.focus();
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    setCoverLetter((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === block.id ? { ...b, content: tempValue } : b
        ),
      };
    });
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTempValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  if (block.isEditable && isEditing) {
    return (
      <textarea
        ref={textareaRef}
        value={tempValue}
        onChange={handleTextareaChange}
        onBlur={handleBlur}
        rows={2}
        className={`w-full bg-amber-50/80 border border-amber-400 rounded p-1.5 outline-none text-sm leading-relaxed text-slate-800 resize-none font-sans print:hidden ${className}`}
      />
    );
  }

  return (
    <p
      onClick={() => block.isEditable && setIsEditing(true)}
      title={block.isEditable ? "Click to edit" : undefined}
      className={`text-sm leading-relaxed text-slate-800 whitespace-pre-line font-sans indent-6 ${
        block.isEditable
          ? "cursor-pointer hover:bg-slate-100/80 rounded px-1 -mx-1 transition-colors print:hover:bg-transparent"
          : ""
      } ${className}`}
    >
      {block.content || (
        <span className="italic opacity-40">{placeholder}</span>
      )}
    </p>
  );
}