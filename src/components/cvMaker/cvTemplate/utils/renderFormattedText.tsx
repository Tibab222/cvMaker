import type { ReactNode } from "react";

export function renderFormattedText(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const boldPattern = /\*\*([\s\S]+?)\*\*/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    parts.push(
      <strong key={`bold-${match.index}`} className="font-bold">
        {match[1]}
      </strong>,
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}