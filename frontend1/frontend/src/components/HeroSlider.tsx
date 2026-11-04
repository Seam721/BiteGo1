import { useCallback, useRef, useState } from "react";
import { Page } from "../data";
import { usePrefersReducedMotion } from "./Motion";

interface Slide {
  image: string;
  eyebrow: string;
  title: [string, string, string];
  text: string;
  cta: string;
  page: Page;
}

const slides: Slide[] = [
  {
    image: "https://images.unsplash.com/photo-1559847844-5315695dadae?w=1920&h=1080&fit=crop&auto=format",
    eyebrow: "Authentic Cambodian cuisine",
    title: ["Authentic Khmer", "flavors delivered", "to your door"],
    text: "From Fish Amok to Loc Lac — Cambodia's best restaurants, a few taps away.",
    cta: "Order now",
    page: "restaurants",
  },
  {
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&h=1080&fit=crop&auto=format",
    eyebrow: "Fresh from the kitchen",
    title: ["Hot meals from", "local kitchens,", "tracked live"],
    text: "Follow your order from the restaurant to your doorstep in real time.",
    cta: "Explore restaurants",
    page: "restaurants",
  },
  {
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1920&h=1080&fit=crop&auto=format",
    eyebrow: "Street-food favorites",
    title: ["Noodles, BBQ", "and soups you", "can't resist"],
    text: "Phnom Penh's street-food legends, now only a few minutes away.",
    cta: "Browse the menu",
    page: "restaurants",
  },
  {
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&h=1080&fit=crop&auto=format",
    eyebrow: "Pay your way",
    title: ["Scan with KHQR", "or pay with cash", "on delivery"],
    text: "ABA, ACLEDA and WING supported — pick what works best for you.",
    cta: "Start an order",
    page: "restaurants",
  },
];

interface Props {
  navigate: (page: Page, data?: unknown) => void;
}

export default function HeroSlider({ navigate }: Props) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (next: number, direction: 1 | -1) => {
      const n = ((next % slides.length) + slides.length) % slides.length;
      if (n === index) return;
      setPrev(index);
      setDir(direction);
      setIndex(n);
    },
    [index]
  );

  const next = useCallback(() => go(index + 1, 1), [go, index]);
  const back = useCallback(() => go(index - 1, -1), [go, index]);

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) (dx < 0 ? next : back)();
  };

  const transformFor = (i: number) => {
    if (i === index) return "translate3d(0,0,0)";
    // The slide that just left exits opposite to the travel direction.
    if (i === prev) return `translate3d(${dir > 0 ? "-100%" : "100%"},0,0)`;
    // Everything else waits off-screen on the side it will arrive from:
    // the slide before the active one on the left, all others on the right.
    const offset = (i - index + slides.length) % slides.length;
    return offset === slides.length - 1 ? "translate3d(-100%,0,0)" : "translate3d(100%,0,0)";
  };

  return (
    <section
      className="relative overflow-hidden bg-[var(--ink)] text-white h-[calc(100svh-4rem)] min-h-[560px] max-h-[760px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        onTouchEnd(e);
        setPaused(false);
      }}
      aria-roledescription="carousel"
      aria-label="Featured highlights"
    >
      {slides.map((s, i) => {
        const active = i === index;
        const moving = active || i === prev;
        return (
          <div
            key={s.eyebrow}
            className={`hero-slide ${active ? "is-active" : ""} ${moving ? "is-moving" : ""}`}
            style={{ transform: transformFor(i), zIndex: active ? 2 : i === prev ? 1 : 0 }}
            aria-hidden={!active}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${slides.length}`}
          >
            <img
              src={s.image}
              alt=""
              className="hero-img absolute inset-0 w-full h-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#120e0d]/90 via-[#120e0d]/55 to-[#120e0d]/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#120e0d]/70 via-transparent to-transparent" />

            <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center">
              <div className="hero-text max-w-2xl pb-16">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 text-white/90 text-xs font-semibold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse-ring" />
                  {s.eyebrow}
                </div>
                <h1 className="mt-5 text-4xl sm:text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
                  {s.title[0]}
                  <br />
                  <span className="text-gradient">{s.title[1]}</span>
                  <br />
                  {s.title[2]}
                </h1>
                <p className="mt-5 text-base sm:text-lg text-white/70 max-w-lg leading-relaxed">{s.text}</p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    tabIndex={active ? 0 : -1}
                    onClick={() => navigate(s.page)}
                    className="btn-primary px-7 py-3.5 rounded-2xl font-bold text-sm sm:text-base inline-flex items-center gap-2"
                  >
                    {s.cta}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5-5 5M6 12h12" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    tabIndex={active ? 0 : -1}
                    onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                    className="px-6 py-3.5 rounded-2xl font-semibold text-sm sm:text-base text-white bg-white/10 border border-white/20 backdrop-blur hover:bg-white/20 transition-colors"
                  >
                    How it works
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Controls */}
      <div className="absolute z-10 left-0 right-0 bottom-10 sm:bottom-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-2.5 flex-1 max-w-xs" role="tablist" aria-label="Choose slide">
            {slides.map((s, i) => (
              <button
                key={s.eyebrow}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => go(i, i === (index - 1 + slides.length) % slides.length ? -1 : 1)}
                className="relative h-6 flex-1 flex items-center group"
              >
                <span className="block w-full h-[3px] rounded-full bg-white/25 overflow-hidden">
                  <span
                    key={i === index ? `run-${index}` : `idle-${i}`}
                    className={`hero-progress block h-full w-full bg-white origin-left ${
                      i === index ? (reduced ? "is-done" : "is-running") : i < index ? "is-done" : ""
                    }`}
                    style={i === index && paused ? { animationPlayState: "paused" } : undefined}
                    onAnimationEnd={i === index && !reduced ? next : undefined}
                  />
                </span>
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-4">
            <span className="text-sm font-semibold tabular-nums text-white/70">
              <span className="text-white">{String(index + 1).padStart(2, "0")}</span> / {String(slides.length).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={back}
                aria-label="Previous slide"
                className="w-11 h-11 rounded-full bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center hover:bg-white hover:text-[var(--ink)] transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next slide"
                className="w-11 h-11 rounded-full bg-white/10 border border-white/20 backdrop-blur flex items-center justify-center hover:bg-white hover:text-[var(--ink)] transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
