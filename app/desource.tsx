"use client";

import ManifestoSection from "./manifesto-section";
import FlipTextLine from "./flip-text-line";
import SiteFooter from "./site-footer";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Segment = {
  text: string;
  weight: 100 | 700;
};

type Row = Segment[];

const CHARACTER_RAMP =
  "...::://///\\\\\\|||++==--**[]{}DDEESSOOUURRCCEE##";

function formatTimestamp(date: Date) {
  const month = date.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const day = `${date.getDate()}`.padStart(2, "0");
  const year = date.getFullYear();
  const time = date
    .toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
    .toUpperCase();

  return `${month} ${day}TH, ${year} • ${time}`;
}

function mapValue(
  value: number,
  inputMin: number,
  inputMax: number,
  outputMin: number,
  outputMax: number,
) {
  return (
    outputMin +
    ((value - inputMin) / (inputMax - inputMin)) * (outputMax - outputMin)
  );
}

function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value;
}

function mix(a: number, b: number, amount: number) {
  return a * (1 - amount) + b * amount;
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function randomInt(min: number, max = 0) {
  let low = min;
  let high = max;

  if (low > high) {
    [low, high] = [high, low];
  }

  return Math.floor(low + Math.random() * (high - low + 1));
}

const noise2D = (() => {
  const size = 256;
  const randomValues = new Array<number>(size);
  const permutations = new Array<number>(512);

  for (let index = 0; index < size; index += 1) {
    randomValues[index] = Math.random();
    permutations[index] = index;
  }

  for (let index = 0; index < size; index += 1) {
    const randomIndex = Math.floor(Math.random() * size);
    [permutations[index], permutations[randomIndex]] = [
      permutations[randomIndex],
      permutations[index],
    ];
    permutations[index + size] = permutations[index];
  }

  return (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const left = ix % size;
    const right = (left + 1) % size;
    const top = iy % size;
    const bottom = (top + 1) % size;
    const topLeft = randomValues[permutations[permutations[left] + top]];
    const topRight = randomValues[permutations[permutations[right] + top]];
    const bottomLeft = randomValues[permutations[permutations[left] + bottom]];
    const bottomRight = randomValues[permutations[permutations[right] + bottom]];
    const sx = smoothstep(0, 1, fx);
    const sy = smoothstep(0, 1, fy);
    const topMix = mix(topLeft, topRight, sx);
    const bottomMix = mix(bottomLeft, bottomRight, sx);

    return mix(topMix, bottomMix, sy);
  };
})();

function buildRowsFromField(field: number[], cols: number, rows: number): Row[] {
  const nextRows: Row[] = [];

  for (let y = 0; y < rows; y += 1) {
    const row: Row = [];
    let buffer = "";
    let currentWeight: 100 | 700 = 100;

    for (let x = 0; x < cols; x += 1) {
      const intensity = field[y * cols + x];
      let char = " ";
      let weight: 100 | 700 = 100;

      if (intensity !== 0) {
        char =
          CHARACTER_RAMP[clamp(intensity, 0, CHARACTER_RAMP.length - 1)] ?? " ";
        weight = intensity > 20 ? 700 : 100;
      }

      if (buffer.length === 0) {
        buffer = char;
        currentWeight = weight;
        continue;
      }

      if (weight !== currentWeight) {
        row.push({ text: buffer, weight: currentWeight });
        buffer = char;
        currentWeight = weight;
      } else {
        buffer += char;
      }
    }

    if (buffer.length > 0) {
      row.push({ text: buffer, weight: currentWeight });
    }

    nextRows.push(row);
  }

  return nextRows;
}

export default function AsciiHero() {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const preRef = useRef<HTMLPreElement | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    pressed: false,
  });
  const dataRef = useRef<number[]>([]);
  const [frame, setFrame] = useState(0);
  const [rowsData, setRowsData] = useState<Row[]>([]);
  const [size, setSize] = useState({ width: 1280, height: 900 });
  const [metrics, setMetrics] = useState({ cellWidth: 7.4, lineHeight: 14 });
  const [clicks, setClicks] = useState(0);
  const [drags, setDrags] = useState(0);
  const [longPress, setLongPress] = useState(0);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const clockLabelRef = useRef(formatTimestamp(new Date()));
  const nowLabel = useSyncExternalStore(
    (onStoreChange) => {
      const tick = () => {
        clockLabelRef.current = formatTimestamp(new Date());
        onStoreChange();
      };
      const interval = window.setInterval(tick, 1000);
      return () => window.clearInterval(interval);
    },
    () => clockLabelRef.current,
    () => formatTimestamp(new Date("2026-04-01T00:00:00Z")),
  );

  useEffect(() => {
    const panel = panelRef.current;

    if (!panel || !isClient) {
      return;
    }

    const updateSize = () => {
      const bounds = panel.getBoundingClientRect();

      setSize({
        width: Math.max(320, Math.floor(bounds.width)),
        height: Math.max(480, Math.floor(bounds.height)),
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(panel);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isClient]);

  useEffect(() => {
    const pre = preRef.current;

    if (!pre || !isClient) {
      return;
    }

    const style = window.getComputedStyle(pre);
    const measure = document.createElement("span");
    measure.textContent = "".padEnd(50, "X");
    pre.appendChild(measure);

    const cellWidth = measure.getBoundingClientRect().width / 50;
    const lineHeight = parseFloat(style.lineHeight);

    pre.removeChild(measure);

    if (Number.isFinite(cellWidth) && Number.isFinite(lineHeight)) {
      setMetrics({
        cellWidth,
        lineHeight,
      });
    }
  }, [isClient, size.height, size.width]);

  const cols = Math.max(120, Math.floor(size.width / metrics.cellWidth));
  const rows = Math.max(
    36,
    Math.ceil(size.height / metrics.lineHeight),
  );

  useEffect(() => {
    dataRef.current = new Array(cols * rows).fill(0);
    setRowsData(buildRowsFromField(dataRef.current, cols, rows));
  }, [cols, rows]);

  useEffect(() => {
    if (!isClient) {
      return;
    }

    const fps = 30;
    const interval = window.setInterval(() => {
      const next = dataRef.current.slice();
      const pointer = pointerRef.current;

      if (next.length !== cols * rows) {
        dataRef.current = new Array(cols * rows).fill(0);
        setRowsData(buildRowsFromField(dataRef.current, cols, rows));
        setFrame((value) => value + 1);
        return;
      }

      if (pointer.pressed) {
        const pointerCol = Math.floor(
          clamp((pointer.x / size.width) * cols, 0, cols - 1),
        );
        const pointerRow = Math.floor(
          clamp((pointer.y / size.height) * rows, 0, rows - 1),
        );
        next[pointerCol + pointerRow * cols] = randomInt(5, 50);
      } else {
        const time = performance.now();
        const bottomRow = cols * (rows - 1);
        const noiseTime = 0.0015 * time;

        for (let column = 0; column < cols; column += 1) {
          const value = Math.floor(
            mapValue(noise2D(0.05 * column, noiseTime), 0, 1, 4, 34),
          );
          next[bottomRow + column] = Math.min(value, next[bottomRow + column] + 1);
        }
      }

      for (let index = 0; index < next.length; index += 1) {
        const row = Math.floor(index / cols);
        const column = index % cols;
        const sidewaysIndex =
          row * cols + clamp(column + randomInt(-1, 1), 0, cols - 1);
        const belowIndex = Math.min(rows - 1, row + 1) * cols + column;

        next[sidewaysIndex] = Math.max(0, next[belowIndex] - randomInt(0, 1));
      }

      dataRef.current = next;
      setRowsData(buildRowsFromField(next, cols, rows));
      setFrame((value) => value + 1);
    }, 1000 / fps);

    return () => {
      window.clearInterval(interval);
    };
  }, [cols, rows, isClient, size.height, size.width]);

  useEffect(() => {
    return () => {
      if (pressTimerRef.current !== null) {
        window.clearTimeout(pressTimerRef.current);
      }
    };
  }, []);

  const userAgent = useMemo(() => {
    if (!isClient || typeof navigator === "undefined") {
      return "BROWSER";
    }

    if (navigator.userAgent.includes("Chrome")) {
      return "CHROME";
    }

    if (navigator.userAgent.includes("Safari")) {
      return "SAFARI";
    }

    if (navigator.userAgent.includes("Firefox")) {
      return "FIREFOX";
    }

    return "BROWSER";
  }, [isClient]);

  const platform = useMemo(() => {
    if (!isClient || typeof navigator === "undefined") {
      return "SYSTEM";
    }

    return navigator.platform.toUpperCase() || "SYSTEM";
  }, [isClient]);

  const updatePointerPosition = (
    event: ReactPointerEvent<HTMLDivElement>,
    pressed: boolean,
  ) => {
    const bounds = event.currentTarget.getBoundingClientRect();

    pointerRef.current = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      pressed,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    updatePointerPosition(event, true);

    pressTimerRef.current = window.setTimeout(() => {
      setLongPress((value) => value + 1);
      pressTimerRef.current = null;
    }, 450);
  };

  const handlePointerUp = () => {
    pointerRef.current.pressed = false;

    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
      setClicks((value) => value + 1);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    updatePointerPosition(event, event.buttons === 1);

    if (event.buttons === 1) {
      setDrags((value) => value + 1);
    }
  };

  // const infoLines = [
  //   nowLabel,
  //   `[${userAgent} 16.2.1]`,
  //   `[${platform}]`,
  //   `[${size.width}×${size.height}]`,
  //   `[LOCAL SESSION]`,
  //   "",
  //   `[CLICKS: ${clicks}]`,
  //   `[LONG PRESS: ${longPress}]`,
  //   `[DRAGS: ${drags}]`,
  //   "",
  //   "ONLINE NOW: 0",
  // ].join("\n");

  const infoLines = nowLabel;

  const scrollToManifesto = () => {
    document.getElementById("manifesto")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return (
    <main className="page-shell">
      <div className="hero-shell">
        <header className="ascii-header">
          <div className="ascii-header__grid">
            <div>Sudo Source Inc. </div>
            <div className="ascii-info">
              <div>{infoLines}</div>
              <FlipTextLine />
            </div>
            <div className="ascii-controls" aria-hidden="true">
              <span className="ascii-control">
                [<span>•</span>]
              </span>
              <span className="ascii-control">
                [<span>■</span>]
              </span>
            </div>
          </div>
        </header>

        <a
          href="#manifesto"
          className="learn-more"
          onClick={(event) => {
            event.preventDefault();
            scrollToManifesto();
          }}
        >
          Learn More
          <span className="learn-more__arrow" aria-hidden="true">
            ↓
          </span>
        </a>

        <section className="ascii-stage">
          <article
            ref={panelRef}
            className="ascii-panel"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerMove={handlePointerMove}
          >
            <pre
              ref={preRef}
              className="ascii-pre"
              aria-label="Animated ASCII Desource hero"
            >
              {rowsData.map((row, rowIndex) => (
                <span key={`${frame}-${rowIndex}`} className="ascii-row">
                  {row.map((segment, segmentIndex) => (
                    <span
                      key={`${frame}-${rowIndex}-${segmentIndex}`}
                      style={{ fontWeight: segment.weight }}
                    >
                      {segment.text}
                    </span>
                  ))}
                </span>
              ))}
            </pre>
          </article>
        </section>
      </div>

      <ManifestoSection />

      <SiteFooter />
    </main>
  );
}
