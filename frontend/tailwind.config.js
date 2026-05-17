/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      colors: {
        darkBg: '#0B0F19',
        glassBorder: 'rgba(255, 255, 255, 0.1)',
        glassBg: 'rgba(255, 255, 255, 0.05)',
        neonCyan: '#00F0FF',
        neonPurple: '#8A2BE2',
        neonPink: '#FF007F',
      },
      animation: {
        blob: "blob 7s infinite",
        pulseGlow: "pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        blob: {
          "0%": {
            transform: "translate(0px, 0px) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
          "100%": {
            transform: "translate(0px, 0px) scale(1)",
          },
        },
        pulseGlow: {
          "0%, 100%": {
            opacity: 1,
            boxShadow: "0 0 15px rgba(0, 240, 255, 0.5)",
          },
          "50%": {
            opacity: .8,
            boxShadow: "0 0 30px rgba(0, 240, 255, 0.8)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        }
      },
    },
  },
  plugins: [],
}