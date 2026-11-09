import { useState, useEffect, useRef } from "react";
import { Page } from "../data";
import { Order, initiateKhqrPayment, getKhqrStatus, ApiError, KhqrBank } from "../lib/api";

interface Props {
  navigate: (page: Page, data?: unknown) => void;
  amount: number;
  order: Order | null;
}

type Status = "choose" | "loading" | "pending" | "polling" | "success" | "expired" | "error";

const POLL_INTERVAL_MS = 3000;
const BANKS: { id: KhqrBank; label: string; image: string; hint: string }[] = [
  { id: "ABA", label: "ABA", image: "/payment-qr/ABA.JPG", hint: "Scan with ABA Mobile" },
  { id: "ACLEDA", label: "ACLEDA", image: "/payment-qr/ACLEDA.JPG", hint: "Scan with ACLEDA mobile" },
  { id: "WING", label: "Wing", image: "/payment-qr/WING.JPG", hint: "Scan with Wing Bank" },
];

export default function KHQRPage({ navigate, amount, order }: Props) {
  const [status, setStatus] = useState<Status>("choose");
  const [selectedBank, setSelectedBank] = useState<KhqrBank>("ABA");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [paymentStartedAt, setPaymentStartedAt] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  };

  useEffect(() => () => clearTimers(), []);

  const startPayment = async (bank: KhqrBank = selectedBank) => {
    if (!order) {
      setStatus("error");
      setErrorMessage("No order found. Please restart checkout.");
      return;
    }

    clearTimers();
    setSelectedBank(bank);
    setStatus("loading");
    setErrorMessage(null);
    setPaymentId(null);
    setQrImageUrl(null);

    try {
      const res = await initiateKhqrPayment(order.id, amount, bank);
      setPaymentId(res.paymentId);
      setQrImageUrl(res.qrImageUrl ?? BANKS.find((b) => b.id === bank)?.image ?? null);
      setTimeLeft(Math.min(300, res.expiresInSeconds ?? 300));
      setPaymentStartedAt(Date.now());
      setStatus("pending");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "Couldn't start the payment. Check that your backend is running."
      );
    }
  };

  // Start with bank selection. A new payment attempt is created only after
  // the customer chooses a QR, preventing duplicate payment records.
  useEffect(() => {
    if (!order) {
      setStatus("error");
      setErrorMessage("No order found. Please restart checkout.");
    }
  }, [order]);

  // Poll until the admin confirms payment, or the server reports expiry.
  useEffect(() => {
    if (!paymentId || status === "success" || status === "expired" || status === "error" || status === "choose") return;

    setStatus("polling");
    pollRef.current = setInterval(async () => {
      try {
        const res = await getKhqrStatus(paymentId);
        if (res.status === "paid") {
          clearTimers();
          setStatus("success");
          setTimeout(() => navigate("tracking"), 1200);
        } else if (res.status === "expired" || res.status === "failed") {
          clearTimers();
          setStatus("expired");
          setTimeLeft(0);
        }
      } catch {
        // Keep polling through transient network errors.
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentId, status, navigate]);

  useEffect(() => {
    if (!paymentStartedAt || (status !== "pending" && status !== "polling")) return;

    countdownRef.current = setInterval(() => {
      const remaining = Math.max(0, 300 - Math.floor((Date.now() - paymentStartedAt) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearTimers();
        setStatus("expired");
      }
    }, 250);

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [paymentStartedAt, status]);

  const selected = BANKS.find((b) => b.id === selectedBank) ?? BANKS[0];
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const secs = (timeLeft % 60).toString().padStart(2, "0");
  const progress = Math.max(0, Math.min(100, (timeLeft / 300) * 100));

  return (
    <div className="min-h-full max-w-lg mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("checkout")} className="w-9 h-9 rounded-xl bg-[var(--muted)] flex items-center justify-center hover:bg-[var(--border)] transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-[var(--foreground)]">KHQR Payment</h1>
          <p className="text-xs text-[var(--muted-foreground)]">Choose a QR and scan with your bank app</p>
        </div>
      </div>

      {(status === "choose" || status === "expired") && (
        <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-lg animate-fade-up">
          {status === "expired" && (
            <div className="mb-5 rounded-2xl bg-orange-50 border border-orange-200 p-4">
              <p className="font-bold text-orange-700">The 5-minute payment window expired.</p>
              <p className="text-sm text-orange-600 mt-1">Choose a QR again to start a new 5-minute payment window.</p>
            </div>
          )}

          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)]">Amount to pay</p>
              <p className="text-3xl font-extrabold text-[var(--primary)]">${amount.toFixed(2)}</p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-[var(--muted)] text-[var(--foreground)]">KHQR</span>
          </div>

          <p className="text-sm font-bold text-[var(--foreground)] mb-3">Choose your bank</p>
          <div className="grid grid-cols-3 gap-2">
            {BANKS.map((bank) => (
              <button
                key={bank.id}
                onClick={() => setSelectedBank(bank.id)}
                className={`rounded-2xl border-2 p-3 text-sm font-bold transition-all ${selectedBank === bank.id ? "border-[var(--primary)] bg-[var(--secondary)]" : "border-[var(--border)] bg-white hover:border-[var(--primary)]/40"}`}
              >
                {bank.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => startPayment(selectedBank)}
            className="w-full mt-5 py-3.5 bg-[var(--primary)] text-white rounded-2xl font-bold hover:opacity-90 transition-opacity"
          >
            {status === "expired" ? "Choose QR & Start Again" : "Show QR Code"}
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="bg-white rounded-3xl p-10 border border-[var(--border)] text-center animate-fade-up">
          <div className="w-10 h-10 mx-auto rounded-full border-4 border-[var(--primary)] border-t-transparent animate-spin-slow" />
          <p className="text-sm text-[var(--muted-foreground)] mt-4">Preparing your {selectedBank} payment…</p>
        </div>
      )}

      {status === "error" && (
        <div className="bg-white rounded-3xl p-8 border border-[var(--border)] text-center animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-2xl">!</div>
          <h2 className="font-bold text-[var(--foreground)]">Couldn't start payment</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-2">{errorMessage}</p>
          <button onClick={() => setStatus("choose")} className="mt-5 w-full py-3 bg-[var(--primary)] text-white rounded-2xl font-semibold text-sm">Choose QR</button>
        </div>
      )}

      {status === "success" && (
        <div className="bg-white rounded-3xl p-8 border border-[var(--border)] text-center animate-fade-up shadow-lg">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 text-4xl">✓</div>
          <h2 className="text-xl font-extrabold text-[var(--foreground)]">Payment Accepted!</h2>
          <p className="text-[var(--muted-foreground)] text-sm mt-2">The admin confirmed your payment. Opening live order tracking…</p>
        </div>
      )}

      {(status === "pending" || status === "polling") && (
        <>
          <div className="bg-white rounded-3xl p-6 border border-[var(--border)] shadow-lg animate-fade-up">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-bold text-sm text-[var(--foreground)]">{selected.label} · KHQR</p>
                <p className="text-xs text-[var(--muted-foreground)]">{selected.hint}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold text-[var(--primary)]">${amount.toFixed(2)}</p>
                <p className="text-xs text-[var(--muted-foreground)]">USD</p>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[330px] h-[390px] bg-white border-4 border-[var(--primary)] rounded-2xl overflow-hidden flex items-center justify-center">
              <img src={qrImageUrl || selected.image} alt={`${selected.label} KHQR payment QR`} className="w-full h-full object-contain p-2" />
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] mb-1.5">
                <span>Payment window</span>
                <span className={`font-bold tabular-nums ${timeLeft < 60 ? "text-red-500" : "text-[var(--foreground)]"}`}>{mins}:{secs}</span>
              </div>
              <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--primary)] rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-[var(--secondary)] p-4 text-center">
              <p className="font-bold text-sm text-[var(--foreground)]">Pay exactly ${amount.toFixed(2)} USD</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">Scan the QR, complete the bank payment, then wait for admin confirmation.</p>
            </div>
          </div>

        </>
      )}
    </div>
  );
}
