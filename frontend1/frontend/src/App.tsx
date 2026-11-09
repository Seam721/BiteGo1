import { useState, useEffect } from "react";
import { Page, CartItem, MenuItem, Restaurant, restaurants as staticRestaurants, menuItems as staticMenuItems } from "./data";
import { fetchRestaurants, fetchMenuItems, createOrder, CreateOrderPayload, Order } from "./lib/api";
import Header from "./components/Header";
import MobileNav from "./components/MobileNav";
import CartSidebar from "./components/CartSidebar";
import Footer from "./components/Footer";
import { ScrollTopButton } from "./components/Motion";
import HomePage from "./pages/HomePage";
import RestaurantsPage from "./pages/RestaurantsPage";
import RestaurantDetailPage from "./pages/RestaurantDetailPage";
import FoodDetailPage from "./pages/FoodDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import KHQRPage from "./pages/KHQRPage";
import TrackingPage from "./pages/TrackingPage";
import ProfilePage from "./pages/ProfilePage";
import CustomerAuthPage from "./pages/CustomerAuthPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("home");
  const [pageData, setPageData] = useState<unknown>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Live backend data. Falls back to the static mock data in `data.ts`
  // if the backend isn't reachable, so the UI still renders during setup.
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [allMenuItems, setAllMenuItems] = useState<MenuItem[]>([]);
  const [dataSource, setDataSource] = useState<"backend" | "mock">("backend");

  // Order placed via checkout — carried into the KHQR and tracking pages.
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  // Presentation-only state: branded preloader and the route progress bar.
  const [dataReady, setDataReady] = useState(false);
  const [splash, setSplash] = useState<"show" | "hide" | "gone">("show");
  const [navTick, setNavTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchRestaurants(), fetchMenuItems()])
      .then(([r, m]) => {
        if (cancelled) return;
        setRestaurants(r);
        setAllMenuItems(m);
        setDataSource("backend");
        setDataReady(true);
      })
      .catch((err) => {
        console.error("BiteGo database load failed:", err);
        setDataSource("mock");
        setRestaurants(staticRestaurants);
        setAllMenuItems(staticMenuItems);
        setDataReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hide the splash shortly after the catalog has loaded (so it never just
  // flashes), and never let it block the site for more than 4 seconds.
  useEffect(() => {
    const hide = () => setSplash((s) => (s === "show" ? "hide" : s));
    const maxTimer = window.setTimeout(hide, 4000);
    const minTimer = dataReady ? window.setTimeout(hide, 900) : undefined;
    return () => {
      window.clearTimeout(maxTimer);
      window.clearTimeout(minTimer);
    };
  }, [dataReady]);

  useEffect(() => {
    if (splash !== "hide") return;
    const t = window.setTimeout(() => setSplash("gone"), 600);
    return () => window.clearTimeout(t);
  }, [splash]);

  const navigate = (page: Page, data?: unknown) => {
    setNavTick((t) => t + 1);
    setCurrentPage(page);
    setPageData(data ?? null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const addToCart = (item: MenuItem, qty = 1, notes = "") => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + qty } : i);
      }
      return [...prev, { ...item, quantity: qty, notes }];
    });
    setCartOpen(true);
  };

  const updateQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0) + (cart.length > 0 ? 1.5 : 0);

  const placeOrder = async (details: {
    address: string;
    customerName: string;
    customerPhone: string;
    paymentMethod: string;
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
    promoCode?: string;
  }) => {
    if (dataSource !== "backend") {
      setOrderError("BiteGo is currently offline from the live menu database. Please reconnect the backend before placing a real order.");
      return;
    }
    if (cart.length === 0) {
      setOrderError("Your cart is empty. Add an item before placing an order.");
      return;
    }

    setPlacingOrder(true);
    setOrderError(null);
    const payload: CreateOrderPayload = { items: cart, ...details };
    try {
      const order = await createOrder(payload);
      setCurrentOrder(order);
      // The backend has confirmed that the order and its items were saved.
      // Keep the order snapshot in currentOrder for KHQR/tracking after clearing.
      setCart([]);
      setCartOpen(false);
      if (details.paymentMethod === "khqr") {
        navigate("khqr");
      } else if (details.paymentMethod === "cash") {
        navigate("tracking");
      } else {
        throw new Error("Unsupported payment method. Please choose KHQR or Cash on Delivery.");
      }
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return (
          <HomePage
            navigate={navigate}
            onAddToCart={(item) => addToCart(item)}
            restaurants={restaurants}
            menuItems={allMenuItems}
          />
        );
      case "restaurants":
        return (
          <RestaurantsPage
            // Re-mount when arriving with a new search/filter from the home page.
            key={JSON.stringify(pageData ?? null)}
            navigate={navigate}
            restaurants={restaurants}
            initialSearch={(pageData as { search?: string } | null)?.search}
            initialFilter={(pageData as { filter?: string } | null)?.filter}
          />
        );
      case "restaurant-detail":
        return (
          <RestaurantDetailPage
            restaurant={pageData as Restaurant}
            navigate={navigate}
            onAddToCart={(item) => addToCart(item)}
            menuItems={allMenuItems}
          />
        );
      case "food-detail":
        return (
          <FoodDetailPage
            item={pageData as MenuItem}
            navigate={navigate}
            onAddToCart={(item, qty, notes) => addToCart(item, qty, notes)}
            restaurants={restaurants}
          />
        );
      case "cart":
        return (
          <div className="min-h-full max-w-2xl mx-auto px-4 sm:px-6 py-8">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => navigate("restaurants")}
                className="w-9 h-9 rounded-xl bg-[var(--muted)] flex items-center justify-center hover:bg-[var(--border)] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <h1 className="text-xl font-extrabold text-[var(--foreground)]">Your Cart</h1>
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🛒</div>
                <p className="font-semibold text-[var(--foreground)]">Cart is empty</p>
                <button
                  onClick={() => navigate("restaurants")}
                  className="mt-4 px-6 py-2.5 bg-[var(--primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  Browse Restaurants
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl p-4 border border-[var(--border)] flex gap-4">
                    <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                    <div className="flex-1">
                      <p className="font-bold text-[var(--foreground)]">{item.name}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">${item.price.toFixed(2)} each</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 rounded-lg bg-[var(--muted)] flex items-center justify-center font-bold hover:bg-[var(--border)] transition-colors">−</button>
                          <span className="font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center font-bold hover:opacity-90 transition-opacity">+</button>
                        </div>
                        <span className="font-bold text-[var(--primary)] ml-auto">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors self-start">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
                <div className="bg-white rounded-2xl p-4 border border-[var(--border)]">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-[var(--primary)]">${total.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => navigate("checkout")}
                    className="w-full mt-4 py-3.5 bg-[var(--primary)] text-white rounded-2xl font-bold hover:opacity-90 transition-opacity"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      case "checkout":
        return (
          <CheckoutPage
            cart={cart}
            navigate={navigate}
            onPlaceOrder={placeOrder}
            placing={placingOrder}
            error={orderError}
          />
        );
      case "khqr":
        return <KHQRPage navigate={navigate} amount={currentOrder?.total ?? total} order={currentOrder} />;
      case "tracking":
        return (
          <TrackingPage
            navigate={navigate}
            order={(pageData as Order | null) || currentOrder}
          />
        );
      case "login":
  return <CustomerAuthPage navigate={navigate} />;

case "profile":
  return <ProfilePage navigate={navigate} />;
      default:
        return (
          <HomePage
            navigate={navigate}
            onAddToCart={(item) => addToCart(item)}
            restaurants={restaurants}
            menuItems={allMenuItems}
          />
        );
    }
  };

  const hideHeader = false;
  const showFooter = ["home", "restaurants", "restaurant-detail", "food-detail"].includes(currentPage);

  return (
    <div className="min-h-full flex flex-col bg-[var(--background)]">
      {!hideHeader && (
        <Header
          currentPage={currentPage}
          navigate={navigate}
          cart={cart}
          onCartOpen={() => setCartOpen(true)}
        />
      )}
      {navTick > 0 && <div key={navTick} className="route-progress" aria-hidden="true" />}
      <main className={`flex-1 ${showFooter ? "" : "pb-20 md:pb-0"}`}>
        <div key={currentPage} className="page-enter">
          {renderPage()}
        </div>
      </main>

      {/* Footer (browse pages only — hidden during checkout, payment and tracking) */}
      {showFooter && <Footer navigate={navigate} />}

      <CartSidebar
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQty={updateQty}
        onRemove={removeFromCart}
        navigate={navigate}
      />

      <ScrollTopButton />

      {splash !== "gone" && (
        <div className={`splash ${splash === "hide" ? "is-hiding" : ""}`} role="status" aria-label="Loading BiteGo">
          <div className="splash-logo flex items-center gap-3">
            <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-3xl font-black shadow-[var(--shadow-brand)]" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              B
            </span>
            <span className="text-4xl font-extrabold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Bite<span className="text-[var(--primary)]">Go</span>
            </span>
          </div>
          <div className="w-40 h-1 rounded-full bg-white/10 overflow-hidden">
            <div className="splash-bar h-full w-2/5 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
          </div>
        </div>
      )}

      {!hideHeader && (
        <MobileNav
          currentPage={currentPage}
          navigate={navigate}
          cart={cart}
          onCartOpen={() => setCartOpen(true)}
        />
      )}
    </div>
  );
}
