import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				'zone-1': 'hsl(var(--zone-1))',
				'zone-1-light': 'hsl(var(--zone-1-light))',
				'zone-2': 'hsl(var(--zone-2))',
				'zone-2-light': 'hsl(var(--zone-2-light))',
				'zone-3': 'hsl(var(--zone-3))',
				'zone-3-light': 'hsl(var(--zone-3-light))',
				'player-1': 'hsl(var(--player-1))',
				'player-2': 'hsl(var(--player-2))',
				'dice-bg': 'hsl(var(--dice-bg))',
				'dice-text': 'hsl(var(--dice-text))'
			},
			backgroundImage: {
				'gradient-zone-1': 'var(--gradient-zone-1)',
				'gradient-zone-2': 'var(--gradient-zone-2)',
				'gradient-zone-3': 'var(--gradient-zone-3)',
				'gradient-primary': 'var(--gradient-primary)'
			},
			boxShadow: {
				'glow': 'var(--shadow-glow)',
				'card-game': 'var(--shadow-card)'
			},
			transitionTimingFunction: {
				'smooth': 'var(--transition-smooth)',
				'bounce': 'var(--transition-bounce)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'dice-roll': {
					'0%': { transform: 'rotate(0deg) scale(1)' },
					'25%': { transform: 'rotate(90deg) scale(1.2)' },
					'50%': { transform: 'rotate(180deg) scale(1)' },
					'75%': { transform: 'rotate(270deg) scale(1.2)' },
					'100%': { transform: 'rotate(360deg) scale(1)' }
				},
				'token-hop': {
					'0%': { transform: 'translateY(0) scale(1)' },
					'50%': { transform: 'translateY(-8px) scale(1.1)' },
					'100%': { transform: 'translateY(0) scale(1)' }
				},
				'glow-pulse': {
					'0%, 100%': { boxShadow: '0 0 5px hsl(var(--primary) / 0.3)' },
					'50%': { boxShadow: '0 0 20px hsl(var(--primary) / 0.6)' }
				},
				'slide-up': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'fade-scale': {
					'0%': { transform: 'scale(0.8)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'dice-roll': 'dice-roll 0.8s ease-in-out',
				'token-hop': 'token-hop 0.4s ease-in-out',
				'glow-pulse': 'glow-pulse 1.2s ease-in-out infinite',
				'slide-up': 'slide-up 0.3s ease-out',
				'fade-scale': 'fade-scale 0.3s ease-out',
				'char-bounce': 'token-hop 0.7s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
