import { Alert, Button, Stack } from "@mui/material";
import { useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { useNavigate } from "react-router-dom";
import { AuthSplitLayout } from "./AuthSplitLayout";

export function LoginPage() {
	const auth = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (auth.isAuthenticated) void navigate("/calendrier", { replace: true });
	}, [auth.isAuthenticated, navigate]);

	const handleLogin = () => {
		void auth.signinRedirect();
	};

	return (
		<AuthSplitLayout title="Bienvenue." subtitle="Connectez-vous pour réserver le box invités.">
			<Stack spacing={3.5}>
				{auth.error && <Alert severity="error">{auth.error.message}</Alert>}
				<Button onClick={handleLogin} variant="contained" fullWidth disabled={auth.isLoading}>
					Se connecter
				</Button>
			</Stack>
		</AuthSplitLayout>
	);
}
