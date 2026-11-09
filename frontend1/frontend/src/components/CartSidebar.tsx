import { useEffect } from "react";
import { CartItem, Page } from "../data";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQty: (id: number, delta: number) => void;
  onRemove: (id: number) => void;
  navigate: (page: Page) => void;
}

export default function CartSidebar({ isOpen, onClose, cart, onUpdateQty, onRemove, navigate }: CartSidebarProps) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = cart.length > 0 ? 1.5 : 0;
  const total = subtotal + deliveryFee;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  // Close on Escape and lock page scroll while the drawer is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        inert={!isOpen}
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 flex flex-col shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--foreground)]">Your Cart</h2>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-white hover:rotate-90 transition-all duration-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
              <div className="w-24 h-24 rounded-3xl bg-[var(--secondary)] flex items-center justify-center text-5xl animate-floaty">🛒</div>
              <div>
                <p className="font-bold text-lg text-[var(--foreground)]">Your cart is empty</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Add some delicious food to get started</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate("restaurants");
                }}
                className="btn-primary px-6 py-3 rounded-xl font-semibold text-sm"
              >
                Browse Restaurants
              </button>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 rounded-2xl bg-[var(--muted)] animate-fade-up"
                style={{ animationDelay: `${Math.min(idx, 6) * 40}ms` }}
              >
                <img src={item.image} alt={item.name} className="w-[72px] h-[72px] rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-sm text-[var(--foreground)] truncate">{item.name}</p>
                    <button
                      type="button"
                      onClick={() => onRemove(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="text-[var(--muted-foreground)] hover:text-red-500 transition-colors shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">${item.price.toFixed(2)} each</p>
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, -1)}
                        aria-label="Decrease quantity"
                        className="w-7 h-7 rounded-lg bg-white border border-[var(--border)] flex items-center justify-center text-[var(--foreground)] hover:border-[var(--primary)] hover:text-[var(--primary)] active:scale-90 transition-all text-sm font-bold"
                      >
                        −
                      </button>
                      <span key={item.quantity} className="animate-pop text-sm font-bold w-5 text-center">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, 1)}
                        aria-label="Increase quantity"
                        className="w-7 h-7 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center hover:opacity-90 active:scale-90 transition-all text-sm font-bold"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-sm font-extrabold text-[var(--primary)]">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="px-6 py-5 border-t border-[var(--border)] space-y-4 bg-white">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
                <span>Delivery fee</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center font-bold text-[var(--foreground)] pt-3 border-t border-dashed border-[var(--border)]">
                <span>Total</span>
                <span className="text-2xl font-extrabold text-[var(--primary)]">${total.toFixed(2)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("checkout");
              }}
              className="btn-primary w-full py-4 rounded-2xl font-bold text-sm"
            >
              Proceed to Checkout · ${total.toFixed(2)}
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
