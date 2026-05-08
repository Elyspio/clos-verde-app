import { expect, type Page } from "@playwright/test";

export async function fillPickerField(page: Page, label: string, value: string) {
	const field = page.getByRole("group", { name: label }).first();
	const hiddenInput = field.locator('input[aria-hidden="true"]').first();

	await field.click();
	await page.keyboard.press("Control+A");
	await page.keyboard.type(value);
	await page.keyboard.press("Tab");

	await expect(hiddenInput).toHaveValue(value);
}
