
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Store,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import { useMemo, useState } from "react";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  revenueData,
  categoryRevenueData,
  weeklyOrders,
  popularFoods,
  orders,
  customers,
  restaurants,
} from "../data/mockData";

const statusColor: Record<string, string> = {
  Delivered: "badge-success",
  Preparing: "badge-info",
  "On the Way": "badge-primary",
  Pending: "badge-warning",
  Cancelled: "badge-danger",
};

const formatMoney = (value: number) =>
  `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatOrderDate = (value: unknown) => {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Dashboard() {
  const currentDate = new Date();

  const currentYear = currentDate.getFullYear();

  const [selectedYear, setSelectedYear] = useState(
    String(currentYear)
  );

  const [selectedPeriod, setSelectedPeriod] = useState(
    "Last 30 Days"
  );

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    []
  );

  // NOTE:
  // The following metrics still use mockData.
  // Connect them to your database before using them
  // as official business analytics.

  const totalRevenue = orders.reduce(
    (sum: number, order: any) =>
      sum + Number(order.total || 0),
    0
  );

  const activeOrders = orders.filter(
    (order: any) =>
      !["Delivered", "Cancelled"].includes(order.status)
  ).length;

  const deliveredOrders = orders.filter(
    (order: any) => order.status === "Delivered"
  ).length;

  const deliveryRate = orders.length
    ? (deliveredOrders / orders.length) * 100
    : 0;

  const averageOrderValue = orders.length
    ? totalRevenue / orders.length
    : 0;

  const activeRestaurants = restaurants.filter(
    (restaurant: any) =>
      String(restaurant.status).toLowerCase() === "active"
  ).length;

  const stats = [
    {
      label: "Total Revenue",
      value: formatMoney(totalRevenue),
      change: "All loaded orders",
      up: true,
      icon: <TrendingUp size={20} />,
      color: "#F05A28",
      bg: "#FFF0EB",
    },
    {
      label: "Total Orders",
      value: String(orders.length),
      change: "All loaded orders",
      up: true,
      icon: <ShoppingBag size={20} />,
      color: "#3B82F6",
      bg: "#DBEAFE",
    },
    {
      label: "Customers",
      value: String(customers.length),
      change: "All loaded customers",
      up: true,
      icon: <Users size={20} />,
      color: "#22C55E",
      bg: "#DCFCE7",
    },
    {
      label: "Active Restaurants",
      value: String(activeRestaurants),
      change: "Currently listed",
      up: true,
      icon: <Store size={20} />,
      color: "#F59E0B",
      bg: "#FEF3C7",
    },
  ];

  const pendingPayments = orders
    .filter(
      (order: any) =>
        String(order.status).toLowerCase() === "pending"
    )
    .slice(0, 3)
    .map((order: any) => ({
      id: order.id,
      customer: order.customer || "Unknown customer",
      amount: formatMoney(Number(order.total || 0)),
      method: order.payment || "Not specified",
    }));

  const years = Array.from(
    { length: 5 },
    (_, index) => currentYear - index
  );

  return (
    <div>
      {/* Dashboard header */}
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
            Dashboard
          </h1>

          <p
            style={{
              color: "#6B7280",
              fontSize: 14,
              marginTop: 2,
            }}
          >
            Welcome back, Super Admin. Here's what's happening today.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "#6B7280",
              whiteSpace: "nowrap",
            }}
          >
            {todayLabel}
          </span>

          <select
            className="select"
            style={{ width: "auto" }}
            value={selectedPeriod}
            onChange={(event) =>
              setSelectedPeriod(event.target.value)
            }
            aria-label="Dashboard date range"
          >
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>This Year</option>
          </select>
        </div>
      </div>

      {/* KPI statistics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="stat-card"
            style={{ minWidth: 0 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: stat.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: stat.color,
                  flexShrink: 0,
                }}
              >
                {stat.icon}
              </div>

              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#6B7280",
                  textAlign: "right",
                }}
              >
                <ArrowUpRight size={14} />
                {stat.change}
              </span>
            </div>

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#1A1D23",
                  overflowWrap: "anywhere",
                }}
              >
                {stat.value}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  marginTop: 3,
                }}
              >
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional performance indicators */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Active Orders",
            value: String(activeOrders),
          },
          {
            label: "Delivery Rate",
            value: `${deliveryRate.toFixed(1)}%`,
          },
          {
            label: "Average Order Value",
            value: formatMoney(averageOrderValue),
          },
        ].map((metric) => (
          <div
            key={metric.label}
            className="card"
            style={{ padding: 16 }}
          >
            <div style={{ fontSize: 12, color: "#6B7280" }}>
              {metric.label}
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#1A1D23",
                marginTop: 6,
              }}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue chart and pending payments */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: 20, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#1A1D23",
                }}
              >
                Revenue Overview
              </h3>

              <p
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  marginTop: 4,
                }}
              >
                Monthly revenue for {selectedYear}
              </p>
            </div>

            <select
              className="select"
              style={{ width: "auto", fontSize: 13 }}
              value={selectedYear}
              onChange={(event) =>
                setSelectedYear(event.target.value)
              }
              aria-label="Revenue chart year"
            >
              {years.map((year) => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient
                  id="dashboardRevenueGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="#F05A28"
                    stopOpacity={0.15}
                  />
                  <stop
                    offset="95%"
                    stopColor="#F05A28"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
              />

              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) =>
                  `$${(Number(value) / 1000).toFixed(0)}k`
                }
              />

              <Tooltip
                formatter={(value) => [
                  formatMoney(Number(value ?? 0)),
                  "Revenue",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E8EAF0",
                  fontSize: 13,
                }}
              />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#F05A28"
                strokeWidth={2}
                fill="url(#dashboardRevenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>

          <p
            style={{
              color: "#9CA3AF",
              fontSize: 11,
              marginTop: 8,
            }}
          >
            Chart values currently use the configured revenue dataset.
            The year selector requires year-specific data filtering.
          </p>
        </div>

        {/* Pending payments */}
        <div className="card" style={{ padding: 20, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <Clock size={16} color="#F05A28" />

            <h3
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 16,
                fontWeight: 700,
                color: "#1A1D23",
              }}
            >
              Pending Payments
            </h3>
          </div>

          {pendingPayments.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "28px 8px",
                color: "#6B7280",
                fontSize: 13,
              }}
            >
              No pending orders found.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {pendingPayments.map((payment) => (
                <div
                  key={payment.id}
                  style={{
                    padding: 12,
                    background: "#FFFBF9",
                    borderRadius: 8,
                    border: "1px solid #FEE2D5",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1A1D23",
                        }}
                      >
                        {payment.customer}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#9CA3AF",
                          marginTop: 4,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {payment.id} · {payment.method}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#F05A28",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {payment.amount}
                    </span>
                  </div>
                </div>
              ))}

              <div
                style={{
                  textAlign: "center",
                  padding: "8px 0",
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                Showing up to 3 pending orders
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weekly orders, category revenue, and popular foods */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 280px minmax(0, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Weekly orders */}
        <div className="card" style={{ padding: 20, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#1A1D23",
              marginBottom: 16,
            }}
          >
            Orders This Week
          </h3>

          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyOrders}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F3F4F6"
                vertical={false}
              />

              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                tick={{ fontSize: 12, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                formatter={(value) => [
                  Number(value ?? 0),
                  "Orders",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E8EAF0",
                  fontSize: 13,
                }}
              />

              <Bar
                dataKey="orders"
                fill="#F05A28"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by category */}
        <div className="card" style={{ padding: 20, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#1A1D23",
              marginBottom: 8,
            }}
          >
            Revenue by Category
          </h3>

          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={categoryRevenueData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
                nameKey="name"
              >
                {categoryRevenueData.map((entry, index) => (
                  <Cell
                    key={`${entry.name}-${index}`}
                    fill={entry.color}
                  />
                ))}
              </Pie>

              <Tooltip
                formatter={(value) => [
                  `${Number(value ?? 0)}%`,
                  "Share",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E8EAF0",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {categoryRevenueData.slice(0, 3).map((category) => (
              <div
                key={category.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: category.color,
                    flexShrink: 0,
                  }}
                />

                <span style={{ color: "#6B7280", flex: 1 }}>
                  {category.name}
                </span>

                <span
                  style={{
                    fontWeight: 600,
                    color: "#374151",
                  }}
                >
                  {category.value}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Popular foods */}
        <div className="card" style={{ padding: 20, minWidth: 0 }}>
          <h3
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#1A1D23",
              marginBottom: 16,
            }}
          >
            Popular Foods
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {popularFoods.map((food, index) => (
              <div
                key={food.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#9CA3AF",
                    width: 16,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  #{index + 1}
                </span>

                <img
                  src={food.image}
                  alt={food.name}
                  loading="lazy"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#1A1D23",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {food.name}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#9CA3AF",
                      marginTop: 3,
                    }}
                  >
                    {food.orders} orders
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#F05A28",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatMoney(Number(food.revenue))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #F3F4F6",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h3
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              color: "#1A1D23",
            }}
          >
            Recent Orders
          </h3>

          <span style={{ fontSize: 12, color: "#9CA3AF" }}>
            Showing latest 5 loaded records
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Restaurant</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Date & Time</th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: 32,
                      color: "#6B7280",
                    }}
                  >
                    No orders available.
                  </td>
                </tr>
              ) : (
                orders.slice(0, 5).map((order: any) => (
                  <tr key={order.id}>
                    <td
                      style={{
                        fontWeight: 600,
                        color: "#F05A28",
                      }}
                    >
                      {order.id}
                    </td>

                    <td>{order.customer || "—"}</td>

                    <td style={{ color: "#6B7280" }}>
                      {order.restaurant || "—"}
                    </td>

                    <td style={{ fontWeight: 600 }}>
                      {formatMoney(Number(order.total || 0))}
                    </td>

                    <td>
                      <span className="badge badge-muted">
                        {order.payment || "—"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          statusColor[order.status] ||
                          "badge-muted"
                        }`}
                      >
                        {order.status || "Unknown"}
                      </span>
                    </td>

                    <td
                      style={{
                        color: "#9CA3AF",
                        fontSize: 12,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatOrderDate(order.date)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dashboard responsive layout */}
      <style>{`
        @media (max-width: 1100px) {
          .dashboard-responsive-placeholder {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
