import { spawnSync } from "child_process";
import fs from "fs";
import { redeployHelm, updateHelmValues } from "./utils/helm.utils.js";
import { computeConfig, dockerDir } from "./utils/config.utils.js";


const {  buildStatePath, buildDate, buildNumber, imageTag } = computeConfig();

console.log(`Building image with tag: ${imageTag}`);

function writeBuildState(filePath: string, buildDate: string, buildNumber: number) {
	fs.writeFileSync(filePath, `${buildDate}\n${buildNumber}\n`, "utf8");
}

writeBuildState(buildStatePath, buildDate, buildNumber);

const ret = spawnSync("docker", ["compose", "build", "--push"], {
	cwd: dockerDir,
	stdio: "inherit",
	env: {
		...process.env,
		IMAGE_TAG: imageTag,
	},
});

if (ret.error) {
	throw ret.error;
}

if (ret.status !== 0) {
	process.exit(ret.status ?? 1);
}

updateHelmValues(imageTag);

redeployHelm();
