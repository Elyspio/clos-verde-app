import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LoginIcon from "@mui/icons-material/Login";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { useAuth } from "react-oidc-context";
import { clearStoredAuthSession } from "@/core/auth/session";
import { AuthSplitLayout } from "./AuthSplitLayout";

export function TokenErrorPage() {
	const auth = useAuth();
	const authRef = useRef(auth);
	authRef.current = auth;

	// `auth` est une nouvelle référence à chaque changement d'état OIDC. Le dépendre ici
	// déclenche une boucle infinie pendant `signinRedirect` (cf. handleLogin).
	useEffect(() => {
		clearStoredAuthSession();
		void authRef.current.removeUser().catch(() => undefined);
	}, []);

	const handleLogin = () => {
		clearStoredAuthSession();
		void authRef.current.removeUser().finally(() => {
			void authRef.current.signinRedirect();
		});
	};

	return (
		<AuthSplitLayout title="Session expirée." subtitle="Votre authentification n'a pas pu être renouvelée automatiquement.">
			<Stack spacing={3.5}>
				<Alert icon={<ErrorOutlineIcon fontSize="inherit" />} severity="warning">
					La session locale a été fermée
				</Alert>
				<Box
					sx={{
						border: "1px solid var(--line)",
						borderRadius: 2,
						bgcolor: "var(--surface)",
						p: 2.5,
					}}
				>
					<Typography variant="h5" mb={1}>
						Connexion requise
					</Typography>
					<Typography color="text.secondary">Reconnectez-vous pour reprendre votre navigation dans le calendrier et les réservations.</Typography>
				</Box>
				<Button startIcon={<LoginIcon />} onClick={handleLogin} variant="contained" fullWidth disabled={auth.activeNavigator !== undefined || auth.isLoading}>
					Se reconnecter
				</Button>
			</Stack>
		</AuthSplitLayout>
	);
}
