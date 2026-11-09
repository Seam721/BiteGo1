import { useEffect, useRef, useState } from "react";
import { MenuItem, restaurants as staticRestaurants, Restaurant, Page } from "../data";

interface Props {
  item: MenuItem;
  navigate: (page: Page, data?: unknown) => void;
  onAddToCart: (item: MenuItem, qty: number, notes: string) => void;
  restaurants?: Restaurant[];
}

const spiceOptions = ["Mild", "Medium", "Spicy", "Extra Spicy"];

export default function FoodDetailPage({ item, navigate, onAddToCart, restaurants = staticRestaurants }: Props) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [spice, setSpice] = useState("Medium");
  const [added, setAdded] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const restaurant = restaurants.find((r) => r.id === item.restaurantId);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const handleAdd = () => {
    onAddToCart(item, qty, notes);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 2000);
  };

  const facts = [
    { label: "Rating", value: `★ ${item.rating}` },
    { label: "Reviews", value: item.reviews.toLocaleString() },
    { label: "Delivery", value: restaurant ? `${restaurant.deliveryTime} min` : "—" },
  ];

  return (
    <div className="min-h-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <button
          type="button"
          onClick={() => navigate("restaurant-detail", restaurant)}
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors group"
        >
          <span className="w-8 h-8 rounded-xl bg-white border border-[var(--border)] flex items-center justify-center group-hover:-translate-x-0.5 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </span>
          Back to {restaurant?.name ?? "menu"}
        </button>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-start">
          {/* Image */}
          <div className="relative rounded-[2rem] overflow-hidden bg-[var(--muted)] shadow-[var(--shadow-lg)] aspect-[4/3] lg:aspect-square lg:sticky lg:top-24 animate-fade-up">
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" style={{ animation: "kenburns 1.4s var(--ease-out) both" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
            {item.popular && (
              <div className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full bg-[var(--accent)] text-white text-xs font-bold shadow-lg">🔥 Popular</div>
            )}
          </div>

          {/* Details */}
          <div className="animate-fade-up stagger-2">
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-[var(--border)]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)]">{item.name}</h1>
                    {item.spicy && <span className="text-xl">🌶️</span>}
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1.5">from {restaurant?.name}</p>
                </div>
                <p className="text-3xl font-extrabold text-[var(--primary)] shrink-0">${item.price.toFixed(2)}</p>
              </div>

              <p className="text-[var(--muted-foreground)] text-sm sm:text-base mt-5 leading-relaxed">{item.description}</p>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {facts.map((f) => (
                  <div key={f.label} className="bg-[var(--muted)] rounded-2xl p-3.5 text-center">
                    <p className="font-extrabold text-[var(--foreground)]">{f.value}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{f.label}</p>
                  </div>
                ))}
              </div>

              {/* Spice level (only for spicy dishes) */}
              {item.spicy && (
                <div className="mt-6">
                  <p className="text-sm font-bold text-[var(--foreground)] mb-2.5">Spice level</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {spiceOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSpice(opt)}
                        aria-pressed={spice === opt}
                        className={`py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                          spice === opt
                            ? "border-[var(--primary)] bg-[var(--secondary)] text-[var(--primary)] scale-[1.03]"
                            : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/50"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="mt-6">
                <label htmlFor="special-instructions" className="text-sm font-bold text-[var(--foreground)] mb-2.5 block">
                  Special instructions
                </label>
                <textarea
                  id="special-instructions"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Allergies, preferences, extra sauce..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl bg-[var(--muted)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-shadow"
                />
              </div>

              {/* Quantity + Add to Cart */}
              <div className="flex items-center gap-3 mt-7">
                <div className="flex items-center gap-2 bg-[var(--muted)] rounded-2xl p-1.5">
                  <button
                    type="button"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    aria-label="Decrease quantity"
                    className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-bold text-lg hover:bg-[var(--border)] active:scale-90 transition-all"
                  >
                    −
                  </button>
                  <span key={qty} className="w-7 text-center font-extrabold text-[var(--foreground)] animate-pop">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(qty + 1)}
                    aria-label="Increase quantity"
                    className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center font-bold text-lg hover:opacity-90 active:scale-90 transition-all"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleAdd}
                  className={`flex-1 h-14 rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 ${
                    added ? "bg-green-500 text-white" : "btn-primary"
                  }`}
                >
                  {added ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      Added to cart!
                    </span>
                  ) : (
                    `Add to Cart · $${(item.price * qty).toFixed(2)}`
                  )}
                </button>
              </div>
            </div>

            {/* Restaurant info */}
            <button
              type="button"
              onClick={() => navigate("restaurant-detail", restaurant)}
              className="group mt-4 w-full flex items-center gap-4 bg-white rounded-3xl p-4 border border-[var(--border)] shadow-sm card-hover text-left"
            >
              <img src={restaurant?.image} alt={restaurant?.name} className="w-14 h-14 rounded-2xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[var(--foreground)] truncate">{restaurant?.name}</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {restaurant?.cuisine} · ★ {restaurant?.rating}
                </p>
              </div>
              <svg className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
