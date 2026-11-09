import { useEffect, useState } from "react";
import { db } from "../lib/db";
import { Search, Download, RefreshCw, CheckCircle, Clock } from "lucide-react";

const statusColor: Record<string, string> = {
  Paid: "badge-success",
  Pending: "badge-warning",
  Failed: "badge-danger",
  Expired: "badge-muted",
  Refunded: "badge-info",
};

const methodColor: Record<string, string> = {
  KHQR: "badge-primary",
  "ABA Pay": "badge-info",
  Cash: "badge-muted",
  Wing: "badge-warning",
};

const pretty = (value: string) => String(value || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const prettyMethod = (value: string) => String(value || "").toLowerCase() === "khqr" ? "KHQR" : pretty(value);

export default function Payments({ showToast }: { showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void }) {
  const [payments, setPayments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterMethod, setFilterMethod] = useState("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadPayments = async () => {
    const { data, error } = await db.payments.list();
    if (error) {
      showToast(error.message, "error");
      return;
    }

    const now = Date.now();
    const rows = (data || []).map((x: any) => {
      const expiresAt = x.expires_at ? new Date(x.expires_at).getTime() : null;
      const rawStatus = String(x.status || "").toLowerCase();
      const effectiveStatus = rawStatus === "pending" && expiresAt && expiresAt <= now ? "Expired" : pretty(rawStatus);
      return {
        id: x.payment_code || x.id,
        dbId: x.id,
        orderId: x.order_id,
        customer: x.customers?.name || "",
        amount: Number(x.amount || 0),
        method: prettyMethod(x.method || ""),
        bank: x.payment_provider || null,
        status: effectiveStatus,
        rawStatus,
        date: new Date(x.created_at).toLocaleString(),
        khqrRef: x.khqr_reference || null,
        expiresAt,
      };
    });
    setPayments(rows);
  };

  useEffect(() => {
    loadPayments();
    const interval = setInterval(loadPayments, 3000);
    return () => clearInterval(interval);
  }, []);

  const acceptPayment = async (id: string) => {
    const p = payments.find(x => x.id === id);
    if (!p || p.status !== "Pending") return;

    if (p.expiresAt && p.expiresAt <= Date.now()) {
      showToast("This payment window has expired. Customer must choose a QR again.", "error");
      await loadPayments();
      return;
    }

    setBusyId(id);
    try {
      // Admin manually verifies the bank app/merchant account first, then
      // confirms the payment here. This is intentionally not an automatic
      // fake bank verification.
      const { error: paymentError } = await db.payments.update(p.dbId, {
        status: "paid",
        paid_at: new Date().toISOString(),
        // Never fabricate a bank transaction reference. Preserve only a real
        // reference that was recorded separately by the operator/provider.
        khqr_reference: p.khqrRef || null,
      });
      if (paymentError) throw paymentError;

      const { error: orderError } = await db.orders.update(p.orderId, {
        payment_status: "paid",
        status: "preparing",
        updated_at: new Date().toISOString(),
      });

      if (orderError) {
        // Roll back the payment if the order update cannot be completed.
        await db.payments.update(p.dbId, { status: "pending", paid_at: null });
        throw orderError;
      }

      setPayments(prev => prev.map(x => x.id === id ? { ...x, status: "Paid", rawStatus: "paid" } : x));
      showToast(`Payment accepted for ${p.orderId}. Customer can now track the order.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Could not accept payment.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const rejectExpired = async (id: string) => {
    const p = payments.find(x => x.id === id);
    if (!p || p.status !== "Expired") return;
    setBusyId(id);
    const { error } = await db.payments.update(p.dbId, { status: "expired" });
    if (error) showToast(error.message, "error");
    else {
      setPayments(prev => prev.map(x => x.id === id ? { ...x, status: "Expired" } : x));
      showToast("Payment marked expired.", "success");
    }
    setBusyId(null);
  };

  const refund = async (id: string) => {
    const p = payments.find(x => x.id === id);
    if (!p) return;
    setBusyId(id);
    const { error } = await db.payments.update(p.dbId, { status: "refunded" });
    if (error) showToast(error.message, "error");
    else {
      setPayments(prev => prev.map(x => x.id === id ? { ...x, status: "Refunded" } : x));
      showToast("Payment refunded", "success");
    }
    setBusyId(null);
  };

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      String(p.id).toLowerCase().includes(q) ||
      String(p.customer).toLowerCase().includes(q) ||
      String(p.orderId).toLowerCase().includes(q);
    const matchStatus = filterStatus === "All" || p.status === filterStatus;
    const matchMethod = filterMethod === "All" || p.method === filterMethod;
    return matchSearch && matchStatus && matchMethod;
  });

  const statuses = ["All", "Paid", "Pending", "Failed", "Expired", "Refunded"];
  const counts = statuses.map((s) => ({
    label: s,
    count: s === "All" ? payments.length : payments.filter((p) => p.status === s).length,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#1A1D23" }}>Payments</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 2 }}>Verify KHQR payments manually and manage payment transactions</p>
        </div>
        <button className="btn-secondary" onClick={() => { loadPayments(); showToast("Payments refreshed", "success"); }}>
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
        {counts.slice(1).map((s) => {
          const colors: Record<string, { bg: string; color: string }> = {
            Paid: { bg: "#DCFCE7", color: "#15803D" },
            Pending: { bg: "#FEF3C7", color: "#92400E" },
            Failed: { bg: "#FEE2E2", color: "#B91C1C" },
            Expired: { bg: "#F3F4F6", color: "#6B7280" },
            Refunded: { bg: "#DBEAFE", color: "#1D4ED8" },
          };
          const c = colors[s.label];
          return (
            <div key={s.label} className="card" style={{ padding: 16 }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: c.color }}>{s.count}</div>
              <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="search-bar">
          <Search size={15} color="#9CA3AF" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payment ID, order, customer..." />
        </div>
        <select className="select" style={{ width: 140 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="select" style={{ width: 140 }} value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
          <option>All</option><option>KHQR</option><option>ABA Pay</option><option>Cash</option><option>Wing</option>
        </select>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Payment ID</th><th>Order ID</th><th>Customer</th><th>Amount</th><th>Bank</th><th>Method</th><th>KHQR Ref</th><th>Status</th><th>Date</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: "#9CA3AF" }}>No payments found</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: "#374151" }}>{p.id}</td>
                  <td style={{ fontWeight: 500, color: "#F05A28" }}>{p.orderId}</td>
                  <td>{p.customer || "—"}</td>
                  <td style={{ fontWeight: 700 }}>${p.amount.toFixed(2)}</td>
                  <td><span className="badge badge-muted">{p.bank || "—"}</span></td>
                  <td><span className={`badge ${methodColor[p.method] || "badge-muted"}`}>{p.method}</span></td>
                  <td style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "monospace" }}>{p.khqrRef || "—"}</td>
                  <td><span className={`badge ${statusColor[p.status] || "badge-muted"}`}>{p.status}</span></td>
                  <td style={{ color: "#9CA3AF", fontSize: 12 }}>{p.date}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, minWidth: 150 }}>
                      {p.status === "Pending" && (
                        <button
                          disabled={busyId === p.id}
                          onClick={() => acceptPayment(p.id)}
                          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #BBF7D0", background: "#F0FDF4", cursor: busyId === p.id ? "wait" : "pointer", fontSize: 12, color: "#15803D", display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}
                        >
                          <CheckCircle size={12} /> {busyId === p.id ? "Checking…" : "Accept"}
                        </button>
                      )}
                      {p.status === "Expired" && (
                        <button disabled={busyId === p.id} onClick={() => rejectExpired(p.id)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#F9FAFB", cursor: "pointer", fontSize: 12, color: "#6B7280", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={12} /> Mark expired
                        </button>
                      )}
                      {p.status === "Paid" && (
                        <button disabled={busyId === p.id} onClick={() => refund(p.id)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #BFDBFE", background: "#EFF6FF", cursor: "pointer", fontSize: 12, color: "#1D4ED8" }}>
                          Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
