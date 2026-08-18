"use client";

type FlipSegment = {
  from: string;
  to: string;
};

const WORDS: FlipSegment[] = [
  { from: "Project", to: "Coming" },
  { from: "Deemo", to: "Soon " },
];

function toDisplayChar(char: string) {
  return char === " " ? "\u00A0" : char;
}

type FlipTextLineProps = {
  className?: string;
};

export default function FlipTextLine({ className }: FlipTextLineProps) {
  let charIndex = 0;

  const renderWord = (segment: FlipSegment, segmentIndex: number) => {
    const fromChars = segment.from.split("");
    const toChars = segment.to.padEnd(fromChars.length, " ").split("");

    return fromChars.map((char, index) => {
      const delayIndex = charIndex++;

      return (
        <span
          key={`${segmentIndex}-${index}`}
          className="flip-text-line__char"
          style={{ transitionDelay: `${delayIndex * 40}ms` }}
        >
          <span className="flip-text-line__inner">
            <span className="flip-text-line__face flip-text-line__face--front">
              {toDisplayChar(char)}
            </span>
            <span className="flip-text-line__face flip-text-line__face--back">
              {toDisplayChar(toChars[index] ?? " ")}
            </span>
          </span>
        </span>
      );
    });
  };

  return (
    <span
      className={`flip-text-line${className ? ` ${className}` : ""}`}
      aria-label="Project Deemo, coming soon"
    >
      [
      {renderWord(WORDS[0], 0)}
      {" "}
      {renderWord(WORDS[1], 1)}
      ]
    </span>
  );
}
