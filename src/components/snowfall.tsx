"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play, Snowflake, Trash2 } from "lucide-react";

type Tool = "mitt" | "snowball";
type Weather = "light" | "steady" | "blizzard";
type Config = { tool: Tool; weather: Weather; wind: number; enabled: boolean; speed: number; size: number };
type Snowman = { x: number; y: number; levels: number };
type Flake = { x: number; y: number; r: number; speed: number; phase: number };
type Surface = {
  rect: DOMRect;
  snow: Float32Array;
  limits: Float32Array;
  radiusLeft: number;
  radiusRight: number;
};

const CELL_SIZE = 9;
const MAX_SURFACE_HEIGHT = 14;
const MAX_GROUND_HEIGHT = 12;

export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let config: Config = { tool: "mitt", weather: "steady", wind: 0, enabled: true, speed: 1, size: 1 };
    let flakes: Flake[] = [];
    let snowmen: Snowman[] = [];
    let dragging = false;
    let pointer = { x: 0, y: 0 };
    let previousPointer = { x: 0, y: 0 };
    let rollingBall: { x: number; y: number; radius: number } | null = null;
    let lastTime = 0;
    let frame = 0;
    let groundSnow: Float32Array<ArrayBufferLike> = new Float32Array(Math.ceil(width / 10));
    let surfaceState = new Map<Element, Surface>();

    const resample = (source: Float32Array<ArrayBufferLike>, count: number): Float32Array<ArrayBufferLike> => {
      if (source.length === count) return source;
      const result = new Float32Array(count);
      if (!source.length) return result;
      for (let i = 0; i < count; i++) {
        const position = count <= 1 ? 0 : (i * (source.length - 1)) / (count - 1);
        const lower = Math.floor(position);
        const upper = Math.min(source.length - 1, lower + 1);
        const mix = position - lower;
        result[i] = source[lower] * (1 - mix) + source[upper] * mix;
      }
      return result;
    };

    const makeHeightLimits = (count: number) => {
      const anchors = Array.from({ length: Math.max(2, Math.ceil(count / 4) + 1) }, () => 8.5 + Math.random() * 5.5);
      return Float32Array.from({ length: count }, (_, index) => {
        const position = count <= 1 ? 0 : (index * (anchors.length - 1)) / (count - 1);
        const left = Math.floor(position);
        const right = Math.min(anchors.length - 1, left + 1);
        const rawMix = position - left;
        const mix = rawMix * rawMix * (3 - 2 * rawMix);
        return anchors[left] * (1 - mix) + anchors[right] * mix;
      });
    };

    const depositSnow = (surface: Surface, index: number, amount: number) => {
      const weights = [0.2, 0.6, 0.2];
      for (let offset = -1; offset <= 1; offset++) {
        const cell = index + offset;
        if (cell < 0 || cell >= surface.snow.length) continue;
        surface.snow[cell] = Math.min(surface.limits[cell], surface.snow[cell] + amount * weights[offset + 1]);
      }
    };

    const findLowerCell = (surface: Surface, index: number) => {
      let target = -1;
      const currentX = surface.rect.left + (index + 0.5) * CELL_SIZE;
      let lowestElevation = surfaceTopAt(surface, currentX) - surface.snow[index];
      for (const candidate of [index - 1, index + 1, index - 2, index + 2]) {
        if (candidate < 0 || candidate >= surface.snow.length) continue;
        if (surface.limits[candidate] - surface.snow[candidate] < 0.45) continue;
        const candidateX = surface.rect.left + (candidate + 0.5) * CELL_SIZE;
        const candidateElevation = surfaceTopAt(surface, candidateX) - surface.snow[candidate];
        if (candidateElevation > lowestElevation + 0.35) {
          target = candidate;
          lowestElevation = candidateElevation;
        }
      }
      return target;
    };

    const settleSlopes = (surface: Surface, dt: number) => {
      for (let index = 0; index < surface.snow.length - 1; index++) {
        const difference = surface.snow[index] - surface.snow[index + 1];
        if (Math.abs(difference) < 1.4) continue;
        const from = difference > 0 ? index : index + 1;
        const to = difference > 0 ? index + 1 : index;
        const room = surface.limits[to] - surface.snow[to];
        if (room <= 0 || surface.snow[from] <= 0) continue;
        const flow = Math.min((Math.abs(difference) - 1.4) * 0.045 * dt, 0.025, room, surface.snow[from]);
        surface.snow[from] -= flow;
        surface.snow[to] += flow;
      }
    };

    const snowballRadii = [16, 11, 7];
    const snowmanCenters = (item: Snowman) => {
      const verticalRadii = snowballRadii.map((radius) => radius * 0.9);
      const centers = [item.y - verticalRadii[0]];
      for (let index = 1; index < item.levels; index++) {
        centers.push(centers[index - 1] - verticalRadii[index - 1] - verticalRadii[index] + 1.4);
      }
      return centers;
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      groundSnow = resample(groundSnow, Math.ceil(width / 10));
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const emitConfig = (event: Event) => {
      const next = (event as CustomEvent<Config>).detail;
      config = next;
    };
    const clearSnow = () => {
      surfaceState.forEach((surface) => surface.snow.fill(0));
      groundSnow.fill(0);
      snowmen = [];
      flakes = [];
    };

    const surfaceTopAt = (surface: Surface, x: number) => {
      const { rect, radiusLeft, radiusRight } = surface;
      const localX = Math.max(0, Math.min(rect.width, x - rect.left));
      if (radiusLeft > 0 && localX < radiusLeft) {
        const distance = radiusLeft - localX;
        return rect.top + radiusLeft - Math.sqrt(Math.max(0, radiusLeft ** 2 - distance ** 2));
      }
      const fromRight = rect.width - localX;
      if (radiusRight > 0 && fromRight < radiusRight) {
        const distance = radiusRight - fromRight;
        return rect.top + radiusRight - Math.sqrt(Math.max(0, radiusRight ** 2 - distance ** 2));
      }
      return rect.top;
    };

    const point = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY });
    const wipeNear = (x: number, y: number, radius: number) => {
      surfaceState.forEach((surface) => {
        const rect = surface.rect;
        if (x < rect.left - radius || x > rect.right + radius || y < rect.top - radius - 24 || y > rect.top + radius) return;
        const start = Math.max(0, Math.floor((x - radius - rect.left) / CELL_SIZE));
        const end = Math.min(surface.snow.length - 1, Math.ceil((x + radius - rect.left) / CELL_SIZE));
        for (let i = start; i <= end; i++) {
          const px = rect.left + i * CELL_SIZE;
          const distance = Math.abs(px - x);
          if (distance < radius) surface.snow[i] = Math.max(0, surface.snow[i] - 5.5 * (1 - distance / radius));
        }
      });
    };

    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement | null)?.closest("button, input, a, .snow-controls, .glow-picker")) return;
      pointer = point(event);
      previousPointer = pointer;
      dragging = true;
      if (config.tool === "mitt") {
        wipeNear(pointer.x, pointer.y, 48);
      } else if (config.tool === "snowball") {
        const existing = snowmen.find((item) => {
          if (item.levels >= 3) return false;
          const topIndex = item.levels - 1;
          const topCenter = snowmanCenters(item)[topIndex];
          const topRadius = snowballRadii[topIndex];
          return Math.abs(pointer.x - item.x) < topRadius + 8 && Math.abs(pointer.y - topCenter) < topRadius * 0.9 + 8;
        });
        if (existing) {
          existing.levels += 1;
          rollingBall = null;
        } else {
          rollingBall = { ...pointer, radius: 9 };
        }
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer = point(event);
      if (dragging && config.tool === "mitt") wipeNear(pointer.x, pointer.y, 48);
      if (dragging && rollingBall) {
        rollingBall.radius = Math.min(26, rollingBall.radius + Math.hypot(pointer.x - previousPointer.x, pointer.y - previousPointer.y) * 0.045);
        rollingBall.x = pointer.x;
        rollingBall.y = pointer.y;
      }
      previousPointer = pointer;
    };

    const onPointerUp = () => {
      dragging = false;
      if (rollingBall) {
        const base = snowmen.find((item) => {
          if (item.levels >= 3) return false;
          const topIndex = item.levels - 1;
          const topCenter = snowmanCenters(item)[topIndex];
          return Math.abs(pointer.x - item.x) < snowballRadii[topIndex] + rollingBall!.radius &&
            pointer.y < topCenter + snowballRadii[topIndex] * 0.9;
        });
        if (base) base.levels += 1;
        else snowmen.push({ x: pointer.x, y: pointer.y, levels: 1 });
        rollingBall = null;
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.closest("input, button, textarea, select, a")) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        config.wind = Math.max(-2, Math.min(2, config.wind + (event.key === "ArrowLeft" ? -1 : 1)));
        window.dispatchEvent(new CustomEvent("flake-wind", { detail: config.wind }));
      }
      if (event.code === "Space") {
        config.wind = 0;
        window.dispatchEvent(new CustomEvent("flake-wind", { detail: 0 }));
      }
    };

    const getSurfaces = () => {
      const next = new Map<Element, Surface>();
      document.querySelectorAll<HTMLElement>("[data-snow-surface]").forEach((element) => {
        // Contact snow belongs to the outer panel only; its inner rows stay clear.
        const contactPanel = element.closest<HTMLElement>('[data-snow-surface="contact-card"]');
        if (contactPanel && contactPanel !== element) return;
        const rect = element.getBoundingClientRect();
        if (rect.width < 35 || rect.height < 15) return;
        const previous = surfaceState.get(element);
        const count = Math.max(1, Math.ceil(rect.width / CELL_SIZE));
        const snow = previous ? resample(previous.snow, count) : new Float32Array(count);
        const limits = previous ? resample(previous.limits, count) : makeHeightLimits(count);
        const style = window.getComputedStyle(element);
        const radius = (value: string) => {
          const parsed = Number.parseFloat(value);
          if (!Number.isFinite(parsed)) return 0;
          const resolved = value.includes("%") ? (parsed / 100) * rect.width : parsed;
          return Math.max(0, Math.min(resolved, rect.width / 2, rect.height));
        };
        next.set(element, {
          rect,
          snow,
          limits,
          radiusLeft: radius(style.borderTopLeftRadius),
          radiusRight: radius(style.borderTopRightRadius)
        });
      });
      surfaceState = next;
    };

    const drawSnowman = (item: Snowman) => {
      const centers = snowmanCenters(item);
      for (let i = 0; i < item.levels; i++) {
        const r = snowballRadii[i];
        const cy = centers[i];
        context.beginPath();
        context.ellipse(item.x, cy, r, r * 0.9, 0, 0, Math.PI * 2);
        context.fillStyle = "rgba(255,255,255,0.96)";
        context.shadowColor = "rgba(190,225,255,0.65)";
        context.shadowBlur = 8;
        context.fill();
        context.shadowBlur = 0;
        if (i === 2) {
          context.fillStyle = "#526274";
          context.beginPath();
          context.arc(item.x - 2.4, cy - 1, 0.8, 0, Math.PI * 2);
          context.arc(item.x + 2.4, cy - 1, 0.8, 0, Math.PI * 2);
          context.fill();
        } else if (i === 1) {
          context.fillStyle = "#728298";
          context.beginPath();
          context.arc(item.x, cy, 1, 0, Math.PI * 2);
          context.fill();
        }
      }
    };

    const draw = (time: number) => {
      const dt = Math.min(0.04, (time - (lastTime || time)) / 1000);
      lastTime = time;
      getSurfaces();
      context.clearRect(0, 0, width, height);

      const counts: Record<Weather, number> = width < 640
        ? { light: 60, steady: 150, blizzard: 250 }
        : { light: 100, steady: 280, blizzard: 460 };
      // As the portfolio surfaces fill, thin the active snowfall gradually.
      // Keep a small baseline so the scene stays alive at full capacity.
      let fillRatio = 0;
      surfaceState.forEach((surface, element) => {
        const id = (element as HTMLElement).dataset.snowSurface ?? "";
        if (id !== "main-card" && !id.startsWith("education") && !id.startsWith("contact")) return;
        let snowTotal = 0;
        let snowCapacity = 0;
        for (let i = 0; i < surface.snow.length; i++) {
          snowTotal += surface.snow[i];
          snowCapacity += surface.limits[i];
        }
        if (snowCapacity) fillRatio = Math.max(fillRatio, snowTotal / snowCapacity);
      });
      fillRatio = Math.min(1, fillRatio);
      const particleScale = 1 - fillRatio * 0.42;
      const target = config.enabled ? Math.max(42, Math.round(counts[config.weather] * particleScale)) : 0;
      while (flakes.length < target) {
        const x = Math.random() * width;
        let y = Math.random() * height;
        for (const surface of surfaceState.values()) {
          const { rect } = surface;
          if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
            y = Math.min(y, surfaceTopAt(surface, x) - Math.random() * Math.max(80, height * 0.35));
            break;
          }
        }
        flakes.push({ x, y, r: 1.2 + Math.random() * 2.5, speed: 24 + Math.random() * 65, phase: Math.random() * Math.PI * 2 });
      }
      if (flakes.length > target) flakes.length = target;

      surfaceState.forEach((surface) => settleSlopes(surface, dt));

      const spillQueue: Flake[] = [];
      flakes = flakes.filter((flake) => {
        const previousY = flake.y;
        flake.y += flake.speed * config.speed * dt;
        flake.x += (config.wind * 30 + Math.sin(time / 1100 + flake.phase) * 13) * dt;
        if (flake.x < -8) flake.x = width + 8;
        if (flake.x > width + 8) flake.x = -8;
        let landed = false;
        surfaceState.forEach((surface) => {
          if (landed) return;
          const { rect, snow } = surface;
          const index = Math.floor((flake.x - rect.left) / CELL_SIZE);
          if (index < 0 || index >= snow.length || flake.x < rect.left || flake.x > rect.right) return;
          const surfaceTop = surfaceTopAt(surface, flake.x);
          const top = surfaceTop - snow[index];
          const flakeRadius = flake.r * config.size;
          const hitSurface = previousY + flakeRadius <= top && flake.y + flakeRadius >= top;
          if (!hitSurface) return;

          if (snow[index] >= surface.limits[index] - 0.02) {
            const lowerCell = findLowerCell(surface, index);
            if (lowerCell >= 0) {
              depositSnow(surface, lowerCell, 0.5 + Math.random() * 0.25);
              landed = true;
              return;
            }

            // If nearby cells are full too, send a separate grain off the rounded edge.
            const fallsLeft = flake.x < rect.left + rect.width / 2;
            const edgeX = fallsLeft ? rect.left : rect.right;
            const edgeIndex = fallsLeft ? 0 : snow.length - 1;
            const edgeTop = surfaceTopAt(surface, edgeX) - snow[edgeIndex];
            spillQueue.push({
              x: edgeX + (fallsLeft ? -2 : 2),
              y: Math.max(0, edgeTop),
              r: 1.2 + Math.random() * 1.4,
              speed: Math.max(85, flake.speed * 1.3),
              phase: Math.random() * Math.PI * 2
            });
            landed = true;
            return;
          }

          depositSnow(surface, index, 0.55 + Math.random() * 0.35);
          landed = true;
        });
        if (landed) return false;
        const groundIndex = Math.max(0, Math.min(groundSnow.length - 1, Math.floor(flake.x / 10)));
        const groundTop = height - groundSnow[groundIndex];
        if (previousY + flake.r * config.size <= groundTop && flake.y + flake.r * config.size >= groundTop) {
          const index = groundIndex;
          const maxGroundDepth = MAX_GROUND_HEIGHT;
          if (groundSnow[index] < maxGroundDepth) {
            groundSnow[index] = Math.min(maxGroundDepth, groundSnow[index] + 0.82);
            if (index > 0) groundSnow[index - 1] = Math.min(maxGroundDepth, groundSnow[index - 1] + 0.16);
            if (index + 1 < groundSnow.length) groundSnow[index + 1] = Math.min(maxGroundDepth, groundSnow[index + 1] + 0.16);
          }
          // Recycle flakes after they reach the viewport floor so the capped drift stays fixed in height.
          flake.x = Math.random() * width;
          flake.y = -Math.random() * Math.max(30, height * 0.3);
          return true;
        }
        if (flake.y > height + 12) {
          flake.x = Math.random() * width;
          flake.y = -Math.random() * Math.max(30, height * 0.3);
          return true;
        }
        context.beginPath();
        context.fillStyle = `rgba(255,255,255,${0.48 + Math.min(flake.r / 7, 0.42)})`;
        context.shadowColor = "rgba(217,239,255,0.5)";
        context.shadowBlur = flake.r * 2.5;
        context.arc(flake.x, flake.y, flake.r * config.size, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        return !landed;
      });
      if (spillQueue.length) flakes.push(...spillQueue);

      let groundStart = 0;
      while (groundStart < groundSnow.length) {
        while (groundStart < groundSnow.length && groundSnow[groundStart] < 0.08) groundStart++;
        if (groundStart >= groundSnow.length) break;
        let groundEnd = groundStart;
        while (groundEnd + 1 < groundSnow.length && groundSnow[groundEnd + 1] >= 0.08) groundEnd++;
        const left = groundStart * 10;
        const right = Math.min(width, (groundEnd + 1) * 10);
        context.beginPath();
        context.moveTo(left, height);
        for (let i = groundStart; i <= groundEnd; i++) {
          const x = Math.min(width, i * 10 + 5);
          const y = height - groundSnow[i];
          if (i === groundStart) context.lineTo(x, y);
          else context.quadraticCurveTo(x - 5, height - groundSnow[i - 1], (x + (i - 1) * 10 + 5) / 2, (y + height - groundSnow[i - 1]) / 2);
        }
        context.lineTo(right, height - groundSnow[groundEnd]);
        context.lineTo(right, height + 1);
        context.lineTo(left, height + 1);
        context.closePath();
        const groundGradient = context.createLinearGradient(0, height - 12, 0, height);
        groundGradient.addColorStop(0, "rgba(255,255,255,0.96)");
        groundGradient.addColorStop(1, "rgba(212,230,245,0.82)");
        context.fillStyle = groundGradient;
        context.shadowColor = "rgba(224,242,255,0.48)";
        context.shadowBlur = 7;
        context.fill();
        context.shadowBlur = 0;
        groundStart = groundEnd + 1;
      }

      surfaceState.forEach((surface) => {
        const { rect, snow } = surface;
        if (!snow.length || !snow.some((amount) => amount > 0)) return;
        let start = 0;
        while (start < snow.length) {
          while (start < snow.length && snow[start] < 0.08) start++;
          if (start >= snow.length) break;
          let end = start;
          while (end + 1 < snow.length && snow[end + 1] >= 0.08) end++;
          const left = rect.left + start * CELL_SIZE;
          const right = Math.min(rect.right, rect.left + (end + 1) * CELL_SIZE);
          let max = 1;
          for (let i = start; i <= end; i++) {
            max = Math.max(max, snow[i]);
          }
          max = Math.min(MAX_SURFACE_HEIGHT, max);
          context.beginPath();
          let previousX = left;
          let previousY = surfaceTopAt(surface, left) - snow[start];
          context.moveTo(previousX, previousY);
          for (let i = start; i <= end; i++) {
            const x = Math.min(right, rect.left + (i + 0.5) * CELL_SIZE);
            const top = surfaceTopAt(surface, x) - Math.min(max, snow[i]);
            context.quadraticCurveTo(previousX, previousY, (previousX + x) / 2, (previousY + top) / 2);
            previousX = x;
            previousY = top;
          }
          const endHeight = Math.min(max, snow[end]);
          const rightTop = surfaceTopAt(surface, right) - endHeight;
          context.quadraticCurveTo(previousX, previousY, (previousX + right) / 2, (previousY + rightTop) / 2);
          context.lineTo(right, rightTop);
          context.lineTo(right, surfaceTopAt(surface, right) + 3);
          for (let i = end; i >= start; i--) {
            const x = Math.min(right, rect.left + (i + 0.5) * CELL_SIZE);
            context.lineTo(x, surfaceTopAt(surface, x) + 3);
          }
          context.lineTo(left, surfaceTopAt(surface, left) + 2);
          context.closePath();
          const gradient = context.createLinearGradient(0, rect.top - max, 0, rect.top + 8);
          gradient.addColorStop(0, "rgba(255,255,255,0.99)");
          gradient.addColorStop(0.55, "rgba(239,248,255,0.98)");
          gradient.addColorStop(1, "rgba(206,227,244,0.82)");
          context.fillStyle = gradient;
          context.shadowColor = "rgba(224,242,255,0.55)";
          context.shadowBlur = 8;
          context.fill();
          context.shadowBlur = 0;
          context.strokeStyle = "rgba(255,255,255,0.95)";
          context.lineWidth = 1;
          context.stroke();
          start = end + 1;
        }
      });

      snowmen.forEach(drawSnowman);
      if (rollingBall) {
        context.beginPath();
        context.arc(rollingBall.x, rollingBall.y, rollingBall.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(255,255,255,0.98)";
        context.shadowColor = "rgba(205,232,255,0.8)";
        context.shadowBlur = 12;
        context.fill();
        context.shadowBlur = 0;
      }
      frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("flake-config", emitConfig);
    window.addEventListener("flake-clear", clearSnow);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("flake-config", emitConfig);
      window.removeEventListener("flake-clear", clearSnow);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return <canvas ref={canvasRef} className="snow-canvas" aria-hidden="true" />;
}

export function SnowControls() {
  const [open, setOpen] = useState(false);
  const [tool, setTool] = useState<Tool>("mitt");
  const [weather, setWeather] = useState<Weather>("steady");
  const [wind, setWind] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [size, setSize] = useState(1);

  const update = (next: Partial<Config>) => {
    const config = { tool, weather, wind, enabled, speed, size, ...next };
    setTool(config.tool);
    setWeather(config.weather);
    setWind(config.wind);
    setEnabled(config.enabled);
    setSpeed(config.speed);
    setSize(config.size);
    localStorage.setItem("froxtq-snow-settings", JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("flake-config", { detail: config }));
  };

  useEffect(() => {
    const onWind = (event: Event) => setWind((event as CustomEvent<number>).detail);
    window.addEventListener("flake-wind", onWind);
    let config: Config = { tool: "mitt", weather: "steady", wind: 0, enabled: true, speed: 1, size: 1 };
    try {
      const saved = localStorage.getItem("froxtq-snow-settings");
      if (saved) {
        const candidate = { ...config, ...JSON.parse(saved) } as Config;
        if (["mitt", "snowball"].includes(candidate.tool)) config.tool = candidate.tool;
        if (["light", "steady", "blizzard"].includes(candidate.weather)) config.weather = candidate.weather;
        config.wind = Math.max(-2, Math.min(2, Number(candidate.wind) || 0));
        config.enabled = candidate.enabled !== false;
        config.speed = Math.max(0.5, Math.min(1.8, Number(candidate.speed) || 1));
        config.size = Math.max(0.6, Math.min(1.6, Number(candidate.size) || 1));
      }
    } catch {
      localStorage.removeItem("froxtq-snow-settings");
    }
    setTool(config.tool);
    setWeather(config.weather);
    setWind(config.wind);
    setEnabled(config.enabled);
    setSpeed(config.speed);
    setSize(config.size);
    window.dispatchEvent(new CustomEvent("flake-config", { detail: config }));
    return () => window.removeEventListener("flake-wind", onWind);
  }, []);

  return (
    <div className="snow-controls relative">
      {open && <section className="glass-surface snow-menu absolute left-full top-0 ml-3 w-60 rounded-2xl border border-white/15 p-3 text-xs shadow-xl sm:w-64">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-semibold">Snow Settings</p>
          <button type="button" onClick={() => update({ enabled: !enabled })} className="glass-control flex items-center gap-1.5 rounded-lg border border-white/15 px-2 py-1.5" aria-label={enabled ? "Turn snow off" : "Turn snow on"}>{enabled ? <Pause size={13} /> : <Play size={13} />}{enabled ? "On" : "Off"}</button>
        </div>
        <p className="mb-2 text-white/65">Density</p>
        <div className="mb-3 grid grid-cols-3 gap-1">
          {(["light", "steady", "blizzard"] as Weather[]).map((value, index) => <button key={value} type="button" onClick={() => update({ weather: value })} className={`glass-control rounded-lg border border-white/15 px-1 py-2 ${weather === value ? "text-white ring-1 ring-white/30" : "text-white/65"}`}>{["Light", "Snow", "Blizzard"][index]}</button>)}
        </div>
        <label className="mb-3 block text-white/70">Speed <span className="float-right text-white/50">{speed.toFixed(1)}×</span>
          <input type="range" min="0.5" max="1.8" step="0.1" value={speed} onChange={(event) => update({ speed: Number(event.target.value) })} className="glass-range mt-2 w-full" aria-label="Snow speed" />
        </label>
        <label className="mb-3 block text-white/70">Snowflake Size <span className="float-right text-white/50">{size.toFixed(1)}×</span>
          <input type="range" min="0.6" max="1.6" step="0.1" value={size} onChange={(event) => update({ size: Number(event.target.value) })} className="glass-range mt-2 w-full" aria-label="Snowflake size" />
        </label>
        <p className="mb-2 font-semibold">Interact with Snow</p>
        <div className="mb-3 grid grid-cols-2 gap-1">
          <button type="button" onClick={() => update({ tool: "mitt" })} className={`glass-control rounded-lg border border-white/15 px-1 py-2 ${tool === "mitt" ? "text-white ring-1 ring-white/30" : "text-white/70"}`}>Brush</button>
          <button type="button" onClick={() => update({ tool: "snowball" })} className={`glass-control rounded-lg border border-white/15 px-1 py-2 ${tool === "snowball" ? "text-white ring-1 ring-white/30" : "text-white/70"}`}>Snowballs</button>
        </div>
        <div className="flex items-center justify-between">
          <span>Wind</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => update({ wind: Math.max(-2, wind - 1) })} className="glass-control rounded-lg border border-white/15 p-1.5" aria-label="Wind left"><ArrowLeft size={14} /></button>
            <button type="button" onClick={() => update({ wind: 0 })} className="glass-control rounded-lg border border-white/15 p-1.5" aria-label="Calm wind"><ArrowDown size={14} /></button>
            <button type="button" onClick={() => update({ wind: Math.min(2, wind + 1) })} className="glass-control rounded-lg border border-white/15 p-1.5" aria-label="Wind right"><ArrowRight size={14} /></button>
            <button type="button" onClick={() => update({ wind: wind === 0 ? 1 : Math.min(2, wind + Math.sign(wind)) })} className="glass-control rounded-lg border border-white/15 p-1.5" aria-label="Increase wind"><ArrowUp size={14} /></button>
          </div>
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-white/55">Brush across the snow to clear it. Roll a snowball, then tap above it to build a snowman.</p>
        <button type="button" onClick={() => window.dispatchEvent(new Event("flake-clear"))} className="glass-control mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-2 py-2"><Trash2 size={14} /> Clear All</button>
      </section>}
      <button type="button" onClick={() => setOpen((value) => !value)} className="glass-control flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 text-white shadow-xl transition hover:scale-105" aria-label="Configure snow" title="Snow settings">
        <Snowflake size={20} />
      </button>
    </div>
  );
}
