"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Particle = {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  size: number;
};

const MOBILE_TEXT = ["D", "E", "S", "O", "U", "R", "C", "E"];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function ParticleTitle() {
  const frameRef = useRef<number | null>(null);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;

    if (!section || !canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const offscreenCanvas = document.createElement("canvas");
    const offscreenContext = offscreenCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!offscreenContext) {
      return;
    }

    let width = 0;
    let height = 0;

    const rebuildParticles = () => {
      const bounds = section.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      width = Math.max(Math.floor(bounds.width), 1);
      height = Math.max(Math.floor(bounds.height), 1);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      offscreenCanvas.width = width * dpr;
      offscreenCanvas.height = height * dpr;
      offscreenContext.setTransform(dpr, 0, 0, dpr, 0, 0);
      offscreenContext.clearRect(0, 0, width, height);

      const compact = width < 640;
      const lines = MOBILE_TEXT;
      const horizontalLimit = compact ? width * 0.22 : width * 0.1;
      const verticalLimit = height / 10.8;
      const fontSize = clamp(Math.min(horizontalLimit, verticalLimit), 42, 82);
      const lineHeight = fontSize * 1.08;
      const totalHeight = lineHeight * lines.length;
      const startY = (height - totalHeight) / 2 + lineHeight / 2;
      const sampleGap = 2;

      offscreenContext.fillStyle = "#ffffff";
      offscreenContext.textAlign = "center";
      offscreenContext.textBaseline = "middle";
      offscreenContext.font = `100 ${fontSize}px "IBM Plex Mono", monospace`;
      offscreenContext.globalCompositeOperation = "source-over";

      for (const [index, line] of lines.entries()) {
        offscreenContext.fillText(line, width / 2, startY + index * lineHeight);
      }

      const { data } = offscreenContext.getImageData(0, 0, width, height);
      const nextParticles: Particle[] = [];

      for (let y = 0; y < height; y += sampleGap) {
        for (let x = 0; x < width; x += sampleGap) {
          const alpha = data[(y * width + x) * 4 + 3];

          if (alpha < 32) {
            continue;
          }

          const spread = compact ? 12 : 6;

          nextParticles.push({
            x: x + (Math.random() - 0.5) * spread,
            y: y + (Math.random() - 0.5) * spread,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
            size: compact ? 1.35 : 1.15,
          });
        }
      }

      particlesRef.current = nextParticles;
      setIsReady(nextParticles.length > 0);
    };

    const render = () => {
      context.clearRect(0, 0, width, height);

      const pointer = pointerRef.current;
      const particles = particlesRef.current;
      const radius = width < 640 ? 72 : 88;

      for (const particle of particles) {
        const dx = pointer.x - particle.x;
        const dy = pointer.y - particle.y;
        const distance = Math.hypot(dx, dy) || 1;

        if (pointer.active && distance < radius) {
          const force = (radius - distance) / radius;
          const angle = Math.atan2(dy, dx);

          particle.vx -= Math.cos(angle) * force * 1.8;
          particle.vy -= Math.sin(angle) * force * 1.8;
        }

        particle.vx += (particle.baseX - particle.x) * 0.05;
        particle.vy += (particle.baseY - particle.y) * 0.05;
        particle.vx *= 0.82;
        particle.vy *= 0.82;
        particle.x += particle.vx;
        particle.y += particle.vy;

        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fillStyle = "rgba(255, 255, 255, 0.94)";
        context.fill();
      }

      frameRef.current = window.requestAnimationFrame(render);
    };

    rebuildParticles();
    frameRef.current = window.requestAnimationFrame(render);

    const resizeObserver = new ResizeObserver(() => {
      rebuildParticles();
    });

    resizeObserver.observe(section);

    return () => {
      resizeObserver.disconnect();

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const updatePointer = (
    event: ReactPointerEvent<HTMLDivElement>,
    active: boolean,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();

    pointerRef.current = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      active,
    };
  };

  return (
    <div
      ref={sectionRef}
      className="hero-visual relative isolate w-full overflow-hidden bg-transparent"
      onPointerDown={(event) => updatePointer(event, true)}
      onPointerMove={(event) => updatePointer(event, true)}
      onPointerLeave={() => {
        pointerRef.current.active = false;
      }}
      onPointerUp={() => {
        pointerRef.current.active = false;
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full touch-none transition-opacity duration-500 ${
          isReady ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
