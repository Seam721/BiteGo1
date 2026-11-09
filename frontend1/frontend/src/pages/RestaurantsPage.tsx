import { useState } from "react";
import { restaurants as staticRestaurants, Restaurant, Page } from "../data";
import { RestaurantCard, RestaurantSkeleton } from "../components/Cards";

interface Props {
  navigate: (page: Page, data?: unknown) => void;
  restaurants?: Restaurant[];
  /** Pre-filled search text (e.g. coming from the home page search). */
  initialSearch?: string;
  /** Pre-selected filter chip (e.g. coming from a home page category). */
  initialFilter?: string;
}

const sortOptions = ["Recommended", "Rating", "Delivery time", "Distance"];
const filterTags = ["All", "Cambodian", "Noodles", "BBQ", "Soups", "Desserts", "Free Delivery", "Top Rated"];

export default function RestaurantsPage({ navigate, restaurants = staticRestaurants, initialSearch, initialFilter }: Props) {
  const knownFilter = initialFilter && filterTags.includes(initialFilter) ? initialFilter : "All";
  const [sort, setSort] = useState("Recommended");
  const [activeFilter, setActiveFilter] = useState(knownFilter);
  // A category that has no dedicated chip falls back to a text search.
  const [search, setSearch] = useState(initialSearch ?? (initialFilter && knownFilter === "All" ? initialFilter : ""));

  const loading = restaurants.length === 0;

  const filtered = restaurants.filter((r) => {
    const q = search.toLowerCase();
    if (q && !r.name.toLowerCase().includes(q) && !r.cuisine.toLowerCase().includes(q) && !(r.tags ?? []).some((t) => t.toLowerCase().includes(q))) return false;
    if (activeFilter === "All") return true;
    if (activeFilter === "Free Delivery") return r.deliveryFee === 0;
    if (activeFilter === "Top Rated") return r.rating >= 4.7;
    return (r.tags ?? []).some((t) => t.toLowerCase().includes(activeFilter.toLowerCase()));
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "Rating") return b.rating - a.rating;
    if (sort === "Delivery time") return parseInt(a.deliveryTime) - parseInt(b.deliveryTime);
    if (sort === "Distance") return parseFloat(a.distance) - parseFloat(b.distance);
    return 0;
  });

  return (
    <div className="min-h-full">
      {/* Page banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1C1917] via-[#241d1b] to-[#3a1f19] text-white">
        <div className="absolute -right-20 -top-24 w-80 h-80 rounded-full bg-[var(--primary)]/25 blur-3xl" />
        <div className="absolute left-1/3 -bottom-32 w-72 h-72 rounded-full bg-[var(--accent)]/15 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <p className="text-xs font-bold tracking-[0.14em] uppercase text-[var(--accent)] animate-fade-up">Delivering in Phnom Penh</p>
          <h1 className="mt-2 text-3xl sm:text-5xl font-extrabold animate-fade-up stagger-1">Restaurants near you</h1>
          <p className="mt-3 text-white/60 text-sm sm:text-base animate-fade-up stagger-2">
            {loading ? "Loading the best kitchens in town…" : `${restaurants.length} restaurants ready to deliver`}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        {/* Search + sort bar */}
        <div className="-mt-6 relative z-10 flex flex-col sm:flex-row gap-3 p-2.5 bg-white rounded-3xl border border-[var(--border)] shadow-[var(--shadow-md)] animate-fade-up stagger-2">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search restaurants..."
              aria-label="Search restaurants"
              className="w-full h-11 pl-11 pr-10 rounded-2xl bg-[var(--muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 transition-shadow"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--primary)] hover:text-white transition-colors flex items-center justify-center text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort restaurants"
            className="h-11 px-4 rounded-2xl bg-[var(--muted)] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 cursor-pointer"
          >
            {sortOptions.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-5 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {filterTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveFilter(tag)}
              aria-pressed={activeFilter === tag}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                activeFilter === tag
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-brand)] scale-[1.03]"
                  : "bg-white border border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {!loading && (
          <p className="text-sm text-[var(--muted-foreground)] mb-4" aria-live="polite">
            Showing <span className="font-semibold text-[var(--foreground)]">{sorted.length}</span> of {restaurants.length} restaurants
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <RestaurantSkeleton key={i} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20 text-[var(--muted-foreground)] animate-fade-up">
            <div className="text-5xl mb-3 animate-floaty inline-block">🍽️</div>
            <p className="font-semibold text-[var(--foreground)]">No restaurants found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setActiveFilter("All");
              }}
              className="mt-5 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div key={`${activeFilter}-${sort}`} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sorted.map((r, i) => (
              <div key={r.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}>
                <RestaurantCard restaurant={r} onClick={() => navigate("restaurant-detail", r)} className="w-full h-full" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
