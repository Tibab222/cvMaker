export interface BoldToggleResult {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

export function toggleBold(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): BoldToggleResult {
  // No selection: insert **** and put the cursor in the middle.
  if (selectionStart === selectionEnd) {
    const nextValue =
      value.slice(0, selectionStart) +
      "****" +
      value.slice(selectionEnd);

    return {
      value: nextValue,
      selectionStart: selectionStart + 2,
      selectionEnd: selectionStart + 2,
    };
  }

  const selectedText = value.slice(selectionStart, selectionEnd);

  // The selection itself contains **text**.
  if (selectedText.startsWith("**") && selectedText.endsWith("**")) {
    const unwrappedText = selectedText.slice(2, -2);

    return {
      value:
        value.slice(0, selectionStart) +
        unwrappedText +
        value.slice(selectionEnd),
      selectionStart,
      selectionEnd: selectionStart + unwrappedText.length,
    };
  }

  // The selected text is surrounded by ** markers.
  const hasOuterMarkers =
    value.slice(selectionStart - 2, selectionStart) === "**" &&
    value.slice(selectionEnd, selectionEnd + 2) === "**";

  if (hasOuterMarkers) {
    return {
      value:
        value.slice(0, selectionStart - 2) +
        selectedText +
        value.slice(selectionEnd + 2),
      selectionStart: selectionStart - 2,
      selectionEnd: selectionEnd - 2,
    };
  }

  // Otherwise, make the selected text bold.
  return {
    value:
      value.slice(0, selectionStart) +
      `**${selectedText}**` +
      value.slice(selectionEnd),
    selectionStart: selectionStart + 2,
    selectionEnd: selectionEnd + 2,
  };
}