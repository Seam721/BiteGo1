
import { useEffect, useState } from "react";
import { db } from "../lib/db";
import {
  Search,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Truck,
  Package,
} from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";

type Status =
  | "All"
  | "Pending"
  | "Preparing"
  | "On the Way"
  | "Delivered"
  | "Cancelled";

type Order = {
  id: string;
  customer: string;
  restaurant: string;
  items: string[];
  total: number;
  status: string;
  date: string;
  payment: string;
  rider: string | null;
  address?: string;
};

const statusColor: Record<string, string> = {
  Delivered: "badge-success",
  Preparing: "badge-info",
  "On the Way": "badge-primary",
  Pending: "badge-warning",
  Cancelled: "badge-danger",
};

const statusTabs: Status[] = [
  "All",
  "Pending",
  "Preparing",
  "On the Way",
  "Delivered",
  "Cancelled",
];

const timeline = [
  { label: "Order Placed", icon: <Package size={14} /> },
  { label: "Confirmed", icon: <CheckCircle size={14} /> },
  { label: "Preparing", icon: <Clock size={14} /> },
  { label: "Out for Delivery", icon: <Truck size={14} /> },
  { label: "Delivered", icon: <CheckCircle size={14} /> },
];

const prettyStatus = (value: unknown) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatMoney = (value: number) =>
  Number(value || 0).toFixed(2);

const escapeCSV = (value: unknown) => {
  let text = String(value ?? "");

  // Prevent spreadsheet formula injection.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  // Escape double quotes and wrap every value.
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCSV = (filename: string, content: string) => {
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  // Allow the browser to begin processing the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function Orders({
  showToast,
}: {
  showToast: (
    msg: string,
    type?: "success" | "error" | "warning" | "info"
  ) => void;
}) {
  const [tab, setTab] = useState<Status>("All");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All Payments");
  const [dateFilter, setDateFilter] = useState("All Dates");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);

  const perPage = 6;

  const loadOrders = async () => {
    setLoading(true);

    try {
      const { data, error } = await db.orders.list();

      if (error) {
        showToast(error.message, "error");
        return;
      }

      const mapped: Order[] = (data || []).map((x: any) => ({
        id: String(x.id ?? ""),
        customer: x.customers?.name || "Unknown",
        restaurant: x.restaurants?.name || "Unknown",
        items: (x.order_items || []).flatMap((item: any) =>
          Array(Math.max(1, Number(item.quantity) || 1)).fill(
            String(item.name || "Item")
          )
        ),
        total: Number(x.total || 0),
        status: prettyStatus(x.status),
        date: x.created_at
          ? new Date(x.created_at).toLocaleString()
          : "",
        payment: prettyStatus(x.payments?.[0]?.method || ""),
        rider: x.drivers?.name || null,
        address: x.delivery_address || "",
      }));

      setLiveOrders(mapped);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to load orders.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await db.orders.update(id, { status });

    if (error) {
      showToast(error.message, "error");
      return;
    }

    const updatedStatus = prettyStatus(status);

    setLiveOrders((previous) =>
      previous.map((order) =>
        order.id === id ? { ...order, status: updatedStatus } : order
      )
    );

    setSelectedOrder((previous) =>
      previous?.id === id
        ? { ...previous, status: updatedStatus }
        : previous
    );

    showToast("Order status updated.", "success");
  };

  const filtered = liveOrders.filter((order) => {
    const matchesTab = tab === "All" || order.status === tab;

    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      order.id.toLowerCase().includes(searchText) ||
      order.customer.toLowerCase().includes(searchText) ||
      order.restaurant.toLowerCase().includes(searchText);

    const matchesPayment =
      paymentFilter === "All Payments" ||
      order.payment.toLowerCase() === paymentFilter.toLowerCase();

    const orderDate = order.date ? new Date(order.date) : null;
    const validDate =
      orderDate !== null && !Number.isNaN(orderDate.getTime());

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    let matchesDate = true;

    if (dateFilter === "Today") {
      matchesDate =
        validDate && orderDate!.getTime() >= startOfToday.getTime();
    } else if (dateFilter === "Yesterday") {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);

      matchesDate =
        validDate &&
        orderDate!.getTime() >= startOfYesterday.getTime() &&
        orderDate!.getTime() < startOfToday.getTime();
    } else if (dateFilter === "Last 7 Days") {
      const lastSevenDays = new Date(now);
      lastSevenDays.setDate(lastSevenDays.getDate() - 7);

      matchesDate =
        validDate && orderDate!.getTime() >= lastSevenDays.getTime();
    }

    return matchesTab && matchesSearch && matchesPayment && matchesDate;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const safePage = Math.min(page, Math.max(totalPages, 1));

  const paginated = filtered.slice(
    (safePage - 1) * perPage,
    safePage * perPage
  );

  const exportOrdersToCSV = async () => {
    if (exporting) return;

    setExporting(true);

    try {
      // Export all orders currently loaded from the database,
      // independently of the current page, search, and filters.
      let exportOrders = liveOrders;

      // Refresh before export so the file is not limited to stale UI data.
      const { data, error } = await db.orders.list();

      if (error) {
        showToast(
          `Could not refresh orders for export: ${error.message}`,
          "error"
        );
        return;
      }

      exportOrders = (data || []).map((x: any) => ({
        id: String(x.id ?? ""),
        customer: x.customers?.name || "Unknown",
        restaurant: x.restaurants?.name || "Unknown",
        items: (x.order_items || []).map((item: any) => {
          const quantity = Math.max(1, Number(item.quantity) || 1);
          return `${item.name || "Item"} (x${quantity})`;
        }),
        total: Number(x.total || 0),
        status: prettyStatus(x.status),
        date: x.created_at
          ? new Date(x.created_at).toISOString()
          : "",
        payment: prettyStatus(x.payments?.[0]?.method || ""),
        rider: x.drivers?.name || "",
        address: x.delivery_address || "",
      }));

      if (exportOrders.length === 0) {
        showToast("There are no orders to export.", "warning");
        return;
      }

      const headers = [
        "Order ID",
        "Customer",
        "Restaurant",
        "Items",
        "Total (USD)",
        "Payment Method",
        "Status",
        "Rider",
        "Delivery Address",
        "Order Date",
      ];

      const rows = exportOrders.map((order: any) => [
        order.id,
        order.customer,
        order.restaurant,
        Array.isArray(order.items)
          ? order.items.join("; ")
          : "",
        formatMoney(order.total),
        order.payment,
        order.status,
        order.rider,
        order.address,
        order.date,
      ]);

      const csv = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row: unknown[]) =>
          row.map(escapeCSV).join(",")
        ),
      ].join("\r\n");

      const date = new Date().toISOString().slice(0, 10);

      downloadCSV(`bitego-orders-${date}.csv`, csv);

      showToast(
        `${exportOrders.length} orders exported successfully!`,
        "success"
      );
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Failed to export orders.",
        "error"
      );
    } finally {
      setExporting(false);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;

    const target = cancelTarget;
    const { error } = await db.orders.update(target, {
      status: "cancelled",
    });

    if (error) {
      showToast(error.message, "error");
      return;
    }

    setLiveOrders((previous) =>
      previous.map((order) =>
        order.id === target ? { ...order, status: "Cancelled" } : order
      )
    );

    setSelectedOrder((previous) =>
      previous?.id === target
        ? { ...previous, status: "Cancelled" }
        : previous
    );

    showToast(`Order ${target} cancelled.`, "success");
    setCancelTarget(null);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: "#1A1D23",
            }}
          >
            Orders
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 2 }}>
            Manage and track all customer orders
          </p>
        </div>

        <button
          className="btn-secondary"
          onClick={exportOrdersToCSV}
          disabled={exporting || loading}
        >
          <Download size={15} />
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* Status tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {statusTabs.map((status) => (
          <button
            key={status}
            onClick={() => {
              setTab(status);
              setPage(1);
            }}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              border:
                tab === status
                  ? "1px solid #F05A28"
                  : "1px solid #E8EAF0",
              background: tab === status ? "#FFF0EB" : "white",
              color: tab === status ? "#F05A28" : "#6B7280",
              cursor: "pointer",
            }}
          >
            {status}
            <span
              style={{
                marginLeft: 6,
                background: tab === status ? "#F05A28" : "#F3F4F6",
                color: tab === status ? "white" : "#9CA3AF",
                borderRadius: 10,
                padding: "0 6px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {
                liveOrders.filter(
                  (order) =>
                    status === "All" || order.status === status
                ).length
              }
            </span>
          </button>
        ))}
      </div>

      {/* Search and filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div className="search-bar" style={{ maxWidth: 340 }}>
          <Search size={15} color="#9CA3AF" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search orders, customers..."
          />
        </div>

        <select
          className="select"
          style={{ width: 140 }}
          value={paymentFilter}
          onChange={(event) => {
            setPaymentFilter(event.target.value);
            setPage(1);
          }}
        >
          <option>All Payments</option>
          <option>KHQR</option>
          <option>ABA Pay</option>
          <option>ABA PayWay</option>
          <option>Wing</option>
          <option>Cash</option>
          <option>ACLEDA</option>
        </select>

        <select
          className="select"
          style={{ width: 140 }}
          value={dateFilter}
          onChange={(event) => {
            setDateFilter(event.target.value);
            setPage(1);
          }}
        >
          <option>All Dates</option>
          <option>Today</option>
          <option>Yesterday</option>
          <option>Last 7 Days</option>
        </select>
      </div>

      {/* Orders table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Restaurant</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Rider</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "#9CA3AF",
                    }}
                  >
                    Loading orders...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "#9CA3AF",
                    }}
                  >
                    No orders found
                  </td>
                </tr>
              ) : (
                paginated.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600, color: "#F05A28" }}>
                      {order.id}
                    </td>
                    <td style={{ fontWeight: 500 }}>{order.customer}</td>
                    <td style={{ color: "#6B7280" }}>
                      {order.restaurant}
                    </td>
                    <td>
                      {order.items.length} item
                      {order.items.length === 1 ? "" : "s"}
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      ${formatMoney(order.total)}
                    </td>
                    <td>
                      <span className="badge badge-muted">
                        {order.payment || "—"}
                      </span>
                    </td>
                    <td style={{ color: order.rider ? "#374151" : "#9CA3AF" }}>
                      {order.rider || "—"}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          statusColor[order.status] || "badge-muted"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td style={{ color: "#9CA3AF", fontSize: 12 }}>
                      {order.date || "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => setSelectedOrder(order)}
                          style={{
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid #E8EAF0",
                            background: "white",
                            cursor: "pointer",
                            fontSize: 12,
                            color: "#374151",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Eye size={13} /> View
                        </button>

                        {order.status !== "Cancelled" &&
                          order.status !== "Delivered" && (
                            <button
                              onClick={() => setCancelTarget(order.id)}
                              style={{
                                padding: "5px 10px",
                                borderRadius: 6,
                                border: "1px solid #FECACA",
                                background: "#FEF2F2",
                                cursor: "pointer",
                                fontSize: 12,
                                color: "#EF4444",
                              }}
                            >
                              Cancel
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, color: "#6B7280" }}>
            Showing{" "}
            {filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1}
            {"–"}
            {Math.min(safePage * perPage, filtered.length)} of{" "}
            {filtered.length} orders
          </span>

          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={safePage <= 1}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #E8EAF0",
                background: "white",
                cursor: safePage > 1 ? "pointer" : "not-allowed",
                opacity: safePage <= 1 ? 0.4 : 1,
              }}
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index}
                onClick={() => setPage(index + 1)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border:
                    safePage === index + 1
                      ? "1px solid #F05A28"
                      : "1px solid #E8EAF0",
                  background:
                    safePage === index + 1 ? "#F05A28" : "white",
                  color: safePage === index + 1 ? "white" : "#374151",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {index + 1}
              </button>
            ))}

            <button
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              disabled={safePage >= totalPages || totalPages === 0}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #E8EAF0",
                background: "white",
                cursor:
                  safePage < totalPages ? "pointer" : "not-allowed",
                opacity:
                  safePage >= totalPages || totalPages === 0 ? 0.4 : 1,
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Order detail modal */}
      {selectedOrder && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 540 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 20,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#1A1D23",
                  }}
                >
                  {selectedOrder.id}
                </h3>
                <p style={{ fontSize: 13, color: "#9CA3AF" }}>
                  {selectedOrder.date}
                </p>
              </div>

              <select
                className="select"
                style={{ width: 150 }}
                value={selectedOrder.status.replace(/ /g, "_").toLowerCase()}
                onChange={(event) =>
                  void updateStatus(selectedOrder.id, event.target.value)
                }
              >
                <option value="pending">Pending</option>
                <option value="preparing">Preparing</option>
                <option value="on_the_way">On the Way</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div
              style={{
                background: "#F9FAFB",
                borderRadius: 10,
                padding: 14,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "#9CA3AF",
                  fontWeight: 600,
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Customer
              </div>

              <div style={{ fontWeight: 600, color: "#1A1D23" }}>
                {selectedOrder.customer}
              </div>

              <div style={{ fontSize: 13, color: "#6B7280", marginTop: 5 }}>
                Payment: {selectedOrder.payment || "—"} · Rider:{" "}
                {selectedOrder.rider || "Not assigned"}
              </div>

              {selectedOrder.address && (
                <div style={{ fontSize: 13, color: "#6B7280", marginTop: 5 }}>
                  Address: {selectedOrder.address}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#9CA3AF",
                  fontWeight: 600,
                  marginBottom: 10,
                  textTransform: "uppercase",
                }}
              >
                Order Items
              </div>

              {selectedOrder.items.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #F3F4F6",
                  }}
                >
                  <span style={{ fontSize: 14, color: "#374151" }}>
                    {item}
                  </span>
                </div>
              ))}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                <span style={{ color: "#1A1D23" }}>Total</span>
                <span style={{ color: "#F05A28" }}>
                  ${formatMoney(selectedOrder.total)}
                </span>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#9CA3AF",
                  fontWeight: 600,
                  marginBottom: 12,
                  textTransform: "uppercase",
                }}
              >
                Order Timeline
              </div>

              <div style={{ display: "flex", alignItems: "center" }}>
                {timeline.map((step, index) => {
                  const statusIndex = {
                    Pending: 0,
                    Preparing: 2,
                    "On the Way": 3,
                    Delivered: 4,
                    Cancelled: -1,
                  }[selectedOrder.status] ?? 0;

                  const done =
                    selectedOrder.status !== "Cancelled" &&
                    index <= statusIndex;

                  return (
                    <div
                      key={step.label}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        {index > 0 && (
                          <div
                            style={{
                              flex: 1,
                              height: 2,
                              background: done ? "#F05A28" : "#E8EAF0",
                            }}
                          />
                        )}

                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: done ? "#F05A28" : "#F3F4F6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: done ? "white" : "#9CA3AF",
                            flexShrink: 0,
                          }}
                        >
                          {step.icon}
                        </div>

                        {index < timeline.length - 1 && (
                          <div
                            style={{
                              flex: 1,
                              height: 2,
                              background: done ? "#F05A28" : "#E8EAF0",
                            }}
                          />
                        )}
                      </div>

                      <span
                        style={{
                          fontSize: 10,
                          color: done ? "#F05A28" : "#9CA3AF",
                          fontWeight: done ? 600 : 400,
                          textAlign: "center",
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                marginTop: 20,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn-secondary"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel confirmation */}
      {cancelTarget && (
        <ConfirmModal
          title="Cancel Order"
          message={`Are you sure you want to cancel order ${cancelTarget}? This action cannot be undone.`}
          confirmLabel="Cancel Order"
          danger
          onConfirm={() => void confirmCancel()}
          onCancel={() => setCancelTarget(null)}
        />
      )}
    </div>
  );
}
