import path from "node:path";
import { runKubernetesDeploy, type KubernetesDeployConfig } from "@elyspio/kubernetes-deploy";

const rootDir = path.resolve(import.meta.dirname, "..", "..");
const dryRun = process.argv.includes("--dry-run");

const config: KubernetesDeployConfig = {
	cacheFile: path.join(import.meta.dirname, "cache", ".build-counter"),
	chartDir: "P:\\own\\common\\keycloak\\kubernetes\\apps\\clos-verde-app",
	composeDir: path.join(rootDir, "Deployment", "build", "docker"),
	deployScript: "deploy.ps1",
};

runKubernetesDeploy(config, { dryRun });
