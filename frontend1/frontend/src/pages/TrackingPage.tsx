import { useEffect, useState } from "react";
import { Page } from "../data";
import { Order, fetchOrder } from "../lib/api";

interface Props {
  navigate: (page: Page) => void;
  order: Order | null;
}

const POLL_MS = 3000;

const steps = [
  {
    id: 1,
    status: "placed",
    label: "Order placed",
    description: "Your order has been received.",
    icon: "🧾",
  },
  {
    id: 2,
    status: "preparing",
    label: "Preparing",
    description: "The restaurant is preparing your food.",
    icon: "👨‍🍳",
  },
  {
    id: 3,
    status: "on_the_way",
    label: "On the way",
    description: "Your order is on its way to you.",
    icon: "🛵",
  },
  {
    id: 4,
    status: "delivered",
    label: "Delivered",
    description: "Your order has been delivered.",
    icon: "🏠",
  },
] as const;

function getStep(status: Order["status"]): number {
  switch (status) {
    case "pending":
    case "placed":
      return 1;
    case "preparing":
      return 2;
    case "on_the_way":
      return 3;
    case "delivered":
      return 4;
    case "cancelled":
      return 0;
    default:
      return 1;
  }
}

export default function TrackingPage({ navigate, order }: Props) {
  const [liveOrder, setLiveOrder] = useState<Order | null>(order);
  const [isLoading, setIsLoading] = useState(Boolean(order));
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setLiveOrder(order);
    setIsLoading(Boolean(order));
    setIsLive(false);
    setError("");
    setLastUpdated(null);
  }, [order?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!order?.id) {
      setIsLoading(false);
      setIsLive(false);
      setError("No order selected. Open tracking from your order history.");
      return;
    }

    let active = true;
    let inFlight = false;
    let timer: number | undefined;

    const syncOrder = async () => {
      if (inFlight) return;
      inFlight = true;

      try {
        const freshOrder = await fetchOrder(order.id);

        if (!active) return;

        setLiveOrder(freshOrder);
        setIsLive(true);
        setError("");
        setLastUpdated(Date.now());
      } catch (err) {
        if (!active) return;

        setIsLive(false);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to refresh order status. Retrying..."
        );
      } finally {
        inFlight = false;

        if (active) {
          setIsLoading(false);

          if (liveOrderStatusIsFinal()) {
            if (timer !== undefined) {
              window.clearInterval(timer);
            }
          }
        }
      }
    };

    function liveOrderStatusIsFinal() {
      return (
        liveOrder?.status === "delivered" ||
        liveOrder?.status === "cancelled"
      );
    }

    void syncOrder();

    timer = window.setInterval(() => {
      if (!liveOrderStatusIsFinal()) {
        void syncOrder();
      }
    }, POLL_MS);

    return () => {
      active = false;
      if (timer !== undefined) {
        window.clearInterval(timer);
      }
    };
  }, [order?.id, liveOrder?.status]);

  const currentOrder = liveOrder;
  const status = currentOrder?.status;
  const currentStep = status ? getStep(status) : 0;
  const isCancelled = status === "cancelled";
  const isDelivered = status === "delivered";

  return (
    <main className="min-h-full max-w-lg mx-auto px-4 sm:px-6 py-8">
      <header className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("home")}
            aria-label="Back to home"
            className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center"
          >
            ←
          </button>

          <h1 className="text-xl font-extrabold text-[var(--foreground)]">
            Order Tracking
          </h1>
        </div>

        <span className="text-xs font-mono bg-[var(--muted)] px-2 py-1 rounded-lg">
          {currentOrder ? `#${currentOrder.id}` : "No order"}
        </span>
      </header>

      <section className="rounded-2xl border border-[var(--border)] p-4 mb-5">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isLive ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />

          <p className="font-bold text-sm">
            {isLoading
              ? "Loading order..."
              : isLive
                ? "Connected to order updates"
                : "Connection unavailable"}
          </p>
        </div>

        <p className="text-sm text-[var(--muted-foreground)] mt-2">
          {lastUpdated
            ? `Last checked ${Math.max(
                0,
                Math.floor((now - lastUpdated) / 1000)
              )} seconds ago`
            : "Waiting for the first successful order update."}
        </p>

        {error && (
          <p role="alert" className="text-sm text-red-600 mt-3 break-words">
            {error}
          </p>
        )}
      </section>

      {isCancelled ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 mb-5">
          <h2 className="font-bold text-lg text-red-700">
            Order cancelled
          </h2>
          <p className="text-sm text-red-700 mt-2">
            This order has been cancelled. Contact BiteGo support if you need
            help.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-[var(--border)] p-5 mb-5">
            <h2 className="font-bold text-base mb-5">
              Delivery progress
            </h2>

            <div className="space-y-0">
              {steps.map((step, index) => {
                const completed = step.id <= currentStep;
                const active = step.id === currentStep;

                return (
                  <div key={step.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center text-lg border-2 ${
                          completed
                            ? "bg-[var(--secondary)] border-[var(--primary)]"
                            : "bg-[var(--muted)] border-[var(--border)]"
                        }`}
                      >
                        {step.icon}
                      </div>

                      {index < steps.length - 1 && (
                        <div
                          className={`w-0.5 h-10 ${
                            step.id < currentStep
                              ? "bg-[var(--primary)]"
                              : "bg-[var(--border)]"
                          }`}
                        />
                      )}
                    </div>

                    <div className="flex-1 pb-8">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-sm">
                          {step.label}
                        </h3>

                        {active && !isDelivered && (
                          <span className="text-xs rounded-full bg-[var(--secondary)] px-2 py-1">
                            Current status
                          </span>
                        )}

                        {completed && !active && (
                          <span className="text-xs text-emerald-600">
                            Completed
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-[var(--muted-foreground)] mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isDelivered && (
              <p className="rounded-xl bg-emerald-50 text-emerald-700 p-3 text-sm font-semibold">
                Your order has been delivered successfully!
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--border)] p-4 mb-5">
            <h2 className="font-bold mb-2">Live delivery location</h2>

            <p className="text-sm text-[var(--muted-foreground)]">
              {status === "on_the_way"
                ? "Your order is on the way. A live map will be available when the assigned rider's GPS location is connected."
                : "The live delivery map becomes relevant when your order is on the way."}
            </p>

            <div className="mt-4 rounded-xl bg-[var(--muted)] p-4 flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div>
                <p className="font-semibold text-sm">
                  {status === "on_the_way"
                    ? "Waiting for rider GPS"
                    : "Location not available yet"}
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  No simulated coordinates are displayed.
                </p>
              </div>
            </div>
          </section>
        </>
      )}

      <button
        type="button"
        onClick={() => navigate("home")}
        className="w-full rounded-xl py-3 font-semibold border border-[var(--border)] hover:bg-[var(--muted)]"
      >
        Back to home
      </button>
    </main>
  );
}