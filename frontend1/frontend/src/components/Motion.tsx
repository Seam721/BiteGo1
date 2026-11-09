import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────────────────────
   Small, dependency-free motion toolkit used across the storefront.
   Everything respects `prefers-reduced-motion`.
   ───────────────────────────────────────────────────────────── */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** True once the element has entered the viewport (fires once). */
export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/* ───────────── Reveal on scroll ───────────── */

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: "up" | "left" | "right" | "zoom";
}

export function Reveal({ children, className = "", delay = 0, variant = "up" }: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>(0.1);
  return (
    <div
      ref={ref}
      className={`reveal reveal-${variant} ${inView ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

/* ───────────── Count-up number ───────────── */

interface CountUpProps {
  end: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function CountUp({ end, decimals = 0, prefix = "", suffix = "", duration = 1400, className }: CountUpProps) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(end);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(end * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, end, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

/* ───────────── Sliding carousel with arrow controls ───────────── */

interface CarouselProps {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  ariaLabel?: string;
}

const chevron = (dir: "left" | "right") => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d={dir === "left" ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"}
    />
  </svg>
);

export function Carousel({ eyebrow, title, action, children, ariaLabel }: CarouselProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const update = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = rowRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  // Re-measure after content changes (e.g. data finished loading).
  useEffect(() => {
    update();
  });

  const scrollBy = (dir: 1 | -1) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(280, el.clientWidth * 0.8), behavior: "smooth" });
  };

  const arrowClass = (enabled: boolean) =>
    `w-10 h-10 rounded-full border flex items-center justify-center transition-all duration-200 ${
      enabled
        ? "bg-white border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-white hover:scale-105 shadow-sm"
        : "bg-[var(--muted)] border-transparent text-[var(--muted-foreground)]/40 cursor-not-allowed"
    }`;

  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          {eyebrow && (
            <p className="text-xs font-bold tracking-[0.14em] uppercase text-[var(--primary)] mb-1.5">{eyebrow}</p>
          )}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)]">{title}</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {action}
          <div className="hidden sm:flex items-center gap-2">
            <button type="button" onClick={() => scrollBy(-1)} disabled={!canPrev} className={arrowClass(canPrev)} aria-label="Previous">
              {chevron("left")}
            </button>
            <button type="button" onClick={() => scrollBy(1)} disabled={!canNext} className={arrowClass(canNext)} aria-label="Next">
              {chevron("right")}
            </button>
          </div>
        </div>
      </div>
      <div ref={rowRef} className="scroll-row" role="region" aria-label={ariaLabel ?? title}>
        {children}
      </div>
    </div>
  );
}

/* ───────────── Back-to-top floating button ───────────── */

export function ScrollTopButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className={`fixed right-4 bottom-24 md:bottom-6 z-40 w-11 h-11 rounded-full bg-[var(--ink)] text-white shadow-lg flex items-center justify-center transition-all duration-300 hover:bg-[var(--primary)] ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}
