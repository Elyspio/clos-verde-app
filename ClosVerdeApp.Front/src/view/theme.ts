import { createTheme, type Theme } from "@mui/material/styles";

const tokens = {
	appBg: "#F7F9FC",
	surface: "#FFFFFF",
	surfaceSoft: "#F1F5F9",
	surfaceBlue: "#EFF6FF",
	ink: "#111827",
	inkSoft: "#4B5563",
	inkMute: "#8A94A6",
	line: "#E5E7EB",
	lineStrong: "#CBD5E1",
	primaryBlue: "#2563EB",
	primaryBlueDark: "#1D4ED8",
	primaryBlueSoft: "#DBEAFE",
	mint: "#10B981",
	mintSoft: "#D1FAE5",
	coral: "#F97316",
	coralSoft: "#FFEDD5",
	danger: "#DC2626",
	dangerSoft: "#FEE2E2",
	warning: "#D97706",
	warningSoft: "#FEF3C7",
};

const fontBody = `"Plus Jakarta Sans", "Manrope", "Segoe UI", system-ui, sans-serif`;
const fontMono = `"JetBrains Mono", "SFMono-Regular", Consolas, ui-monospace, monospace`;

export const theme: Theme = createTheme({
	shape: { borderRadius: 12 },
	palette: {
		mode: "light",
		primary: {
			main: tokens.primaryBlue,
			dark: tokens.primaryBlueDark,
			light: tokens.primaryBlueSoft,
			contrastText: tokens.surface,
		},
		secondary: {
			main: tokens.mint,
			contrastText: tokens.surface,
		},
		warning: {
			main: tokens.warning,
			contrastText: tokens.ink,
		},
		error: {
			main: tokens.danger,
			contrastText: tokens.surface,
		},
		background: {
			default: tokens.appBg,
			paper: tokens.surface,
		},
		text: {
			primary: tokens.ink,
			secondary: tokens.inkSoft,
			disabled: tokens.inkMute,
		},
		divider: tokens.line,
	},
	typography: {
		fontFamily: fontBody,
		htmlFontSize: 16,
		h1: {
			fontFamily: fontBody,
			fontWeight: 800,
			fontSize: "clamp(2rem, 4vw, 3.25rem)",
			letterSpacing: 0,
			lineHeight: 1.05,
		},
		h2: {
			fontFamily: fontBody,
			fontWeight: 800,
			fontSize: "clamp(1.7rem, 3vw, 2.5rem)",
			letterSpacing: 0,
			lineHeight: 1.1,
		},
		h3: {
			fontFamily: fontBody,
			fontWeight: 800,
			fontSize: "1.75rem",
			letterSpacing: 0,
			lineHeight: 1.15,
		},
		h4: {
			fontFamily: fontBody,
			fontWeight: 700,
			fontSize: "1.35rem",
			letterSpacing: 0,
			lineHeight: 1.2,
		},
		h5: {
			fontFamily: fontBody,
			fontWeight: 700,
			fontSize: "1.15rem",
			letterSpacing: 0,
			lineHeight: 1.25,
		},
		h6: {
			fontFamily: fontBody,
			fontWeight: 700,
			fontSize: "1rem",
			letterSpacing: 0,
		},
		subtitle1: {
			fontFamily: fontBody,
			fontWeight: 650,
			fontSize: "1rem",
			letterSpacing: 0,
			color: tokens.inkSoft,
		},
		subtitle2: {
			fontFamily: fontBody,
			fontWeight: 700,
			fontSize: "0.78rem",
			letterSpacing: 0,
			color: tokens.inkSoft,
		},
		body1: {
			fontFamily: fontBody,
			fontSize: "0.96rem",
			lineHeight: 1.55,
			letterSpacing: 0,
		},
		body2: {
			fontFamily: fontBody,
			fontSize: "0.86rem",
			lineHeight: 1.5,
			letterSpacing: 0,
			color: tokens.inkSoft,
		},
		button: {
			fontFamily: fontBody,
			fontWeight: 700,
			textTransform: "none",
			letterSpacing: 0,
			fontSize: "0.9rem",
		},
		caption: {
			fontFamily: fontBody,
			fontSize: "0.75rem",
			letterSpacing: 0,
			color: tokens.inkSoft,
		},
		overline: {
			fontFamily: fontBody,
			fontSize: "0.72rem",
			fontWeight: 800,
			letterSpacing: 0,
			textTransform: "none",
			color: tokens.inkSoft,
		},
	},
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				body: {
					backgroundColor: tokens.appBg,
				},
			},
		},
		MuiButton: {
			defaultProps: { disableElevation: true },
			styleOverrides: {
				root: {
					borderRadius: 12,
					padding: "12px 18px",
					fontWeight: 700,
					letterSpacing: 0,
					transition: "background-color 180ms ease, color 180ms ease, border-color 180ms ease, transform 180ms ease",
					"&:active": {
						transform: "translateY(1px)",
					},
				},
				containedPrimary: {
					backgroundColor: tokens.primaryBlue,
					color: tokens.surface,
					"&:hover": {
						backgroundColor: tokens.primaryBlueDark,
					},
				},
				outlined: {
					borderColor: tokens.lineStrong,
					color: tokens.ink,
					backgroundColor: tokens.surface,
					"&:hover": {
						borderColor: tokens.primaryBlue,
						color: tokens.primaryBlue,
						backgroundColor: tokens.surfaceBlue,
					},
				},
				text: {
					color: tokens.inkSoft,
					"&:hover": {
						backgroundColor: tokens.surfaceBlue,
						color: tokens.primaryBlue,
					},
				},
			},
		},
		MuiTextField: {
			defaultProps: { variant: "outlined" },
		},
		MuiOutlinedInput: {
			styleOverrides: {
				root: {
					borderRadius: 12,
					backgroundColor: tokens.surface,
					fontFamily: fontBody,
					"& .MuiOutlinedInput-notchedOutline": {
						borderColor: tokens.line,
					},
					"&:hover .MuiOutlinedInput-notchedOutline": {
						borderColor: tokens.lineStrong,
					},
					"&.Mui-focused .MuiOutlinedInput-notchedOutline": {
						borderColor: tokens.primaryBlue,
						borderWidth: 2,
					},
				},
				input: {
					padding: "13px 14px",
				},
			},
		},
		MuiInputLabel: {
			styleOverrides: {
				root: {
					fontFamily: fontBody,
					fontSize: "0.84rem",
					letterSpacing: 0,
					fontWeight: 650,
					color: tokens.inkSoft,
					"&.Mui-focused": {
						color: tokens.primaryBlue,
					},
				},
			},
		},
		MuiPaper: {
			defaultProps: { elevation: 0 },
			styleOverrides: {
				root: {
					backgroundImage: "none",
					backgroundColor: tokens.surface,
					borderRadius: 14,
				},
				outlined: {
					borderColor: tokens.line,
				},
			},
		},
		MuiDivider: {
			styleOverrides: {
				root: { borderColor: tokens.line },
			},
		},
		MuiDialog: {
			styleOverrides: {
				paper: {
					borderRadius: 18,
					border: `1px solid ${tokens.line}`,
					backgroundColor: tokens.surface,
				},
			},
		},
		MuiMenu: {
			styleOverrides: {
				paper: {
					border: `1px solid ${tokens.line}`,
					boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
				},
			},
		},
		MuiAlert: {
			styleOverrides: {
				root: {
					borderRadius: 12,
					padding: "12px 14px",
					alignItems: "center",
					fontWeight: 650,
				},
				standardWarning: {
					backgroundColor: tokens.warningSoft,
					color: tokens.ink,
					border: `1px solid ${tokens.warning}`,
				},
				standardError: {
					backgroundColor: tokens.dangerSoft,
					color: tokens.danger,
					border: `1px solid ${tokens.danger}`,
				},
				standardSuccess: {
					backgroundColor: tokens.mintSoft,
					color: "#047857",
					border: `1px solid ${tokens.mint}`,
				},
			},
		},
		MuiLink: {
			styleOverrides: {
				root: {
					color: tokens.primaryBlue,
					textDecorationColor: tokens.primaryBlueSoft,
					fontWeight: 700,
					"&:hover": {
						color: tokens.primaryBlueDark,
					},
				},
			},
		},
		MuiCheckbox: {
			styleOverrides: {
				root: {
					color: tokens.inkMute,
					"&.Mui-checked": {
						color: tokens.primaryBlue,
					},
				},
			},
		},
	},
});

export const themeTokens = tokens;
export const fonts = {
	body: fontBody,
	mono: fontMono,
};
