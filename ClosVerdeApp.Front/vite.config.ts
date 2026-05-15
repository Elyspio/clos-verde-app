import { getDefaultConfig } from "@elyspio/vite-eslint-config";
import * as path from "path";
import { defineConfig } from "vite-plus";

const __dirname = import.meta.dirname;
const base = getDefaultConfig({ basePath: __dirname });

// `getDefaultConfig` hard-codes its own list of path aliases (see the bundled tsconfig in
// @elyspio/vite-eslint-config) and does NOT read the project's tsconfig.json. Aliases we add
// to tsconfig.json for tsc must be mirrored here so Vite can resolve them at dev/build time.
//
// `base.resolve?.alias` is typed as `AliasOptions = Alias[] | Record<string, string>`, but
// the base config always returns the object form (see convertPathToAlias). Cast to satisfy
// the spread without a no-misused-spread warning.
const projectAliases: Record<string, string> = {
	"@data": path.resolve(__dirname, "./src/core/data"),
};
const baseAliases = (base.resolve?.alias ?? {}) as Record<string, string>;

// `getDefaultConfig` does not set any `build` options today, so we own this section entirely.
// If that ever changes, surface the conflict explicitly rather than spread-merge silently.
export default defineConfig({
	...base,
	resolve: {
		...base.resolve,
		alias: {
			...baseAliases,
			...projectAliases,
		},
	},
	build: {
		chunkSizeWarningLimit: 700,
		rolldownOptions: {
			output: {
				// Group heavy vendors into stable chunks so they cache independently of app code,
				// and so route-lazy pages don't drag duplicates into every chunk.
				manualChunks(id: string) {
					if (!id.includes("node_modules")) return;
					if (id.includes("/@tiptap/") || id.includes("/prosemirror-") || id.includes("/tippy.js/")) return "editor";
					if (id.includes("/@microsoft/signalr/")) return "signalr";
					if (id.includes("/@mui/x-date-pickers/")) return "date-pickers";
					if (id.includes("/date-fns/")) return "date-fns";
					if (id.includes("/@mui/icons-material/")) return "mui-icons";
					if (id.includes("/@mui/material/") || id.includes("/@mui/system/") || id.includes("/@emotion/")) return "mui";
					if (id.includes("/@tanstack/")) return "tanstack";
					if (id.includes("/motion/") || id.includes("/framer-motion/")) return "motion";
					if (id.includes("/oidc-client-ts/") || id.includes("/react-oidc-context/")) return "auth";
					if (id.includes("/react-router") || id.includes("/react-dom/") || id.includes("/react/")) return "react";
				},
			},
		},
	},
});
