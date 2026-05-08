import fs from "fs";

export function readBuildState(filePath: string) {
	if (!fs.existsSync(filePath)) {
		return null;
	}

	const [buildDate, buildNumberText] = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/) as [string, string];

	const buildNumber = Number.parseInt(buildNumberText, 10);

	if (!buildDate || !Number.isInteger(buildNumber) || buildNumber < 1) {
		throw new Error(
			`Invalid build counter file: ${filePath}. Expected two lines: date and build number.`,
		);
	}

	return { buildDate, buildNumber };
}