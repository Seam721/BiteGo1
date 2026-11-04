import { CartItem, Page } from "../data";
import type { ReactElement } from "react";

interface MobileNavProps {
  currentPage: Page;
  navigate: (page: Page) => void;
  cart: CartItem[];
  onCartOpen: () => void;
}

const icons: Record<string, ReactElement> = {
  home: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h4a1 1 0 001-1V10" />
    </svg>
  ),
  restaurants: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18M3 3c0 4 3 4 3 8s-3 4-3 8M9 3v6a3 3 0 003 3v0a3 3 0 003-3V3M12 12v9M18 3c-1.7 0-3 2-3 5s1.3 5 3 5V3zM18 13v8" />
    </svg>
  ),
  cart: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  tracking: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
};

export default function MobileNav({ currentPage, navigate, cart, onCartOpen }: MobileNavProps) {
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const items: { key: string; label: string; page?: Page; action?: () => void }[] = [
    { key: "home", label: "Home", page: "home" },
    { key: "restaurants", label: "Food", page: "restaurants" },
    { key: "cart", label: "Cart", action: onCartOpen },
    { key: "tracking", label: "Tracking", page: "tracking" },
    { key: "profile", label: "Profile", page: "profile" },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-[var(--border)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const isActive = item.page ? currentPage === item.page : false;
          return (
            <button
              key={item.key}
              onClick={() => (item.action ? item.action() : navigate(item.page as Page))}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors active:scale-95 ${
                isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
              }`}
            >
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-[var(--primary)] transition-all duration-300 ${
                  isActive ? "w-8 opacity-100" : "w-0 opacity-0"
                }`}
              />
              <span className={`transition-transform duration-300 ${isActive ? "-translate-y-0.5 scale-110" : ""}`}>{icons[item.key]}</span>
              {item.label}
              {item.key === "cart" && cartCount > 0 && (
                <span key={cartCount} className="animate-pop absolute top-1 right-[calc(50%-18px)] w-4 h-4 bg-[var(--accent)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
