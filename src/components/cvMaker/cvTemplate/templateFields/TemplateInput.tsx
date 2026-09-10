import React, { useState, useRef, useEffect } from 'react';
import { useCVSelection } from "../../provider/hook";
import { TemplateSkeleton } from './TemplateSkeleton';
import type { EntityType } from '@shared/utils';
import { toggleBold } from "../utils/toggleBold";
import { renderFormattedText } from "../utils/renderFormattedText";

interface FieldProps {
  entityType: EntityType;
  id: string;
  field: string;
  defaultValue: string;
  className?: string;
  placeholder?: string;
  isLoading?: boolean;
}

export function TemplateInput({
  entityType,
  id,
  field,
  defaultValue,
  className = '',
  placeholder = '...',
  isLoading = false
}: FieldProps) {
  const { getCustomField, updateCustomField } = useCVSelection();
  const value = getCustomField(entityType, id, field, defaultValue);
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateTempValue = () => setTempValue(value);
    updateTempValue();
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    updateCustomField(entityType, id, field, tempValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "b"
    ) {
      e.preventDefault();
      e.stopPropagation();

      const selectionStart = e.currentTarget.selectionStart ?? 0;
      const selectionEnd =
        e.currentTarget.selectionEnd ?? selectionStart;

      const result = toggleBold(
        tempValue,
        selectionStart,
        selectionEnd,
      );

      setTempValue(result.value);

      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.setSelectionRange(
          result.selectionStart,
          result.selectionEnd,
        );
      });

      return;
    }

    if (e.key === "Enter") {
      handleBlur();
    }

    if (e.key === "Escape") {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isLoading) {
    return (
      <span className={`bg-amber-50/80 w-full border-b border-amber-400 px-0.5 animate-in fade-in duration-100 print:hidden ${className}`}>
        <TemplateSkeleton lines={1} className={className} />
      </span>
    );
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`bg-amber-50/80 w-full border-b border-amber-400 outline-none px-0.5 animate-in fade-in duration-100 print:hidden ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      title="Cliquer pour modifier"
      className={`cursor-text hover:bg-slate-100 rounded px-0.5 transition-colors print:hover:bg-transparent ${className}`}
    >
      {value
        ? renderFormattedText(value)
        : <span className="italic opacity-40">{placeholder}</span>
      }
    </span>
  );
}