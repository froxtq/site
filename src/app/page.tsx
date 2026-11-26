"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, Code2, Copy, Github, GraduationCap, Mail, MapPin, PanelsTopLeft, Send } from "lucide-react";
import { MusicPlayer } from "@/components/music-player";
import { TimezoneClock } from "@/components/timezone-clock";
import { TypingLine } from "@/components/typing-line";
import { SnowControls, Snowfall } from "@/components/snowfall";
import { GlowPicker } from "@/components/glow-picker";
import { CONTENT } from "@/data/portfolio-data";

const education = [
  { name: "Taras Shevchenko National University", course: "University studies", period: "01.09.2026 - Present", Icon: GraduationCap },
  { name: "IT STEP", course: "UI/UX design course · around one year", period: "10.2024 - 09.2025", Icon: PanelsTopLeft },
  { name: "GoIT", course: "Full Stack development course", period: "03.2025 - 11.2025", Icon: Code2 },
];

function ContactInformation() {
  const [copied, setCopied] = useState(false);
  const email = "morozov.nikita1302@gmail.com";

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const contacts = [
    { label: "TELEGRAM", value: "@froxtq", href: "https://t.me/froxtq", Icon: Send, external: true },
    { label: "GITHUB", value: "froxtq", href: "https://github.com/froxtq", Icon: Github, external: true },
    { label: "LOCATION", value: "Kyiv, Ukraine", href: null, Icon: MapPin, external: false },
  ];

  return (
    <article data-snow-surface="contact-card" className="contact-layout glass-surface w-full overflow-hidden rounded-3xl border p-5 sm:p-8">
      <div className="contact-heading">
        <p className="section-kicker">[ CONTACT ]</p>
        <h1 className="contact-title">Contact Information</h1>
        <p className="education-intro">Open to job opportunities, freelance projects, and interesting collaborations.</p>
      </div>
      <div className="contact-list">
        <div className="contact-item contact-email glass-surface">
          <span className="education-icon"><Mail size={21} strokeWidth={1.8} /></span>
          <div className="education-copy contact-email-copy"><p className="contact-label">EMAIL</p><a className="contact-value" href={`mailto:${email}`}>{email}</a></div>
          <button type="button" className="copy-email glass-control" onClick={() => void copyEmail()} aria-label="Скопировать email" title="Скопировать email">
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
        {contacts.map(({ label, value, href, Icon, external }) => (
          <div key={label} className="contact-item glass-surface">
            <span className="education-icon"><Icon size={21} strokeWidth={1.8} /></span>
            <div className="education-copy"><p className="contact-label">{label}</p>{href ? <a className="contact-value" href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{value}</a> : <p className="contact-value">{value}</p>}</div>
          </div>
        ))}
        <p className="copy-feedback" aria-live="polite">{copied ? "Email copied to clipboard" : ""}</p>
      </div>
    </article>
  );
}

export default function HomePage() {
  const [activeSection, setActiveSection] = useState(0);
  const lastChange = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const goToSection = useCallback((next: number) => {
    const now = Date.now();
    if (now - lastChange.current < 650) return;
    lastChange.current = now;
    setActiveSection(Math.max(0, Math.min(2, next)));
  }, []);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 18) return;
      if ((event.target as HTMLElement | null)?.closest("button, input, a, .left-tools, .clock-anchor, .player-anchor, .snow-menu, .glow-menu")) return;
      if ((activeSection < 2 && event.deltaY > 0) || (activeSection > 0 && event.deltaY < 0)) {
        event.preventDefault();
        goToSection(activeSection + (event.deltaY > 0 ? 1 : -1));
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [activeSection, goToSection]);

  const onTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event: React.TouchEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dy) < 48 || Math.abs(dy) < Math.abs(dx) * 1.25) return;
    goToSection(activeSection + (dy < 0 ? 1 : -1));
  };

  return (
    <div className="site-shell relative min-h-screen w-full">
      <Snowfall />
      <main className="relative z-10 grid min-h-screen w-full place-items-center overflow-x-hidden px-4 py-6 text-sm sm:px-8 sm:py-8">
        <div className="section-stage mx-auto grid w-full max-w-3xl" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {[0, 1, 2].map((section) => {
            const active = activeSection === section;
            return (
              <motion.section
                key={section}
                initial={false}
                animate={{
                  opacity: active ? 1 : 0,
                  x: active ? 0 : section < activeSection ? "-100vw" : "100vw",
                  scale: active ? 1 : 0.985,
                }}
                transition={{ duration: 0.72, ease: [0.22, 0.68, 0, 1] }}
                aria-hidden={!active}
                inert={!active}
                className="portfolio-section"
                style={{ pointerEvents: active ? "auto" : "none", zIndex: active ? 2 : 1 }}
              >
                {section === 0 ? (
                  <div className="hero-screen">
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08, duration: 0.65 }}
                      className="hero-heading"
                    >
                      <div className="availability-badge">
                        <span className="availability-dot" aria-hidden="true" />
                        <span>// AVAILABLE</span>
                      </div>
                      <h1 className="hero-title"><span aria-hidden="true">#</span> nikita morozov</h1>
                    </motion.div>
                    <article data-snow-surface="main-card" className="portfolio-card glass-surface w-full overflow-hidden rounded-3xl border p-5 text-center sm:p-8">
                      <div className="overview-content">
                        <TypingLine delay={0.05} className="overview-tag">{CONTENT.hero.heading}</TypingLine>
                        <TypingLine delay={0.15} className="overview-primary">
                          Full Stack Developer designing and building modern, responsive web applications across <strong>Web Platforms</strong>, <strong>UI/UX Interfaces</strong>, <strong>Interactive Products</strong>, and <strong>Custom Solutions</strong>.
                        </TypingLine>
                        <TypingLine delay={0.25} className="overview-secondary">
                          Strong focus on frontend engineering (<strong>React</strong> / <strong>Next.js</strong> / <strong>TypeScript</strong>), clean UI/UX architecture, reliable backend logic and APIs, smooth animations, and performance optimization.
                        </TypingLine>
                      </div>

                      <div className="overview-capabilities-wrap mt-7">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
                          <h2 className="overview-capabilities-title mb-2 font-semibold">{CONTENT.about.heading}</h2>
                          <div className="overview-capabilities">
                            {CONTENT.about.lines.map((line) => (
                              <div key={line} className="overview-capability-chip select-none cursor-default">
                                <span className="overview-capability-slash">/</span>
                                <span>{line}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    </article>
                  </div>
                ) : section === 1 ? (
                  <article data-snow-surface="education-card" className="education-card glass-surface w-full overflow-hidden rounded-3xl border p-5 text-center sm:p-8">
                    <h1 className="education-title">[ EDUCATION ]</h1>
                    <p className="education-intro">Academic studies and focused training in digital product development</p>
                    <div className="education-list">
                      {education.map(({ name, course, period, Icon }, index) => (
                        <motion.div key={name} initial={{ opacity: 0, y: 16 }} animate={activeSection === 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }} transition={{ duration: 0.45, delay: activeSection === 1 ? 0.15 + index * 0.1 : 0 }} data-snow-surface={`education-${index}`} className="education-item glass-surface">
                          <span className="education-icon"><Icon size={21} strokeWidth={1.8} /></span>
                          <div className="education-copy"><h2>{name}</h2><p>{course}</p></div>
                          <span className="education-note">{period}</span>
                        </motion.div>
                      ))}
                    </div>
                  </article>
                ) : (
                  <ContactInformation />
                )}
              </motion.section>
            );
          })}
        </div>
      </main>
      <nav className="section-pagination" aria-label="Навигация по секциям">
        {[0, 1, 2].map((section) => <button key={section} type="button" className={`section-dot glass-control ${activeSection === section ? "is-active" : ""}`} onClick={() => goToSection(section)} aria-label={["Главная секция", "Образование", "Контакты"][section]} aria-current={activeSection === section ? "page" : undefined} />)}
      </nav>
      <TimezoneClock />
      <MusicPlayer />
      <aside className="left-tools fixed left-4 top-1/2 z-40 flex -translate-y-1/2 flex-col gap-2" aria-label="Настройки оформления и снега">
        <GlowPicker />
        <SnowControls />
      </aside>
    </div>
  );
}
