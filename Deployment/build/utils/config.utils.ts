import path from "path";
import { readBuildState } from "./docker.utils.js";
import fs from "fs";

const __dirname = import.meta.dirname;

const cacheDir = path.join(__dirname, "..", "cache", );
export const dockerDir = path.join(__dirname, "..", "docker");

export function computeConfig() {

	if(!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir, { recursive: true });
	}

	let cacheCounter = path.resolve(cacheDir, ".build-counter");


	const buildDate = formatDate(new Date());
	const previousState = readBuildState(cacheCounter);
	const buildNumber =
		previousState && previousState.buildDate === buildDate
			? previousState.buildNumber + 1
			: 1;
	const imageTag = `${buildDate}.${buildNumber}`;
	return {  buildStatePath: cacheCounter, buildDate, buildNumber, imageTag };
}

function formatDate(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");

	return `${year}.${month}.${day}`;
}
