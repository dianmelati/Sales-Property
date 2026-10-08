import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F2F3F0",      // dinding beton terang, sedikit dingin
        stone: "#E2E5E0",      // pemisah dan panel
        basalt: "#1E2B2F",     // teks utama dan footer
        moss: "#3E5C55",       // aksen sekunder, tombol sekunder
        brass: "#A4824A",      // satu-satunya aksen hangat: CTA dan harga
        mist: "#6B7A78",       // teks pendukung
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { display: "-0.025em" },
      borderRadius: { DEFAULT: "2px", md: "2px", lg: "4px" },
      maxWidth: { page: "1360px" },
    },
  },
  plugins: [],
} satisfies Config;
