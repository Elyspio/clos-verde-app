import "./index.scss";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { fr } from "date-fns/locale/fr";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "react-oidc-context";
import { BrowserRouter } from "react-router-dom";
import { TokenSync } from "./core/auth/TokenSync";
import { oidcConfig } from "./core/auth/oidc";
import { QueryProvider } from "@data/QueryProvider";
import { theme } from "./view/theme";
import { AppRouter } from "./view/router/AppRouter";

const browserBaseName = import.meta.env.BASE_URL === "/" ? "/" : import.meta.env.BASE_URL?.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
	<AuthProvider {...oidcConfig}>
		<TokenSync />
		<QueryProvider>
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
					<BrowserRouter basename={browserBaseName}>
						<AppRouter />
					</BrowserRouter>
				</LocalizationProvider>
			</ThemeProvider>
		</QueryProvider>
	</AuthProvider>,
);
