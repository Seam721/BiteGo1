import { Page } from "../data";

interface Props {
  navigate: (page: Page, data?: unknown) => void;
}

const payments = ["ABA", "ACLEDA", "WING", "Cash"];

export default function Footer({ navigate }: Props) {
  const links: { label: string; page: Page }[] = [
    { label: "Home", page: "home" },
    { label: "Restaurants", page: "restaurants" },
    { label: "Track an order", page: "tracking" },
    { label: "My profile", page: "profile" },
  ];

  return (
    <footer className="relative bg-[#161211] text-white/60 overflow-hidden pb-24 md:pb-0">
      <div className="absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[var(--primary)]/10 blur-3xl pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-14 pb-8">
        <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
          <div>
            <button type="button" onClick={() => navigate("home")} className="flex items-center gap-2.5" aria-label="BiteGo home">
              <img src="/brand/bitego-mark.svg" alt="" width={40} height={40} className="rounded-xl" />
              <span className="text-2xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Bite<span className="text-[var(--primary)]">Go</span>
              </span>
            </button>
            <p className="mt-4 text-sm leading-relaxed max-w-sm">
              Authentic Cambodian food from the city&apos;s favorite kitchens, delivered fresh to your door.
            </p>
            <p className="mt-5 flex items-center gap-2 text-sm text-white/70">
              <svg className="w-4 h-4 text-[var(--primary)]" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Phnom Penh, Cambodia
            </p>
          </div>

          <div>
            <p className="text-white font-bold text-sm mb-4">Explore</p>
            <ul className="space-y-2.5 text-sm">
              {links.map((l) => (
                <li key={l.label}>
                  <button
                    type="button"
                    onClick={() => navigate(l.page)}
                    className="hover:text-white hover:translate-x-1 transition-all inline-block"
                  >
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-white font-bold text-sm mb-4">Ways to pay</p>
            <div className="flex flex-wrap gap-2">
              {payments.map((p) => (
                <span key={p} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-white/80">
                  {p}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-white/45">Scan a KHQR code with your bank app, or pay cash on delivery.</p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/35">
          <p>© {new Date().getFullYear()} BiteGo. All rights reserved.</p>
          <p>Made with ♥ in Phnom Penh</p>
        </div>
      </div>
    </footer>
  );
}
