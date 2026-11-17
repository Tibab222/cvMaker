/**
 * Chrome only: open the side panel when the toolbar button is clicked (Firefox uses sidebar_action instead).
 * The sidePanel API is not in webextension-polyfill, hence the direct, guarded access.
 */
interface ChromeSidePanel {
  setPanelBehavior?: (options: { openPanelOnActionClick: boolean }) => Promise<void>;
}

const sidePanel = (globalThis as { chrome?: { sidePanel?: ChromeSidePanel } }).chrome?.sidePanel;

sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch((error: unknown) => {
  console.warn('[CVMaker] Could not set the side panel behavior', error);
});
