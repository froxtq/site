"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "froxtq-glow-color";
const COLORS = [
  { name: "Emerald", shades: ["#28684d", "#174331"] },
  { name: "Blue", shades: ["#3584b8", "#1f4e79"] },
  { name: "Violet", shades: ["#9166c8", "#5b3a87"] },
  { name: "Coral", shades: ["#e87568", "#a84342"] },
  { name: "Amber", shades: ["#d99b43", "#9c6822"] },
  { name: "Pink", shades: ["#d96caa", "#98446f"] },
  { name: "Neutral", shades: ["#e2e8f0", "#8b98a8"] }
];

export function GlowPicker() {
  const [color, setColor] = useState("#28684d");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && /^#[0-9a-f]{6}$/i.test(saved)) {
      setColor(saved);
      document.documentElement.style.setProperty("--glow-color", saved);
    }
  }, []);

  const updateColor = (next: string) => {
    setColor(next);
    document.documentElement.style.setProperty("--glow-color", next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <div className="glow-picker relative">
      {open && <div className="glass-surface glow-menu absolute left-full top-0 ml-3 w-52 rounded-2xl border border-white/15 p-3 shadow-xl sm:w-56">
        <p className="mb-2 text-xs font-semibold">Glow Color</p>
        <div className="space-y-2">
          {COLORS.map((group) => <div key={group.name} className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-white/60">{group.name}</span>
            <div className="flex items-center gap-1.5">
              {group.shades.map((shade) => <button key={shade} type="button" onClick={() => updateColor(shade)} aria-label={`${group.name}: ${shade === group.shades[0] ? "light" : "dark"} shade`} title={group.name} className={`h-5 w-5 rounded-full border transition hover:scale-110 ${color === shade ? "border-white ring-2 ring-white/25" : "border-white/20"}`} style={{ backgroundColor: shade }} />)}
            </div>
          </div>)}
        </div>
      </div>}
      <button type="button" onClick={() => setOpen((value) => !value)} className="glass-control flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 text-white shadow-xl transition hover:scale-105" aria-label="Customize glow color" title="Glow color">
        <Palette size={19} />
      </button>
    </div>
  );
}
