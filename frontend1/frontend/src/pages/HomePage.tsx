import { useEffect, useMemo, useRef, useState } from "react";
import { categories, restaurants as staticRestaurants, menuItems as staticMenuItems, Page, MenuItem, Restaurant } from "../data";
import HeroSlider from "../components/HeroSlider";
import { Carousel, CountUp, Reveal } from "../components/Motion";
import { DishCard, DishSkeleton, RestaurantCard, RestaurantSkeleton } from "../components/Cards";

interface Props {
  navigate: (page: Page, data?: unknown) => void;
  onAddToCart: (item: MenuItem) => void;
  restaurants?: Restaurant[];
  menuItems?: MenuItem[];
}

const steps = [
  {
    title: "Choose your meal",
    text: "Browse local kitchens and pick your favorite Khmer dishes.",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  },
  {
    title: "Pay your way",
    text: "Scan a KHQR code with ABA, ACLEDA or WING — or pay cash on delivery.",
    icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z",
  },
  {
    title: "Track it live",
    text: "Watch your order move from the kitchen to your door in real time.",
    icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  },
];

export default function HomePage({ navigate, onAddToCart, restaurants = staticRestaurants, menuItems = staticMenuItems }: Props) {
  const loading = restaurants.length === 0;

  const popularDishes = useMemo(() => {
    const popular = menuItems.filter((m) => m.popular);
    return (popular.length >= 4 ? popular : menuItems).slice(0, 10);
  }, [menuItems]);

  const topRestaurants = useMemo(
    () => [...restaurants].sort((a, b) => b.rating - a.rating).slice(0, 8),
    [restaurants]
  );

  // Only pre-filter by a category when at least one restaurant matches it,
  // otherwise the customer would land on an empty list.
  const categoryHasMatch = (name: string) => {
    const q = name.toLowerCase();
    return restaurants.some(
      (r) => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || (r.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  };

  const freeDelivery = useMemo(() => restaurants.filter((r) => r.deliveryFee === 0), [restaurants]);

  const stats = useMemo(() => {
    const avgRating = restaurants.length ? restaurants.reduce((s, r) => s + r.rating, 0) / restaurants.length : 0;
    const times = restaurants.map((r) => parseInt(String(r.deliveryTime), 10)).filter((n) => !Number.isNaN(n));
    return {
      restaurants: restaurants.length,
      dishes: menuItems.length,
      rating: avgRating,
      fastest: times.length ? Math.min(...times) : 0,
    };
  }, [restaurants, menuItems]);

  return (
    <div className="min-h-full">
      <HeroSlider navigate={navigate} />

      {/* Floating search panel */}
      <SearchPanel navigate={navigate} restaurants={restaurants} menuItems={menuItems} />

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10">
        <Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: "Restaurants", end: stats.restaurants, decimals: 0, suffix: "" },
              { label: "Dishes to explore", end: stats.dishes, decimals: 0, suffix: "" },
              { label: "Average rating", end: stats.rating, decimals: 1, suffix: " ★" },
              { label: "Fastest delivery", end: stats.fastest, decimals: 0, suffix: " min" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-[var(--border)] px-5 py-4 shadow-sm">
                <div className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tabular-nums">
                  <CountUp end={s.end} decimals={s.decimals} suffix={s.suffix} />
                </div>
                <div className="text-xs sm:text-sm text-[var(--muted-foreground)] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-14">
        <Reveal>
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] uppercase text-[var(--primary)] mb-1.5">What are you craving?</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)]">Browse by category</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("restaurants")}
              className="text-sm font-semibold text-[var(--primary)] hover:underline underline-offset-4"
            >
              See all
            </button>
          </div>
        </Reveal>
        <div className="scroll-row !gap-3 sm:!gap-4">
          {categories.map((cat, i) => (
            <Reveal key={cat.id} delay={i * 60} variant="zoom" className="shrink-0">
              <button
                type="button"
                onClick={() => navigate("restaurants", categoryHasMatch(cat.name) ? { search: cat.name } : undefined)}
                className="group w-28 sm:w-32 flex flex-col items-center gap-3 p-4 rounded-3xl border border-transparent hover:border-white hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300"
                style={{ background: cat.color }}
              >
                <span className="text-3xl sm:text-4xl transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-6">{cat.emoji}</span>
                <span className="text-xs sm:text-sm font-bold text-[var(--foreground)]">{cat.name}</span>
              </button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Featured restaurants */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
        <Reveal>
          <Carousel
            eyebrow="Top picks"
            title="Featured restaurants"
            action={
              <button
                type="button"
                onClick={() => navigate("restaurants")}
                className="text-sm font-semibold text-[var(--primary)] hover:underline underline-offset-4"
              >
                View all
              </button>
            }
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <RestaurantSkeleton key={i} className="w-[82vw] sm:w-[340px]" />)
              : topRestaurants.map((r) => (
                  <RestaurantCard
                    key={r.id}
                    restaurant={r}
                    onClick={() => navigate("restaurant-detail", r)}
                    className="w-[82vw] sm:w-[340px]"
                  />
                ))}
          </Carousel>
        </Reveal>
      </section>

      {/* Promo banner */}
      {freeDelivery.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
          <Reveal variant="zoom">
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#E84A2F] via-[#EE5A32] to-[#F97316] text-white px-6 sm:px-12 py-10 sm:py-14">
              <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/10" />
              <div className="absolute right-24 -bottom-24 w-72 h-72 rounded-full bg-white/10" />
              <div className="relative grid md:grid-cols-[1.3fr_1fr] gap-8 items-center">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] uppercase text-white/80">Free delivery</p>
                  <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold leading-tight">
                    Skip the delivery fee at {freeDelivery.length} {freeDelivery.length === 1 ? "restaurant" : "restaurants"}
                  </h2>
                  <p className="mt-3 text-white/85 max-w-md">
                    {freeDelivery
                      .slice(0, 3)
                      .map((r) => r.name)
                      .join(", ")}
                    {freeDelivery.length > 3 ? " and more" : ""} — order today and keep more of your money for dessert.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("restaurants", { filter: "Free Delivery" })}
                    className="mt-6 px-6 py-3 rounded-2xl bg-white text-[var(--primary)] font-bold text-sm hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  >
                    See free-delivery spots
                  </button>
                </div>
                <div className="hidden md:flex justify-end -space-x-6">
                  {freeDelivery.slice(0, 3).map((r, i) => (
                    <img
                      key={r.id}
                      src={r.image}
                      alt=""
                      loading="lazy"
                      className="animate-floaty w-36 h-36 rounded-3xl object-cover border-4 border-white/90 shadow-2xl"
                      style={{ animationDelay: `${i * 0.6}s`, transform: `rotate(${(i - 1) * 6}deg)` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* Trending dishes */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-16">
        <Reveal>
          <Carousel eyebrow="Customer favorites" title="Trending dishes">
            {menuItems.length === 0
              ? Array.from({ length: 5 }).map((_, i) => <DishSkeleton key={i} className="w-[64vw] sm:w-[250px]" />)
              : popularDishes.map((dish) => (
                  <DishCard
                    key={dish.id}
                    dish={dish}
                    restaurantName={restaurants.find((r) => r.id === dish.restaurantId)?.name}
                    onOpen={() => navigate("food-detail", dish)}
                    onAdd={() => onAddToCart(dish)}
                    className="w-[64vw] sm:w-[250px]"
                  />
                ))}
          </Carousel>
        </Reveal>
      </section>

      {/* Kitchen marquee */}
      {restaurants.length > 0 && (
        <section className="pt-16" aria-label="Kitchens on BiteGo">
          <div className="marquee overflow-hidden border-y border-[var(--border)] bg-white py-5">
            <div className="marquee-track">
              {[0, 1].map((dup) => (
                <div key={dup} className="flex items-center shrink-0" aria-hidden={dup === 1}>
                  {restaurants.map((r) => (
                    <span key={`${dup}-${r.id}`} className="flex items-center gap-8 pr-8 text-xl sm:text-2xl font-extrabold text-[var(--foreground)]/80 whitespace-nowrap" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {r.name}
                      <span className="text-[var(--primary)]">✦</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 pt-20 pb-20">
        <Reveal>
          <div className="text-center max-w-xl mx-auto">
            <p className="text-xs font-bold tracking-[0.14em] uppercase text-[var(--primary)] mb-1.5">Simple &amp; fast</p>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-[var(--foreground)]">How BiteGo works</h2>
            <p className="mt-3 text-[var(--muted-foreground)]">From craving to doorstep in three easy steps.</p>
          </div>
        </Reveal>
        <div className="relative mt-12 grid md:grid-cols-3 gap-6">
          <div className="hidden md:block absolute top-9 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-[var(--primary)]/0 via-[var(--primary)]/40 to-[var(--primary)]/0" />
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 140}>
              <div className="relative bg-white rounded-3xl border border-[var(--border)] p-7 text-center shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full">
                <div className="relative mx-auto w-[72px] h-[72px] rounded-2xl bg-[var(--secondary)] text-[var(--primary)] flex items-center justify-center">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={s.icon} />
                  </svg>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[var(--primary)] text-white text-xs font-extrabold flex items-center justify-center shadow">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-[var(--foreground)]">{s.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-14">
          <div className="rounded-[2rem] bg-[var(--ink)] text-white px-6 sm:px-12 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold">Hungry? Your next favorite meal is waiting.</h3>
              <p className="mt-2 text-white/60">Pick a restaurant and your order is on its way in minutes.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("restaurants")}
              className="btn-primary shrink-0 px-8 py-4 rounded-2xl font-bold"
            >
              Order now
            </button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

/* ───────────── Floating search with live suggestions ───────────── */

function SearchPanel({
  navigate,
  restaurants,
  menuItems,
}: {
  navigate: (page: Page, data?: unknown) => void;
  restaurants: Restaurant[];
  menuItems: MenuItem[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const q = query.trim().toLowerCase();
  const matchedRestaurants = q
    ? restaurants
        .filter((r) => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q) || (r.tags ?? []).some((t) => t.toLowerCase().includes(q)))
        .slice(0, 3)
    : [];
  const matchedDishes = q ? menuItems.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 4) : [];
  const hasResults = matchedRestaurants.length + matchedDishes.length > 0;

  const submit = () => {
    setOpen(false);
    navigate("restaurants", query.trim() ? { search: query.trim() } : undefined);
  };

  return (
    <div className="relative z-20 max-w-3xl mx-auto px-4 sm:px-6 -mt-9">
      <Reveal>
        <div ref={wrapRef} className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex gap-2 p-2 bg-white rounded-3xl shadow-[var(--shadow-lg)] border border-[var(--border)]"
          >
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                placeholder="Search dishes or restaurants..."
                aria-label="Search dishes or restaurants"
                className="w-full h-12 pl-12 pr-4 rounded-2xl bg-transparent text-[var(--foreground)] placeholder-[var(--muted-foreground)] text-sm sm:text-base focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-primary h-12 px-6 rounded-2xl font-bold text-sm whitespace-nowrap">
              Find food
            </button>
          </form>

          {open && q && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-3xl border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden animate-fade-up">
              {!hasResults ? (
                <p className="px-5 py-6 text-sm text-center text-[var(--muted-foreground)]">No matches for &ldquo;{query.trim()}&rdquo;</p>
              ) : (
                <div className="max-h-80 overflow-y-auto py-2">
                  {matchedRestaurants.length > 0 && (
                    <p className="px-5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Restaurants</p>
                  )}
                  {matchedRestaurants.map((r) => (
                    <button
                      key={`r-${r.id}`}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate("restaurant-detail", r);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-[var(--muted)] transition-colors"
                    >
                      <img src={r.image} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[var(--foreground)] truncate">{r.name}</span>
                        <span className="block text-xs text-[var(--muted-foreground)] truncate">{r.cuisine}</span>
                      </span>
                    </button>
                  ))}
                  {matchedDishes.length > 0 && (
                    <p className="px-5 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Dishes</p>
                  )}
                  {matchedDishes.map((d) => (
                    <button
                      key={`d-${d.id}`}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        navigate("food-detail", d);
                      }}
                      className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-[var(--muted)] transition-colors"
                    >
                      <img src={d.image} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-[var(--foreground)] truncate">{d.name}</span>
                        <span className="block text-xs text-[var(--muted-foreground)] truncate">{restaurants.find((r) => r.id === d.restaurantId)?.name}</span>
                      </span>
                      <span className="text-sm font-bold text-[var(--primary)]">${d.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Reveal>
    </div>
  );
}
