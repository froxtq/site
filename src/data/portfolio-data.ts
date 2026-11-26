export const FONT_FAMILY = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

export const THEME = {
  bg: "#0b0c10",
  panel: "#11131a",
  border: "#272b36",
  text: "#d2d6e1",
  muted: "#8d95a8",
  accent: "#5ad1ff",
  accentSecondary: "#8b7dff",
  glow: "0 0 30px rgba(90, 209, 255, 0.2)"
} as const;

export const CONTENT = {
  hero: {
    heading: "[ SYSTEM OVERVIEW ]"
  },
  about: {
    heading: "## what do i do?",
    lines: [
      "Web Platforms",
      "UI/UX Interfaces",
      "Interactive Products",
      "Custom Solutions"
    ]
  },
  contact: {
    heading: "## contact",
    lines: [
      "email: morozov.nikita1302@gmail.com",
      "github: github.com/froxtq",
      "location: Kyiv, Ukraine",
      "telegram: t.me/froxtq"
    ]
  },
  cvLink: "/cv.pdf"
} as const;

export const SKILLS = [
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express",
  "PostgreSQL",
  "Prisma",
  "Tailwind",
  "Framer Motion",
  "Docker",
  "CI/CD",
  "REST API"
] as const;

export const TIMEZONE = "Europe/Kyiv";
