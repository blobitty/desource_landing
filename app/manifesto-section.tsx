"use client";

import { useEffect, useRef, useState } from "react";

// const COLUMNS = [
//   "I believe in the seamless fusion of form and function to convey each brand's unique story. Every surface, line, and motion should earn its place in the system.",
//   "Clarity comes from restraint. We build interfaces and narratives that respect attention—calm typography, honest hierarchy, and rhythm that holds up over time.",
//   "This work is iterative by design. We prototype, measure, and refine until the experience feels inevitable: simple enough to trust, rich enough to remember.",
// ] as const;


const COLUMNS = [
  "Sudo Source Inc. is a technology company committed to making cutting-edge tools accessible to everyone, so the world can be shaped by the many rather than the few.",
  "As the internet expands and grows smarter with AI, we seek to harness its potential to improve human cognition and connectivity in an increasingly complex world.",
  "We’re building simulated environments to improving the social coordination between people and agents. If our work interests you, please reach out to b@sudosrc.com.",
] as const;
export default function ManifestoSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
 
  useEffect(() => {
    const el = sectionRef.current;

    if (!el) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      {
        /* Inflate root so “in view” (and full opacity) lasts longer while scrolling */
        rootMargin: "12% 0px 22% 0px",
        threshold: 0,
      },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  const rootClassName = visible
    ? "manifesto-section manifesto-section--visible"
    : "manifesto-section";

  const content = (
    <section
      id="manifesto"
      ref={sectionRef}
      className={rootClassName}
      aria-label="About"
    >
      <div className="manifesto-section__inner">
        {COLUMNS.map((text, index) => (
          <p key={index} className="manifesto-section__col">
            {text}
          </p>
        ))}
      </div>
    </section>
  );

  return content;
}
