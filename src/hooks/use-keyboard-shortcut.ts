import { useEffect } from "react";

/** Returns "⌘" on macOS and "Ctrl" everywhere else, for shortcut hints in the UI. */
export function getModifierKeyLabel(): string {
    if (typeof navigator === "undefined") return "Ctrl";
    return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl";
}

interface UseKeyboardShortcutOptions {
    /** Require Ctrl (Windows/Linux) or Cmd (macOS) to be held. Defaults to true. */
    ctrlOrCmd?: boolean;
    /** Set to false to temporarily disable the shortcut without unmounting the hook. */
    enabled?: boolean;
}

/**
 * Registers a global keydown shortcut for as long as the calling component is mounted.
 * Used to give each profile panel its own "add new entry" shortcut (e.g. Ctrl/Cmd+N)
 * without duplicating keydown-listener boilerplate in every panel.
 */
export function useKeyboardShortcut(
    key: string,
    callback: () => void,
    options: UseKeyboardShortcutOptions = {}
) {
    const { ctrlOrCmd = true, enabled = true } = options;

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            const modifierSatisfied = ctrlOrCmd ? event.ctrlKey || event.metaKey : true;
            if (modifierSatisfied && event.key.toLowerCase() === key.toLowerCase()) {
                event.preventDefault();
                callback();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [key, callback, ctrlOrCmd, enabled]);
}
