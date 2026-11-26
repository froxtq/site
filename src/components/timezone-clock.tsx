"use client";

import { useEffect, useState } from "react";
import { TIMEZONE } from "@/data/portfolio-data";

function getTime() {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: TIMEZONE
  }).format(new Date());
}

export function TimezoneClock() {
  const [time, setTime] = useState(getTime());

  useEffect(() => {
    const timer = setInterval(() => setTime(getTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      data-snow-surface="clock"
      className="clock-anchor glass-surface rounded-2xl border px-4 py-3 text-center"
      style={{
        fontFamily: "var(--terminal-font)"
      }}
    >
      <p className="clock-blue clock-kyiv-hover inline-block cursor-default text-xl font-bold tracking-wider sm:text-2xl">{time}</p>
      <p className="clock-blue mt-1 text-xs font-semibold tracking-[0.22em] sm:text-sm">[KYIV]</p>
    </div>
  );
}
