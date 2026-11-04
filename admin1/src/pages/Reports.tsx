import { Download, TrendingUp, ShoppingBag, Users, Store } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { revenueData, weeklyOrders, orders, restaurants, customers } from "../data/mockData";

const topRestaurants = [
  { name: "Angkor Kitchen", revenue: 48200, orders: 2340 },
  { name: "Mekong BBQ House", revenue: 55800, orders: 1540 },
  { name: "Phnom Penh Street Eats", revenue: 32100, orders: 1870 },
  { name: "Sweet Lotus Desserts", revenue: 14200, orders: 890 },
  { name: "Riverside Café", revenue: 18900, orders: 680 },
];

const customerGrowth = [
  { month: "Jul", new: 412 }, { month: "Aug", new: 489 },
  { month: "Sep", new: 534 }, { month: "Oct", new: 612 },
  { month: "Nov", new: 698 }, { month: "Dec", new: 743 },
];

export default function Reports({ showToast }: { showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void }) {
  const totalRevenue=orders.reduce((a:any,o:any)=>a+Number(o.total||0),0);
  const delivered=orders.filter((o:any)=>o.status==="Delivered").length;
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#1A1D23" }}>Reports</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 2 }}>Analytics and performance insights</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="select" style={{ width: 140 }}>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
            <option>This Year</option>
          </select>
          
<button
  className="btn-secondary"
  onClick={() => {
    const reportWindow = window.open(
      "",
      "_blank",
      "width=1000,height=800"
    );

    if (!reportWindow) {
      showToast(
        "Please allow pop-ups to export the report.",
        "error"
      );
      return;
    }

    const money = (value: number) =>
      `$${Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const generatedAt = new Date().toLocaleString();

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(
      (o: any) =>
        String(o.status).toLowerCase() === "delivered"
    ).length;

    const averageOrderValue = totalOrders
      ? totalRevenue / totalOrders
      : 0;

    const activeRestaurants = restaurants.filter(
      (r: any) =>
        String(r.status).toLowerCase() === "active"
    ).length;

    const orderRows = orders.length
      ? orders.map((o: any, index: number) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(
              String(o.id ?? o.order_number ?? "—")
            )}</td>
            <td>${escapeHtml(
              String(o.status ?? "Unknown")
            )}</td>
            <td class="number">${money(Number(o.total || 0))}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="4">No orders available.</td></tr>`;

    function escapeHtml(value: string) {
      return value.replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char] || char));
    }

    const reportHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>BiteGo Business Report</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #1f2937;
            margin: 0;
            padding: 36px;
            font-size: 12px;
          }
          header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 22px;
            border-bottom: 3px solid #f05a28;
          }
          h1 {
            font-size: 27px;
            margin: 0 0 8px;
            color: #f05a28;
          }
          h2 {
            font-size: 16px;
            margin: 28px 0 12px;
          }
          p { color: #6b7280; line-height: 1.6; }
          .meta { text-align: right; line-height: 1.8; }
          .metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-top: 24px;
          }
          .metric {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
          }
          .metric-label {
            color: #6b7280;
            font-size: 11px;
          }
          .metric-value {
            font-size: 22px;
            font-weight: bold;
            margin-top: 8px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
          }
          th, td {
            padding: 11px 9px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
            overflow-wrap: anywhere;
          }
          th {
            background: #f3f4f6;
            color: #374151;
          }
          .number { text-align: right; }
          .footer {
            margin-top: 35px;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
          }
          .print-button {
            margin-top: 24px;
            padding: 11px 18px;
            background: #f05a28;
            color: white;
            border: 0;
            border-radius: 6px;
            cursor: pointer;
          }
          @media print {
            body { padding: 0; }
            .print-button { display: none; }
            .metrics { grid-template-columns: repeat(4, 1fr); }
            tr { break-inside: avoid; }
            h2 { break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>BiteGo</h1>
            <strong>Business Performance Report</strong>
            <p>Administrative analytics and operations summary</p>
          </div>
          <div class="meta">
            <strong>REPORT</strong><br />
            Generated: ${escapeHtml(generatedAt)}<br />
            Period: All currently loaded data
          </div>
        </header>

        <h2>Executive Summary</h2>
        <div class="metrics">
          <div class="metric">
            <div class="metric-label">Total Revenue</div>
            <div class="metric-value">${money(totalRevenue)}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Total Orders</div>
            <div class="metric-value">${totalOrders.toLocaleString()}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Customers</div>
            <div class="metric-value">${customers.length.toLocaleString()}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Active Restaurants</div>
            <div class="metric-value">${activeRestaurants.toLocaleString()}</div>
          </div>
        </div>

        <h2>Order Performance</h2>
        <table>
          <thead>
            <tr><th>Metric</th><th>Value</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Delivered Orders</td>
              <td>${deliveredOrders}</td>
            </tr>
            <tr>
              <td>Delivery Rate</td>
              <td>${totalOrders
                ? ((deliveredOrders / totalOrders) * 100).toFixed(1)
                : "0.0"}%</td>
            </tr>
            <tr>
              <td>Average Order Value</td>
              <td>${money(averageOrderValue)}</td>
            </tr>
          </tbody>
        </table>

        <h2>Order Details</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Order ID</th>
              <th>Status</th>
              <th class="number">Total</th>
            </tr>
          </thead>
          <tbody>${orderRows}</tbody>
        </table>

        <div class="footer">
          BiteGo Admin Dashboard · Confidential business report<br />
          Values reflect data currently loaded by the dashboard.
        </div>

        <button class="print-button" onclick="window.print()">
          Print / Save as PDF
        </button>
      </body>
      </html>
    `;

    reportWindow.document.open();
    reportWindow.document.write(reportHtml);
    reportWindow.document.close();

    showToast(
      "Professional report generated. Choose Print / Save as PDF.",
      "success"
    );
  }}
>
  <Download size={15} /> Export PDF
</button>

        </div>
      </div>

      {/* KPI summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { icon: <TrendingUp size={18} />, label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, sub: "Dec 2024", color: "#F05A28", bg: "#FFF0EB" },
          { icon: <ShoppingBag size={18} />, label: "Total Orders", value: String(orders.length), sub: "This month", color: "#3B82F6", bg: "#DBEAFE" },
          { icon: <Users size={18} />, label: "New Customers", value: String(customers.length), sub: "This month", color: "#22C55E", bg: "#DCFCE7" },
          { icon: <Store size={18} />, label: "Active Restaurants", value: String(restaurants.filter((r:any)=>r.status==="Active").length), sub: "On platform", color: "#F59E0B", bg: "#FEF3C7" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: "#1A1D23" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue trend + Customer growth */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1D23", marginBottom: 16 }}>Revenue Trend (2024)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F05A28" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#F05A28" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`$${Number(v ?? 0).toLocaleString()}`]} contentStyle={{ borderRadius: 8, border: "1px solid #E8EAF0", fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#F05A28" strokeWidth={2} fill="url(#revG)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1D23", marginBottom: 16 }}>New Customers (6 months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={customerGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E8EAF0", fontSize: 12 }} />
              <Line type="monotone" dataKey="new" stroke="#22C55E" strokeWidth={2} dot={{ fill: "#22C55E", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders by day + Top restaurants */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1D23", marginBottom: 16 }}>Orders by Day of Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E8EAF0", fontSize: 12 }} />
              <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1D23" }}>Top Restaurants</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {topRestaurants.map((r, i) => {
              const maxRev = Math.max(...topRestaurants.map((x) => x.revenue));
              const pct = (r.revenue / maxRev) * 100;
              return (
                <div key={r.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF" }}>#{i + 1}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{r.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#F05A28" }}>${(r.revenue / 1000).toFixed(1)}k</span>
                  </div>
                  <div style={{ height: 4, background: "#F3F4F6", borderRadius: 2 }}>
                    <div style={{ height: "100%", background: "#F05A28", width: `${pct}%`, borderRadius: 2, opacity: 1 - i * 0.15 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
