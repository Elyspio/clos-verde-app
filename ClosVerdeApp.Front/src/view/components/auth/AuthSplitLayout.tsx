import { Box, Container, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";

type AuthSplitLayoutProps = {
	title: string;
	subtitle: string;
	children: ReactNode;
};

export function AuthSplitLayout({ title, subtitle, children }: AuthSplitLayoutProps) {
	return (
		<Box minHeight="100vh" bgcolor="var(--app-bg)" sx={{ display: "flex", alignItems: "stretch" }}>
			<Container
				maxWidth={false}
				disableGutters
				sx={{
					minHeight: "100vh",
					display: "grid",
					gridTemplateColumns: { xs: "1fr", md: "minmax(420px, 48%) 1fr" },
				}}
			>
				<Box sx={{ px: { xs: 2.5, sm: 6, lg: 10 }, py: { xs: 5, md: 8 }, display: "flex", alignItems: "center" }}>
					<Box width="100%" maxWidth={480} mx="auto">
						<Stack direction="row" alignItems="center" spacing={1.2} mb={6}>
							<Box
								aria-hidden
								sx={{
									width: 38,
									height: 38,
									borderRadius: "14px",
									bgcolor: "var(--primary-blue)",
									color: "var(--surface)",
									display: "grid",
									placeItems: "center",
									fontWeight: 800,
								}}
							>
								B
							</Box>
							<Typography sx={{ fontWeight: 800, fontSize: 19 }}>Clos Verde</Typography>
						</Stack>
						<Typography variant="h1" mb={1.5}>
							{title}
						</Typography>
						<Typography variant="body1" color="text.secondary" mb={5}>
							{subtitle}
						</Typography>
						{children}
					</Box>
				</Box>
				<Box
					sx={{
						display: { xs: "none", md: "flex" },
						alignItems: "center",
						px: { md: 6, lg: 9 },
						py: 8,
						bgcolor: "var(--surface)",
						borderLeft: "1px solid var(--line)",
					}}
				>
					<Stack spacing={4} maxWidth={560}>
						<Box
							sx={{
								width: "100%",
								aspectRatio: "1.35",
								border: "1px solid var(--line)",
								borderRadius: "28px",
								bgcolor: "var(--app-bg)",
								p: 3,
								display: "grid",
								gridTemplateRows: "auto 1fr",
								gap: 2,
								overflow: "hidden",
							}}
						>
							<Stack direction="row" justifyContent="space-between" alignItems="center">
								<Typography sx={{ fontWeight: 800 }}>Mai 2026</Typography>
								<Typography sx={{ color: "var(--primary-blue)", fontWeight: 800 }}>3 créneaux</Typography>
							</Stack>
							<Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
								{Array.from({ length: 28 }).map((_, index) => (
									<Box
										key={index}
										sx={{
											minHeight: 42,
											borderRadius: "12px",
											bgcolor: index === 8 || index === 15 ? "var(--primary-blue)" : index === 20 ? "var(--mint-soft)" : "var(--surface)",
											border: "1px solid var(--line)",
										}}
									/>
								))}
							</Box>
						</Box>
						<Box>
							<Typography variant="h3" mb={1.5}>
								Une réservation claire, sans friction.
							</Typography>
							<Typography variant="body1" color="text.secondary">
								Un calendrier partagé propre, lisible et pensé pour les usages rapides des copropriétaires.
							</Typography>
						</Box>
					</Stack>
				</Box>
			</Container>
		</Box>
	);
}
