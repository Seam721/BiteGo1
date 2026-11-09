import { useEffect, useRef, useState } from "react";
import { MenuItem, Restaurant } from "../data";

/* ───────────── Restaurant card ───────────── */

const badgeColor = (badge: string) =>
  badge === "Free Delivery"
    ? "bg-green-500"
    : badge === "New"
    ? "bg-purple-500"
    : badge === "Fast"
    ? "bg-blue-500"
    : "bg-[var(--primary)]";

interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick: () => void;
  className?: string;
}

export function RestaurantCard({ restaurant: r, onClick, className = "" }: RestaurantCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group bg-white rounded-3xl overflow-hidden text-left card-hover shadow-sm border border-[var(--border)] ${className}`}
    >
      <div className="relative h-48 bg-[var(--muted)] img-zoom">
        <img src={r.image} alt={r.name} loading="lazy" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
        {r.badge && (
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-white text-xs font-bold shadow ${badgeColor(r.badge)}`}>
            {r.badge}
          </div>
        )}
        <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-xs font-semibold text-[var(--foreground)]">
          {r.deliveryFee === 0 ? (
            <span className="text-green-600">Free delivery</span>
          ) : (
            <span>${r.deliveryFee.toFixed(2)} delivery</span>
          )}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-bold text-base text-[var(--foreground)] truncate">{r.name}</h3>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5 truncate">{r.cuisine}</p>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-center gap-1 bg-amber-50 rounded-lg px-2 py-0.5">
              <span className="text-amber-400 text-xs">★</span>
              <span className="text-xs font-bold text-amber-700">{r.rating}</span>
            </div>
            <span className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{r.reviews.toLocaleString()} reviews</span>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)] text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {r.deliveryTime} min
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            {r.distance}
          </span>
          <span className="ml-auto font-semibold text-[var(--foreground)]/70 group-hover:text-[var(--primary)] transition-colors flex items-center gap-1">
            View menu
            <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </button>
  );
}

/* ───────────── Dish card ───────────── */

interface DishCardProps {
  dish: MenuItem;
  restaurantName?: string;
  onOpen: () => void;
  onAdd: () => void;
  className?: string;
}

export function DishCard({ dish, restaurantName, onOpen, onAdd, className = "" }: DishCardProps) {
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd();
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`group bg-white rounded-3xl overflow-hidden card-hover shadow-sm border border-[var(--border)] cursor-pointer text-left ${className}`}
    >
      <div className="relative h-40 bg-[var(--muted)] img-zoom">
        <img src={dish.image} alt={dish.name} loading="lazy" className="w-full h-full object-cover" />
        {dish.spicy && (
          <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-white/95 flex items-center justify-center text-sm shadow">🌶️</div>
        )}
        {dish.popular && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-wide shadow">
            Popular
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-sm text-[var(--foreground)] line-clamp-2 min-h-[2.5rem]">{dish.name}</h3>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{restaurantName}</p>
        <div className="flex items-center justify-between mt-3">
          <div>
            <span className="font-extrabold text-[var(--primary)] text-lg">${dish.price.toFixed(2)}</span>
            <span className="text-xs text-[var(--muted-foreground)] ml-2">★ {dish.rating}</span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            aria-label={`Add ${dish.name} to cart`}
            className={`w-9 h-9 rounded-xl text-white flex items-center justify-center font-bold transition-all duration-300 ${
              added ? "bg-green-500 scale-110" : "bg-[var(--primary)] hover:scale-110 hover:shadow-[var(--shadow-brand)]"
            }`}
          >
            {added ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="text-lg leading-none">+</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Skeleton loaders ───────────── */

export function RestaurantSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-3xl overflow-hidden border border-[var(--border)] ${className}`} aria-hidden="true">
      <div className="h-48 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-2/3 rounded-md skeleton" />
        <div className="h-3 w-1/3 rounded-md skeleton" />
        <div className="h-px bg-[var(--border)]" />
        <div className="h-3 w-full rounded-md skeleton" />
      </div>
    </div>
  );
}

export function DishSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-3xl overflow-hidden border border-[var(--border)] ${className}`} aria-hidden="true">
      <div className="h-40 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-4/5 rounded-md skeleton" />
        <div className="h-3 w-1/2 rounded-md skeleton" />
        <div className="h-8 w-full rounded-md skeleton" />
      </div>
    </div>
  );
}
