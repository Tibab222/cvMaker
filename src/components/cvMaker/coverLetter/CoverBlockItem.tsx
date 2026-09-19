import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CoverLetterBlock } from "@shared/CoverLetter.types";
import useCoverLetterContext from "../CoverLetterProvider/hook";

interface Props {
  block: CoverLetterBlock;
  className?: string;
  placeholder?: string;
  isLast?: boolean;
}

// edit controls must never reach the PDF: hidden-print is stripped on export, print:hidden covers window.print
const controlsClass =
  "hidden-print print:hidden opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10";

/**
 * Renders an individual paragraph block
 * Supports inline click-to-edit when block.isEditable is true,
 * plus hover controls to insert a paragraph around it or delete it
 */
export default function CoverLetterBlockItem({
  block,
  className = "",
  placeholder = "Click to add content...",
  isLast = false,
}: Props) {
  const { setCoverLetter, addBlock, deleteBlock } = useCoverLetterContext();
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

  // keep the textarea focused while a control is clicked, so the layout doesn't shift under the pointer
  const keepFocus = (e: React.MouseEvent) => e.preventDefault();

  const insertButton = (position: number, offset: string, label: string) => (
    <button
      type="button"
      onMouseDown={keepFocus}
      onClick={() => addBlock(position)}
      aria-label={label}
      title={label}
      className={`absolute left-1/2 -translate-x-1/2 ${offset} flex items-center justify-center h-4 w-4 rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm hover:text-slate-800 hover:border-slate-500 ${controlsClass}`}
    >
      <Plus className="h-3 w-3" />
    </button>
  );

  return (
    // an empty paragraph is only a placeholder, so it's left out of the exported letter
    <div
      className={`group relative ${
        block.content.trim() ? "" : "hidden-print print:hidden"
      }`}
    >
      {insertButton(block.position, "-top-2.5", "Insert a paragraph above")}

      {block.isEditable && isEditing ? (
        <textarea
          ref={textareaRef}
          value={tempValue}
          onChange={handleTextareaChange}
          onBlur={handleBlur}
          rows={2}
          className={`w-full bg-amber-50/80 border border-amber-400 rounded p-1.5 outline-none text-sm leading-relaxed text-slate-800 resize-none font-sans print:hidden ${className}`}
        />
      ) : (
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
      )}

      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => deleteBlock(block.id)}
        aria-label="Delete this paragraph"
        title="Delete this paragraph"
        className={`absolute -top-3 right-0 flex items-center justify-center h-5 w-5 rounded border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-red-600 ${controlsClass}`}
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {isLast && insertButton(block.position + 1, "-bottom-2.5", "Insert a paragraph below")}
    </div>
  );
}
