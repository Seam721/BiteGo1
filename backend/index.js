import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const app = express();
const configuredOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // Permit server-to-server requests without an Origin header. In production,
    // set CORS_ORIGIN to the exact deployed customer/admin origins.
    if (!origin || configuredOrigins.length === 0 || configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS."));
  },
}));
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT || 3000);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// Use a privileged key only on this server so payment/order writes can pass RLS
// without exposing a secret to the customer or admin browser applications.
const SUPABASE_SERVER_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_KEY = SUPABASE_SERVER_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in backend/.env."
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const hasPrivilegedServerKey = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
);

function sendDbError(res, error, fallback = "Database request failed.") {
  console.error(error);
  const message = process.env.NODE_ENV === "production" ? fallback : (error?.message || fallback);
  return res.status(400).json({ message });
}

function mapRestaurant(row) {
  const min = Number(row.delivery_time_min ?? 20);
  const max = Number(row.delivery_time_max ?? 30);
  return {
    id: Number(row.id),
    name: row.name,
    cuisine: row.cuisine || "Cambodian",
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews || 0),
    deliveryTime: `${min}–${max}`,
    deliveryFee: Number(row.delivery_fee || 0),
    minOrder: Number(row.min_order || 0),
    image: row.image_url || "",
    badge:
      row.status !== "active"
        ? undefined
        : Number(row.delivery_fee || 0) === 0
          ? "Free Delivery"
          : Number(row.rating || 0) >= 4.8
            ? "Top Rated"
            : undefined,
    tags: Array.isArray(row.tags) && row.tags.length ? row.tags : [row.cuisine || "Cambodian"],
    distance: `${Number(row.distance_km || 0).toFixed(1)} km`,
  };
}

function mapMenu(row) {
  return {
    id: Number(row.id),
    restaurantId: Number(row.restaurant_id),
    name: row.name,
    description: row.description || "",
    price: Number(row.price || 0),
    image: row.image_url || "",
    category: row.categories?.name || row.category_name || "Other",
    popular: Boolean(row.popular),
    spicy: Boolean(row.spicy),
    rating: Number(row.rating || 0),
    reviews: Number(row.reviews || 0),
  };
}

function orderId() {
  return `F6-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

// Public customer-facing reads.
app.get("/api/restaurants", async (_req, res) => {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) return sendDbError(res, error);
  res.json((data || []).map(mapRestaurant));
});

app.get("/api/menu-items", async (req, res) => {
  let query = supabase
    .from("menu_items")
    .select("*, categories(name)")
    .eq("available", true)
    .order("created_at", { ascending: false });

  if (req.query.restaurantId) {
    query = query.eq("restaurant_id", Number(req.query.restaurantId));
  }

  const { data, error } = await query;
  if (error) return sendDbError(res, error);
  res.json((data || []).map(mapMenu));
});

app.get("/api/categories", async (_req, res) => {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("status", "active")
    .order("display_order");
  if (error) return sendDbError(res, error);
  res.json(data || []);
});

// Orders
app.post("/api/orders", async (req, res) => {
  const {
    items,
    address,
    paymentMethod,
    subtotal,
    deliveryFee,
    discount,
    total,
    promoCode,
    customerName,
    customerPhone,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0 || items.length > 50)
    return res.status(400).json({ message: "Order must include between 1 and 50 items." });
  if (typeof address !== "string" || !address.trim() || address.trim().length > 1000)
    return res.status(400).json({ message: "A valid delivery address is required." });
  const allowedMethods = ["khqr", "aba", "acleda", "wing", "cash"];
  if (!allowedMethods.includes(String(paymentMethod || "").toLowerCase()))
    return res.status(400).json({ message: "Choose a supported payment method." });
  if (!Number.isFinite(Number(total)) || Number(total) <= 0 || Number(total) > 100000)
    return res.status(400).json({ message: "Order total must be greater than zero and within the allowed limit." });
  if (items.some((item) => !Number.isFinite(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 99))
    return res.status(400).json({ message: "Each item quantity must be between 1 and 99." });

  // Re-read product prices from Supabase. Never trust names/prices/restaurant IDs
  // sent by the browser when creating a real order.
  const itemIds = [...new Set(items.map((item) => Number(item.id)).filter((id) => Number.isInteger(id) && id > 0))];
  if (itemIds.length !== new Set(items.map((item) => Number(item.id))).size) {
    return res.status(400).json({ message: "The cart contains an invalid menu item. Please refresh and try again." });
  }
  const { data: dbItems, error: menuError } = await supabase
    .from("menu_items")
    .select("id,name,price,restaurant_id,available")
    .in("id", itemIds)
    .eq("available", true);
  if (menuError) return sendDbError(res, menuError);
  const menuMap = new Map((dbItems || []).map((item) => [Number(item.id), item]));
  if (menuMap.size !== itemIds.length) {
    return res.status(409).json({ message: "One or more menu items are no longer available. Refresh the menu and try again." });
  }
  const restaurantIds = [...new Set(items.map((item) => Number(menuMap.get(Number(item.id))?.restaurant_id)))];
  if (restaurantIds.length !== 1 || !restaurantIds[0]) {
    return res.status(400).json({ message: "Please order from one restaurant at a time." });
  }
  const restaurantId = restaurantIds[0];
  const verifiedSubtotal = items.reduce((sum, item) => {
    const dbItem = menuMap.get(Number(item.id));
    return sum + Number(dbItem.price) * Number(item.quantity);
  }, 0);
  const verifiedDeliveryFee = 1.5;
  const promo = String(promoCode || "").trim().toUpperCase();
  if (promo && promo !== "KHMER10") {
    return res.status(400).json({ message: "This promo code is not valid." });
  }
  const verifiedDiscount = promo === "KHMER10" ? verifiedSubtotal * 0.1 : 0;
  const verifiedTotal = Math.round((verifiedSubtotal + verifiedDeliveryFee - verifiedDiscount) * 100) / 100;
  if (Math.abs(Number(total) - verifiedTotal) > 0.02) {
    return res.status(409).json({ message: "The menu price or order total changed. Please review your cart and try again." });
  }

  const authHeader = req.headers.authorization || "";
  const authToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  let authenticatedUser = null;
  if (authToken) {
    const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
    if (!userError && user) authenticatedUser = user;
  }

  let customerId = null;
  if (customerPhone || customerName || authenticatedUser) {
    const linkedLookup = authenticatedUser
      ? await supabase.from("customers").select("id").eq("auth_user_id", authenticatedUser.id).maybeSingle()
      : { data: null, error: null };
    if (linkedLookup.error) return sendDbError(res, linkedLookup.error);
    const lookup = linkedLookup.data ? linkedLookup : (customerPhone
      ? await supabase.from("customers").select("id").eq("phone", customerPhone).maybeSingle()
      : { data: null, error: null });

    if (lookup.error) return sendDbError(res, lookup.error);
    if (lookup.data) {
      customerId = lookup.data.id;
      if (customerName || authenticatedUser) {
        await supabase.from("customers").update({ ...(customerName ? { name: customerName } : {}), ...(authenticatedUser ? { auth_user_id: authenticatedUser.id } : {}) }).eq("id", customerId);
      }
    } else {
      const created = await supabase
        .from("customers")
        .insert({
          name: customerName || authenticatedUser?.user_metadata?.full_name || "BiteGo Customer",
          phone: customerPhone || null,
          auth_user_id: authenticatedUser?.id || null,
        })
        .select("id")
        .single();
      if (created.error) return sendDbError(res, created.error);
      customerId = created.data.id;
    }
  }

  // Keep the authenticated profile phone aligned with the checkout phone.
  // Order creation must not fail solely because profile RLS is misconfigured;
  // the history endpoint will surface a clear message if the profile cannot
  // be linked.
  if (authenticatedUser) {
      const profileDb = hasPrivilegedServerKey
        ? supabase
        : createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
            global: { headers: { Authorization: `Bearer ${authToken}` } },
          });
      const { error: profileSaveError } = await profileDb
        .from("profiles")
        .upsert({
          id: authenticatedUser.id,
          full_name: customerName || authenticatedUser.user_metadata?.full_name || "BiteGo Customer",
          email: authenticatedUser.email || null,
          phone: customerPhone || null,
        }, { onConflict: "id" });
      if (profileSaveError) {
        console.warn("Could not sync checkout details to customer profile:", profileSaveError.message);
      }
  }

  const id = orderId();
  const order = {
    id,
    customer_id: customerId,
    restaurant_id: restaurantId,
    total: verifiedTotal,
    subtotal: verifiedSubtotal,
    delivery_fee: verifiedDeliveryFee,
    discount: verifiedDiscount,
    promo_code: promo || null,
    status: "pending",
    payment_status: paymentMethod === "cash" ? "pending" : "pending",
    payment_method: paymentMethod,
    delivery_address: address,
    notes: null,
  };

  const { data: savedOrder, error: orderError } = await supabase
    .from("orders")
    .insert(order)
    .select("*")
    .single();

  if (orderError) return sendDbError(res, orderError);

const orderItems = items.map((item) => {
  const verifiedItem = menuMap.get(Number(item.id));
  const quantity = Number(item.quantity);
  // Persist the same database-verified product data used to calculate the
  // order total. Never store a browser-supplied name or price.
  const unitPrice = Number(verifiedItem.price);
  const itemName = verifiedItem.name;
  const itemSubtotal = Math.round(quantity * unitPrice * 100) / 100;

  return {
    order_id: id,
    menu_item_id: Number(item.id),
    name: itemName,
    quantity,
    price: unitPrice,
    subtotal: itemSubtotal
  };
});

  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) {
    await supabase.from("orders").delete().eq("id", id);
    return sendDbError(res, itemsError);
  }

  // Cash orders get a payment record immediately. Digital orders get their
  // payment record when the KHQR/payment endpoint is opened.
  if (paymentMethod === "cash") {
    if (!hasPrivilegedServerKey) {
      return res.status(503).json({
        message: "Payment storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) to backend/.env and restart the backend."
      });
    }
    const { error: paymentError } = await supabase.from("payments").insert({
      order_id: id,
      customer_id: customerId,
      payment_code: `PAY-${id}`,
      amount: Number(total),
      method: paymentMethod,
      status: "pending",
    });
    if (paymentError) return sendDbError(res, paymentError);
  }

  res.status(201).json({
    id: savedOrder.id,
    status: savedOrder.status,
    total: verifiedTotal,
    paymentMethod,
    address,
    createdAt: savedOrder.created_at,
  });
});

app.get("/api/my/orders", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Sign in to view your order history." });

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ message: "Your session has expired. Please sign in again." });
    }

    // Use the service-role client for server-side reads when configured.
    // Otherwise scope the publishable client to the verified user's JWT so
    // Supabase RLS policies still apply.
    const historyDb = hasPrivilegedServerKey
      ? supabase
      : createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

    const { data: profile, error: profileError } = await historyDb
      .from("profiles")
      .select("phone")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) return sendDbError(res, profileError, "Could not load your profile.");

    const phone = String(profile?.phone || "").trim();
    const customerQueries = await Promise.all([
      historyDb.from("customers").select("id").eq("auth_user_id", user.id),
      phone ? historyDb.from("customers").select("id").eq("phone", phone) : Promise.resolve({ data: [], error: null })
    ]);
    const customerError = customerQueries.find(result => result.error)?.error;
    if (customerError) return sendDbError(res, customerError, "Could not find your customer record.");
    const customerIds = [...new Set(customerQueries.flatMap(result => (result.data || []).map(customer => customer.id)))];
    if (!customerIds.length) return res.json({ orders: [], totalOrders: 0, completedOrders: 0 });

    const [ordersResult, completedResult] = await Promise.all([
      historyDb
        .from("orders")
        .select("id, customer_id, restaurant_id, status, subtotal, delivery_fee, discount, total, created_at, payment_method, payment_status", { count: "exact" })
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false })
        .limit(50),
      historyDb
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("customer_id", customerIds)
        .in("status", ["delivered", "completed"]),
    ]);
    if (ordersResult.error) return sendDbError(res, ordersResult.error, "Could not load your orders.");
    if (completedResult.error) return sendDbError(res, completedResult.error, "Could not load your order summary.");

    const rows = ordersResult.data || [];
    const orderSummary = {
      totalOrders: ordersResult.count ?? rows.length,
      completedOrders: completedResult.count ?? 0,
    };
    if (!rows.length) return res.json({ orders: [], ...orderSummary });

    const orderIds = rows.map((order) => order.id);
    const restaurantIds = [...new Set(rows.map((order) => order.restaurant_id).filter(Boolean))];
    const [restaurantResult, itemResult] = await Promise.all([
      restaurantIds.length
        ? historyDb.from("restaurants").select("id,name").in("id", restaurantIds)
        : Promise.resolve({ data: [], error: null }),
      historyDb.from("order_items").select("order_id,name,quantity").in("order_id", orderIds),
    ]);

    if (restaurantResult.error) return sendDbError(res, restaurantResult.error, "Could not load restaurant details.");
    if (itemResult.error) return sendDbError(res, itemResult.error, "Could not load order items.");

    const restaurantMap = new Map((restaurantResult.data || []).map((row) => [String(row.id), row.name]));
    const itemMap = new Map();
    for (const item of itemResult.data || []) {
      const key = String(item.order_id);
      itemMap.set(key, [...(itemMap.get(key) || []), item]);
    }

    return res.json({
      ...orderSummary,
      orders: rows.map((order) => ({
        ...order,
        restaurant_name: restaurantMap.get(String(order.restaurant_id)) || "BiteGo order",
        items: itemMap.get(String(order.id)) || [],
      })),
    });
  } catch (error) {
    return sendDbError(res, error, "Could not load your order history.");
  }
});

app.get("/api/orders/:id", async (req, res) => {
  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), payments(*)")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) return sendDbError(res, error);
  if (!data) return res.status(404).json({ message: "Order not found." });

  res.json({
    id: data.id,
    status: data.status,
    total: Number(data.total || 0),
    paymentMethod: data.payment_method || data.payments?.[0]?.method || "khqr",
    address: data.delivery_address || "",
    createdAt: data.created_at,
    items: data.order_items || [],
    paymentStatus: data.payment_status || data.payments?.[0]?.status || "pending",
  });
});

// Backend management endpoints require a valid Supabase admin session.
// The service-role key must never be exposed to a browser.
async function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Admin sign-in is required." });
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ message: "Invalid or expired admin session." });
    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role,status").eq("id", user.id).maybeSingle();
    if (profileError || !profile || !["admin", "manager", "staff"].includes(profile.role) || profile.status !== "active") {
      return res.status(403).json({ message: "Active admin access is required." });
    }
    req.adminUser = user;
    return next();
  } catch (error) {
    console.error("Admin authorization failed:", error);
    return res.status(401).json({ message: "Unable to verify admin session." });
  }
}

// Admin-friendly backend CRUD endpoints.
const crud = {
  restaurants: { table: "restaurants" },
  categories: { table: "categories" },
  menuItems: { table: "menu_items" },
  customers: { table: "customers" },
  drivers: { table: "drivers" },
  promotions: { table: "promotions" },
  reviews: { table: "reviews" },
};

for (const [resource, cfg] of Object.entries(crud)) {
  app.get(`/api/${resource}`, requireAdmin, async (_req, res) => {
    const { data, error } = await supabase.from(cfg.table).select("*").order("created_at", { ascending: false });
    if (error) return sendDbError(res, error);
    res.json(data || []);
  });

  app.post(`/api/${resource}`, requireAdmin, async (req, res) => {
    const { data, error } = await supabase.from(cfg.table).insert(req.body).select().single();
    if (error) return sendDbError(res, error);
    res.status(201).json(data);
  });

  app.put(`/api/${resource}/:id`, requireAdmin, async (req, res) => {
    const { data, error } = await supabase.from(cfg.table).update(req.body).eq("id", req.params.id).select().single();
    if (error) return sendDbError(res, error);
    res.json(data);
  });

  app.delete(`/api/${resource}/:id`, requireAdmin, async (req, res) => {
    const { error } = await supabase.from(cfg.table).delete().eq("id", req.params.id);
    if (error) return sendDbError(res, error);
    res.status(204).end();
  });
}


// Delivery staff accounts and location sharing. These routes require the
// server-side Supabase service-role key; it is never exposed to browser code.
async function requireDriver(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Delivery staff sign-in is required." });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ message: "Invalid or expired delivery session." });
  const { data: profile } = await supabase.from("profiles").select("role,status").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "driver" || profile.status !== "active") {
    return res.status(403).json({ message: "This account is not an active delivery account." });
  }
  req.driverUser = user;
  return next();
}

app.post("/api/admin/drivers/create-account", requireAdmin, async (req, res) => {
  if (!hasPrivilegedServerKey) return res.status(503).json({ message: "Configure SUPABASE_SERVICE_ROLE_KEY on the backend before creating delivery accounts." });
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const phone = String(req.body.phone || "").trim();
  const vehicle = String(req.body.vehicle || "Motorbike");
  const plate = String(req.body.plate || "").trim();
  if (!name || !email || password.length < 8) return res.status(400).json({ message: "Name, email, and a password of at least 8 characters are required." });
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: name, account_type: "driver" }
  });
  if (createError) return res.status(400).json({ message: createError.message });
  const userId = created.user.id;
  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId, full_name: name, email, phone: phone || null, role: "driver", status: "active"
  }, { onConflict: "id" });
  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return sendDbError(res, profileError, "Could not create the delivery profile.");
  }
  const { data: rider, error: riderError } = await supabase.from("drivers").insert({
    id: userId, name, phone: phone || null, account_email: email, vehicle_type: vehicle, license_plate: plate || null, status: "offline"
  }).select("*").single();
  if (riderError) {
    await supabase.from("profiles").delete().eq("id", userId);
    await supabase.auth.admin.deleteUser(userId);
    return sendDbError(res, riderError, "Could not create the delivery staff record.");
  }
  return res.status(201).json({ rider, email, message: "Delivery account created. Share the login details securely with the staff member." });
});

app.get("/api/driver/orders", requireDriver, async (req, res) => {
  const { data, error } = await supabase.from("orders")
    .select("id,status,total,delivery_address,created_at,customer_id,customer_latitude,customer_longitude")
    .eq("driver_id", req.driverUser.id)
    .in("status", ["pending", "placed", "preparing", "on_the_way"])
    .order("created_at", { ascending: false });
  if (error) return sendDbError(res, error);
  const ids = (data || []).map(x => x.id);
  const customerIds = [...new Set((data || []).map(x => x.customer_id).filter(Boolean))];
  const [customers, locations] = await Promise.all([
    customerIds.length ? supabase.from("customers").select("id,name,phone").in("id", customerIds) : Promise.resolve({ data: [], error: null }),
    ids.length ? supabase.from("delivery_locations").select("order_id,latitude,longitude,updated_at").in("order_id", ids).eq("actor", "customer") : Promise.resolve({ data: [], error: null })
  ]);
  if (customers.error) return sendDbError(res, customers.error);
  if (locations.error) return sendDbError(res, locations.error);
  const cm = new Map((customers.data || []).map(c => [c.id, c]));
  const lm = new Map((locations.data || []).map(l => [l.order_id, l]));
  res.json((data || []).map(o => ({ ...o, customer: cm.get(o.customer_id) || null, customerLocation: lm.get(o.id) || null })));
});

app.patch("/api/driver/orders/:id/status", requireDriver, async (req, res) => {
  const allowed = ["on_the_way", "delivered"];
  const status = String(req.body.status || "");
  if (!allowed.includes(status)) return res.status(400).json({ message: "Delivery staff can set an assigned order to On the Way or Delivered." });
  const { data, error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() })
    .eq("id", req.params.id).eq("driver_id", req.driverUser.id).select("id,status").maybeSingle();
  if (error) return sendDbError(res, error);
  if (!data) return res.status(404).json({ message: "This order is not assigned to your account." });
  res.json(data);
});

app.post("/api/driver/orders/:id/location", requireDriver, async (req, res) => {
  const latitude = Number(req.body.latitude), longitude = Number(req.body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return res.status(400).json({ message: "A valid GPS latitude and longitude are required." });
  }
  const { data: order, error: orderError } = await supabase.from("orders").select("id")
    .eq("id", req.params.id).eq("driver_id", req.driverUser.id).maybeSingle();
  if (orderError) return sendDbError(res, orderError);
  if (!order) return res.status(404).json({ message: "This order is not assigned to your account." });
  const { error } = await supabase.from("delivery_locations").upsert({
    order_id: req.params.id, driver_id: req.driverUser.id, actor: "driver", latitude, longitude, updated_at: new Date().toISOString()
  }, { onConflict: "order_id,actor" });
  if (error) return sendDbError(res, error);
  res.json({ ok: true });
});

app.post("/api/orders/:id/customer-location", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Sign in to share your delivery location." });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ message: "Invalid customer session." });
  const latitude = Number(req.body.latitude), longitude = Number(req.body.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return res.status(400).json({ message: "Invalid GPS coordinates." });
  const { data: customer } = await supabase.from("customers").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!customer) return res.status(403).json({ message: "This account is not linked to a BiteGo customer record. Place an order while signed in first." });
  const { data: order, error: orderError } = await supabase.from("orders").select("id,driver_id").eq("id", req.params.id).eq("customer_id", customer.id).maybeSingle();
  if (orderError) return sendDbError(res, orderError);
  if (!order) return res.status(404).json({ message: "Order not found for this customer." });
  const { error } = await supabase.from("delivery_locations").upsert({
    order_id: req.params.id, driver_id: order.driver_id, actor: "customer", latitude, longitude, updated_at: new Date().toISOString()
  }, { onConflict: "order_id,actor" });
  if (error) return sendDbError(res, error);
  res.json({ ok: true });
});

app.get("/api/orders/:id/location", async (req, res) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ message: "Sign in to view live delivery locations." });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ message: "Invalid session." });
  const { data: profile } = await supabase.from("profiles").select("role,phone").eq("id", user.id).maybeSingle();
  const { data: order } = await supabase.from("orders").select("id,customer_id,driver_id").eq("id", req.params.id).maybeSingle();
  if (!order) return res.status(404).json({ message: "Order not found." });
  let allowed = profile?.role === "driver" && order.driver_id === user.id;
  if (!allowed && profile?.phone) {
    const { data: customer } = await supabase.from("customers").select("id").eq("auth_user_id", user.id).maybeSingle();
    allowed = Boolean(customer && customer.id === order.customer_id);
  }
  if (!allowed) return res.status(403).json({ message: "You are not allowed to view this delivery location." });
  const { data, error } = await supabase.from("delivery_locations")
    .select("actor,latitude,longitude,updated_at").eq("order_id", req.params.id);
  if (error) return sendDbError(res, error);
  res.json(data || []);
});


app.get("/api/payments", requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
  if (error) return sendDbError(res, error);
  res.json(data || []);
});

app.put("/api/payments/:id", requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from("payments").update(req.body).eq("id", req.params.id).select().single();
  if (error) return sendDbError(res, error);
  res.json(data);
});

app.get("/api/settings/:table", requireAdmin, async (req, res) => {
  const allowed = ["platform_settings", "payment_settings", "notification_settings"];
  if (!allowed.includes(req.params.table)) return res.status(404).json({ message: "Unknown settings table." });
  const { data, error } = await supabase.from(req.params.table).select("*").eq("id", 1).maybeSingle();
  if (error) return sendDbError(res, error);
  res.json(data || {});
});

app.put("/api/settings/:table", requireAdmin, async (req, res) => {
  const allowed = ["platform_settings", "payment_settings", "notification_settings"];
  if (!allowed.includes(req.params.table)) return res.status(404).json({ message: "Unknown settings table." });
  const { data, error } = await supabase.from(req.params.table).upsert({ id: 1, ...req.body }).select().single();
  if (error) return sendDbError(res, error);
  res.json(data);
});

// KHQR demo endpoint. It stores the payment in Supabase. It intentionally does
// NOT pretend a real bank payment happened. If you add a service-role key and a
// real Bakong/NBC integration later, this endpoint can be replaced with the
// real QR payload and verification flow.
app.post("/api/payments/khqr", async (req, res) => {
  const { orderId: id, amount, bank } = req.body;
  const allowedBanks = ["ABA", "ACLEDA", "WING"];
  if (typeof id !== "string" || !id.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !allowedBanks.includes(String(bank || "").toUpperCase())) {
    return res.status(400).json({ message: "orderId, a positive amount, and a valid bank (ABA, ACLEDA, or WING) are required." });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id,total,payment_status")
    .eq("id", id)
    .maybeSingle();
  if (orderError) return sendDbError(res, orderError);
  if (!order) return res.status(404).json({ message: "Order not found." });
  if (order.payment_status === "paid") {
    return res.status(409).json({ message: "This order has already been paid." });
  }
  // Never trust the amount supplied by the browser. Use the saved order total
  // and reject a mismatched request rather than recording a different amount.
  const orderTotal = Number(order.total);
  if (!Number.isFinite(orderTotal) || orderTotal <= 0 || Math.abs(Number(amount) - orderTotal) > 0.01) {
    return res.status(409).json({ message: "Payment amount does not match the saved order total. Please restart checkout." });
  }

  // Payment rows are private. Only the backend may create them using a
  // privileged server key; never solve this by allowing anon inserts via RLS.
  if (!hasPrivilegedServerKey) {
    return res.status(503).json({
      message: "Payment storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) to backend/.env and restart the backend."
    });
  }

  // Each time the customer chooses a QR, create a new 5-minute payment attempt.
  // The actual bank transfer is verified manually by the admin in this project.
  const paymentId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error } = await supabase.from("payments").insert({
    order_id: id,
    payment_code: paymentId,
    amount: orderTotal,
    method: "khqr",
    payment_provider: String(bank).toUpperCase(),
    status: "pending",
    expires_at: expiresAt,
  });

  if (error) return sendDbError(res, error);

  // The QR image is stored in frontend/public/payment-qr and is displayed
  // according to the customer's selected bank. No fake "paid" state is created.
  res.json({
    paymentId,
    bank,
    qrImageUrl: `/payment-qr/${bank}.JPG`,
    expiresInSeconds: 300,
    expiresAt,
    demo: true,
  });
});

app.get("/api/payments/khqr/:id/status", async (req, res) => {
  const { data, error } = await supabase
    .from("payments")
    .select("id,status,expires_at,order_id")
    .eq("payment_code", req.params.id)
    .maybeSingle();

  if (error) return sendDbError(res, error);
  if (!data) return res.status(404).json({ message: "Payment not found." });

  if (data.status === "pending" && data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    // Do not require a database UPDATE just to report expiry. This keeps the
    // customer flow working even when the backend uses the publishable key.
    // The admin dashboard also derives "Expired" from expires_at.
    return res.json({ status: "expired" });
  }

  res.json({ status: data.status });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, database: "supabase", paymentMode: "manual-bank-verification" });
});

// Export the same Express application for Netlify Functions. Local development
// still starts the ordinary HTTP server; Netlify invokes the exported handler.
export default app;

if (!process.env.NETLIFY) {
  app.listen(PORT, () => {
    console.log(`BiteGo backend running at http://localhost:${PORT}`);
    console.log(`Supabase: ${SUPABASE_URL}`);
    if (!hasPrivilegedServerKey) {
      console.warn("WARNING: No privileged Supabase server key is configured. Payment inserts will be blocked by RLS. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY in backend/.env only.");
    }
  });
}
