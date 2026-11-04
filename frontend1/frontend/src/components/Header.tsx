
import { useCallback, useEffect, useState } from "react";
import { CartItem, Page } from "../data";
import { supabase } from "../lib/supabase";

interface HeaderProps {
  currentPage: Page;
  navigate: (page: Page) => void;
  cart: CartItem[];
  onCartOpen: () => void;
}

export default function Header({
  currentPage,
  navigate,
  cart,
  onCartOpen,
}: HeaderProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Elevate the header and show a reading-progress line while scrolling.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        setScrolled(window.scrollY > 8);
        setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const loadAvatar = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setAvatarUrl(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Could not load profile avatar:", error.message);
        return;
      }

      setAvatarUrl(data?.avatar_url ?? null);
    } catch (error) {
      console.error("Avatar loading failed:", error);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const refreshAvatar = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (!active) return;

        if (authError || !user) {
          setAvatarUrl(null);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        if (error) {
          console.error("Could not load profile avatar:", error.message);
          return;
        }

        setAvatarUrl(data?.avatar_url ?? null);
      } catch (error) {
        if (active) {
          console.error("Avatar loading failed:", error);
        }
      }
    };

    void refreshAvatar();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshAvatar();
    });

    const handleAvatarUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        avatarUrl: string | null;
      }>;

      setAvatarUrl(customEvent.detail.avatarUrl);
    };

    window.addEventListener(
      "foodie6:avatar-updated",
      handleAvatarUpdate
    );

    return () => {
      active = false;
      subscription.unsubscribe();

      window.removeEventListener(
        "foodie6:avatar-updated",
        handleAvatarUpdate
      );
    };
  }, []);

  const navLinks: { label: string; page: Page }[] = [
    { label: "Home", page: "home" },
    { label: "Restaurants", page: "restaurants" },
    { label: "Tracking", page: "tracking" },
    { label: "Profile", page: "profile" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 glass border-b transition-shadow duration-300 ${
        scrolled ? "border-[var(--border)] shadow-[0_6px_24px_rgba(28,25,23,0.08)]" : "border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <button
          type="button"
          onClick={() => navigate("home")}
          className="group flex items-center gap-2.5 shrink-0"
          aria-label="BiteGo home"
        >
          <img
            src="/brand/bitego-mark.svg"
            alt=""
            width={40}
            height={40}
            className="rounded-xl shadow-[var(--shadow-brand)] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105"
          />

          <span
            className="text-xl font-extrabold text-[var(--foreground)]"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Bite<span className="text-[var(--primary)]">Go</span>
          </span>
        </button>

        {/* Location */}
        <button
          type="button"
          className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--muted)] text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--border)] transition-colors"
          aria-label="Delivery location: Phnom Penh, Cambodia"
        >
          <svg
            className="w-3.5 h-3.5 text-[var(--primary)] shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
              clipRule="evenodd"
            />
          </svg>

          Phnom Penh, Cambodia
        </button>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {navLinks.map((link) => {
            const active = currentPage === link.page;
            return (
              <button
                key={link.page}
                type="button"
                onClick={() => navigate(link.page)}
                aria-current={active ? "page" : undefined}
                className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {link.label}
                <span
                  className={`absolute left-4 right-4 -bottom-0.5 h-0.5 rounded-full bg-[var(--primary)] origin-center transition-transform duration-300 ${
                    active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Cart and customer avatar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCartOpen}
            className="btn-primary relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold"
            aria-label={`Open cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>

            <span className="hidden sm:inline">Cart</span>

            {cartCount > 0 && (
              <span
                key={cartCount}
                className="animate-pop absolute -top-2 -right-2 min-w-5 h-5 px-1 bg-[var(--ink)] text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white"
              >
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("profile")}
            className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-[var(--primary)]/40 transition-all"
            aria-label="Open your profile"
          >
            {avatarUrl ? (
              <img
                key={avatarUrl}
                src={avatarUrl}
                alt="Your profile"
                className="w-full h-full object-cover"
                onError={() => setAvatarUrl(null)}
              />
            ) : (
              <svg
                className="w-5 h-5 text-[var(--muted-foreground)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Scroll progress line */}
      <div
        className="absolute left-0 bottom-[-1px] h-[2px] w-full origin-left bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-opacity duration-300"
        style={{ transform: `scaleX(${progress})`, opacity: scrolled ? 1 : 0 }}
        aria-hidden="true"
      />
    </header>
  );
}
