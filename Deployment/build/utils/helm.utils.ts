import path from "path";
import { parse, stringify } from "yaml";
import fs from "fs";
import { spawnSync } from "child_process";

export const chartDir = path.resolve("P:\\own\\common\\keycloak\\kubernetes\\apps\\clos-verde-app");
export const deployScript = path.join(chartDir, "deploy.ps1");

export function updateHelmValues(imageTag: string) {
	const valueYamlFilepath = path.join(chartDir, "values.yaml");
	const valuesYaml = parse(fs.readFileSync(valueYamlFilepath, "utf8")) as {
		image: {
			tag: string
		}
	};
	valuesYaml.image.tag = imageTag;

	fs.writeFileSync(valueYamlFilepath, stringify(valuesYaml), "utf8");

	console.log(`Deploying chart with image tag: ${imageTag}`);
}

export function redeployHelm() {
	const deployRet = spawnSync("pwsh", [deployScript], {
		cwd: chartDir,
		stdio: "inherit",
	});

	if (deployRet.error) {
		throw deployRet.error;
	}

	if (deployRet.status !== 0) {
		process.exit(deployRet.status ?? 1);
	}
}