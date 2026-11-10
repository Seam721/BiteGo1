import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CartItem, Page } from "../data";

interface OrderDetails {
  address: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promoCode?: string;
}

interface Props {
  cart: CartItem[];
  navigate: (page: Page, data?: unknown) => void;
  onPlaceOrder: (details: OrderDetails) => void;
  placing: boolean;
  error: string | null;
}

const paymentMethods = [
  { id: "khqr", label: "KHQR (ABA / ACLEDA / WING)", icon: "🏦", desc: "Choose your bank QR on the next screen and wait for admin confirmation" },
  { id: "cash", label: "Cash on Delivery", icon: "💵", desc: "Pay when your order arrives" },
];

export default function CheckoutPage({ cart, navigate, onPlaceOrder, placing, error }: Props) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("khqr");
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [step, setStep] = useState<"details" | "review">("details");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");

  // Prefill checkout with the signed-in customer's saved details. This also
  // keeps the phone number consistent with the customer record used by order
  // history, while still allowing the customer to edit it for this delivery.
  useEffect(() => {
    let active = true;
    const loadCustomerDetails = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (!active || !data) return;
      setCustomerName((current) => current || data.full_name || "");
      setCustomerPhone((current) => current || data.phone || "");
    };

    void loadCustomerDetails();
    return () => { active = false; };
  }, []);

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = 1.5;
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal + deliveryFee - discount;

  const useCurrentLocation = () => {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage("Location is not supported by this browser. Please enter your address manually.");
      return;
    }

    setLocationBusy(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const coordinateAddress = `Current location (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)})`;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(coords.latitude)}&lon=${encodeURIComponent(coords.longitude)}`,
            { headers: { Accept: "application/json" } }
          );
          if (!response.ok) throw new Error("Address lookup unavailable");
          const result = await response.json();
          setAddress(result.display_name || coordinateAddress);
          setLocationMessage("Your current location was added. Please check the delivery address before continuing.");
        } catch {
          setAddress(coordinateAddress);
          setLocationMessage("Coordinates added. Please add a nearby building, street, or landmark to help the rider.");
        } finally {
          setLocationBusy(false);
        }
      },
      (geoError) => {
        const message = geoError.code === geoError.PERMISSION_DENIED
          ? "Location permission was denied. Allow location access in your browser, or enter your address manually."
          : geoError.code === geoError.TIMEOUT
            ? "Getting your location took too long. Please try again or enter your address manually."
            : "Unable to get your location. Please enter your address manually.";
        setLocationMessage(message);
        setLocationBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  const handlePromo = () => {
    if (promoCode.toUpperCase() === "KHMER10") setPromoApplied(true);
  };

  const handlePlaceOrder = () => {
    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) return;
    onPlaceOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      address: address.trim(),
      paymentMethod,
      subtotal,
      deliveryFee,
      discount,
      total,
      promoCode: promoApplied ? promoCode : undefined,
    });
  };

  return (
    <div className="min-h-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("cart")}
          className="w-9 h-9 rounded-xl bg-[var(--muted)] flex items-center justify-center hover:bg-[var(--border)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-[var(--foreground)]">Checkout</h1>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-3 mb-8">
        {["Delivery details", "Review order"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${i === 1 ? (step === "review" ? "" : "opacity-40") : ""}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                (i === 0 && step === "details") || (i === 1 && step === "review")
                  ? "bg-[var(--primary)] text-white"
                  : i === 0 && step === "review"
                  ? "bg-green-500 text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              }`}>
                {i === 0 && step === "review" ? "✓" : i + 1}
              </div>
              <span className={`text-sm font-medium ${i === 0 || step === "review" ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                {s}
              </span>
            </div>
            {i === 0 && <div className="w-8 h-px bg-[var(--border)]" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left form */}
        <div className="md:col-span-3 space-y-5">
          {step === "details" ? (
            <>
              {/* Customer information */}
              <div className="bg-white rounded-2xl p-5 border border-[var(--border)] animate-fade-up">
                <h2 className="font-bold text-[var(--foreground)] mb-4">Customer information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Full name"
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
                  <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone number"
                    className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30" />
                </div>
              </div>

              {/* Delivery address */}
              <div className="bg-white rounded-2xl p-5 border border-[var(--border)] animate-fade-up">
                <h2 className="font-bold text-[var(--foreground)] mb-4">Delivery address</h2>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  placeholder="House number, street, sangkat, khan, and a nearby landmark"
                  className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-y"
                />
                <button type="button" onClick={useCurrentLocation} disabled={locationBusy} className="mt-3 text-xs font-semibold text-[var(--primary)] flex items-center gap-1 hover:underline disabled:opacity-60">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  </svg>
                  {locationBusy ? "Getting your location…" : "Use my current location"}
                </button>
                {locationMessage && <p role="status" className="mt-2 text-xs text-[var(--muted-foreground)]">{locationMessage}</p>}
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">Your browser will ask permission before sharing your location. Please verify the address and add a landmark if needed. Address lookup © OpenStreetMap contributors.</p>
              </div>

              {/* Payment method */}
              <div className="bg-white rounded-2xl p-5 border border-[var(--border)] animate-fade-up stagger-1">
                <h2 className="font-bold text-[var(--foreground)] mb-4">Payment method</h2>
                <div className="space-y-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        paymentMethod === method.id
                          ? "border-[var(--primary)] bg-[var(--secondary)]"
                          : "border-[var(--border)] hover:border-[var(--primary)]/40"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center text-xl">
                        {method.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm text-[var(--foreground)]">{method.label}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{method.desc}</p>
                      </div>
                      <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === method.id ? "border-[var(--primary)]" : "border-[var(--border)]"
                      }`}>
                        {paymentMethod === method.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Promo code */}
              <div className="bg-white rounded-2xl p-5 border border-[var(--border)] animate-fade-up stagger-2">
                <h2 className="font-bold text-[var(--foreground)] mb-3">Promo code</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter code (try KHMER10)"
                    className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                  <button
                    onClick={handlePromo}
                    className="px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Apply
                  </button>
                </div>
                {promoApplied && (
                  <p className="text-green-600 text-xs font-medium mt-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    10% discount applied!
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  if (!customerName.trim() || !customerPhone.trim() || !address.trim()) return;
                  setStep("review");
                }}
                className="w-full py-3.5 bg-[var(--primary)] text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity animate-fade-up stagger-3"
              >
                Continue to Review
              </button>
            </>
          ) : (
            <>
              {/* Order items review */}
              <div className="bg-white rounded-2xl p-5 border border-[var(--border)] animate-fade-up">
                <h2 className="font-bold text-[var(--foreground)] mb-4">Order summary</h2>
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name} × {item.quantity}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[var(--border)] text-sm">
                  <div className="flex justify-between text-[var(--muted-foreground)]">
                    <span>Delivering to:</span>
                    <span className="text-right text-[var(--foreground)] font-medium max-w-[60%]">{address}</span>
                  </div>
                  <div className="flex justify-between text-[var(--muted-foreground)] mt-1">
                    <span>Payment:</span>
                    <span className="text-[var(--foreground)] font-medium">
                      {paymentMethods.find((m) => m.id === paymentMethod)?.label}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl p-3">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("details")}
                  disabled={placing}
                  className="px-5 py-3.5 rounded-2xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={placing}
                  className="flex-1 py-3.5 bg-[var(--primary)] text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {placing ? "Placing order…" : `Place Order · $${total.toFixed(2)}`}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right summary */}
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl p-5 border border-[var(--border)] sticky top-24 animate-fade-up stagger-1">
            <h2 className="font-bold text-[var(--foreground)] mb-4">Price summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[var(--muted-foreground)]">
                <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[var(--muted-foreground)]">
                <span>Delivery fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              {promoApplied && (
                <div className="flex justify-between text-green-600">
                  <span>Discount (KHMER10)</span>
                  <span>-${discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-[var(--foreground)] pt-2 border-t border-[var(--border)]">
                <span>Total</span>
                <span className="text-[var(--primary)]">${total.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-xl p-3">
              <svg className="w-4 h-4 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              Payments are secured and encrypted
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
