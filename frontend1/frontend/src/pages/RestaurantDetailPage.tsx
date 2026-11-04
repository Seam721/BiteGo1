import { useEffect, useRef, useState } from "react";
import { Restaurant, menuItems as staticMenuItems, MenuItem, Page } from "../data";

interface Props {
  restaurant: Restaurant;
  navigate: (page: Page, data?: unknown) => void;
  onAddToCart: (item: MenuItem) => void;
  menuItems?: MenuItem[];
}

export default function RestaurantDetailPage({ restaurant, navigate, onAddToCart, menuItems = staticMenuItems }: Props) {
  const items = menuItems.filter((m) => m.restaurantId === restaurant.id);
  const categories = [...new Set(items.map((m) => m.category))];
  const [activeCategory, setActiveCategory] = useState(categories[0] || "All");
  const [added, setAdded] = useState<number[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const filtered = items.filter((m) => m.category === activeCategory);

  const handleAdd = (item: MenuItem) => {
    onAddToCart(item);
    setAdded((prev) => [...prev, item.id]);
    const t = window.setTimeout(() => setAdded((prev) => prev.filter((id) => id !== item.id)), 1500);
    timers.current.push(t);
  };

  const infoItems = [
    {
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      label: "Delivery",
      value: `${restaurant.deliveryTime} min`,
    },
    {
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      label: "Delivery fee",
      value: restaurant.deliveryFee === 0 ? "Free" : `$${restaurant.deliveryFee.toFixed(2)}`,
    },
    {
      icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
      label: "Minimum order",
      value: `$${restaurant.minOrder.toFixed(2)}`,
    },
    {
      icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z",
      label: "Distance",
      value: restaurant.distance,
    },
  ];

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="relative h-64 sm:h-80 bg-[var(--ink)] overflow-hidden">
        <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" style={{ animation: "kenburns 1.4s var(--ease-out) both" }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/10" />
        <button
          type="button"
          onClick={() => navigate("restaurants")}
          aria-label="Back to restaurants"
          className="absolute top-4 left-4 w-10 h-10 rounded-xl bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white hover:scale-105 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
            {restaurant.badge && (
              <span className="inline-block mb-3 px-3 py-1 rounded-full bg-[var(--primary)] text-white text-xs font-bold animate-fade-up">{restaurant.badge}</span>
            )}
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white animate-fade-up stagger-1">{restaurant.name}</h1>
            <p className="text-white/75 text-sm sm:text-base mt-2 animate-fade-up stagger-2">
              {restaurant.cuisine}
              {(restaurant.tags ?? []).length > 0 && ` · ${(restaurant.tags ?? []).join(" · ")}`}
            </p>
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="bg-white border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-2 lg:grid-cols-5 gap-4 items-center">
          <div className="flex items-center gap-3 col-span-2 lg:col-span-1">
            <div className="flex items-center gap-1.5 bg-amber-50 rounded-xl px-3 py-2">
              <span className="text-amber-400">★</span>
              <span className="font-extrabold text-amber-700">{restaurant.rating}</span>
            </div>
            <span className="text-sm text-[var(--muted-foreground)]">{restaurant.reviews.toLocaleString()} reviews</span>
          </div>
          {infoItems.map((info) => (
            <div key={info.label} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--secondary)] text-[var(--primary)] flex items-center justify-center shrink-0">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={info.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">{info.label}</p>
                <p className={`text-sm font-bold ${info.label === "Delivery fee" && restaurant.deliveryFee === 0 ? "text-green-600" : "text-[var(--foreground)]"}`}>{info.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky category tabs */}
      <div className="sticky top-16 z-30 bg-[var(--background)]/90 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-brand)]"
                  : "bg-white border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[var(--muted-foreground)]">
            <div className="text-4xl mb-3">🍽️</div>
            <p>No items in this category</p>
          </div>
        ) : (
          <div key={activeCategory} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((item, i) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate("food-detail", item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate("food-detail", item);
                  }
                }}
                className="group flex gap-4 bg-white rounded-3xl p-4 cursor-pointer border border-[var(--border)] card-hover shadow-sm animate-fade-up"
                style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
              >
                <div className="relative shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl img-zoom bg-[var(--muted)]">
                  <img src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                  {item.popular && (
                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[var(--accent)] text-white text-[10px] font-bold uppercase tracking-wide shadow">
                      Popular
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-[var(--foreground)] truncate">{item.name}</h3>
                    {item.spicy && <span className="text-sm">🌶️</span>}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                  <div className="flex items-center justify-between mt-auto pt-3">
                    <div>
                      <span className="font-extrabold text-lg text-[var(--primary)]">${item.price.toFixed(2)}</span>
                      <span className="text-xs text-[var(--muted-foreground)] ml-2">★ {item.rating}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdd(item);
                      }}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                        added.includes(item.id)
                          ? "bg-green-500 text-white scale-105"
                          : "bg-[var(--primary)] text-white hover:shadow-[var(--shadow-brand)] hover:-translate-y-0.5"
                      }`}
                    >
                      {added.includes(item.id) ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          Added
                        </>
                      ) : (
                        <>+ Add</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
