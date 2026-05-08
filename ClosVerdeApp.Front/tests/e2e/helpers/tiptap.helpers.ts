import { expect, type Locator, type Page } from "@playwright/test";

/** Returns the contenteditable region of a Tiptap composer. */
export function tiptapEditable(page: Page, composerTestId = "message-composer"): Locator {
	return page.getByTestId(composerTestId).locator(".ProseMirror");
}

/**
 * Clears the editor and types `text`. Uses `pressSequentially` because `Locator.type`
 * is deprecated and unreliable against ProseMirror's contenteditable in newer Playwright.
 */
export async function typeInComposer(page: Page, text: string, composerTestId = "message-composer") {
	const editor = tiptapEditable(page, composerTestId);
	await editor.click();
	// Select-all + delete to clear any existing content (no-op on empty editor).
	await page.keyboard.press("ControlOrMeta+A");
	await page.keyboard.press("Delete");
	await editor.pressSequentially(text);
	// Sanity assertion: the editable now contains the typed text.
	await expect(editor).toContainText(text);
}

export async function expectComposerVisible(page: Page, composerTestId = "message-composer") {
	await expect(page.getByTestId(composerTestId)).toBeVisible();
	await expect(tiptapEditable(page, composerTestId)).toBeVisible();
}

/** Waits until the composer's submit button is enabled (i.e. editor is non-empty and not submitting). */
export async function waitForComposerReady(page: Page) {
	await expect(page.getByTestId("message-composer-submit")).toBeEnabled();
}
