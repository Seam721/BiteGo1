import { Restaurant, MenuItem, CartItem } from "../data";
import { supabase } from "./supabase";
const API_URL = import.meta.env.VITE_API_URL ?? "";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    "Content-Type": "application/json",
    ...(session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
    ...options?.headers,
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `Request to ${path} failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {}
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export function fetchRestaurants(): Promise<Restaurant[]> {
  return request<Restaurant[]>("/api/restaurants");
}

export function fetchMenuItems(restaurantId?: number): Promise<MenuItem[]> {
  const query = restaurantId ? `?restaurantId=${restaurantId}` : "";
  return request<MenuItem[]>(`/api/menu-items${query}`);
}

export function fetchCategories(): Promise<any[]> {
  return request<any[]>("/api/categories");
}

export interface CreateOrderPayload {
  items: CartItem[];
  address: string;
  paymentMethod: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  promoCode?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface Order {
  id: string;
  status: "pending" | "placed" | "preparing" | "on_the_way" | "delivered" | "cancelled";
  total: number;
  paymentMethod: string;
  address: string;
  createdAt: string;
  paymentStatus?: string;
  items?: any[];
}

export function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return request<Order>("/api/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchOrder(orderId: string): Promise<Order> {
  return request<Order>(`/api/orders/${encodeURIComponent(orderId)}`);
}

export interface CustomerOrderHistoryItem {
  id: string | number;
  created_at?: string | null;
  status?: string | null;
  total?: number | string | null;
  subtotal?: number | string | null;
  restaurant_name?: string | null;
  items?: Array<{ name?: string; item_name?: string; quantity?: number }>;
}

export function fetchMyOrders(): Promise<{ orders: CustomerOrderHistoryItem[]; message?: string }> {
  return request<{ orders: CustomerOrderHistoryItem[]; message?: string }>("/api/my/orders");
}

export type KhqrBank = "ABA" | "ACLEDA" | "WING";

export interface KhqrPaymentResponse {
  paymentId: string;
  qrString?: string;
  qrImageUrl?: string;
  expiresInSeconds: number;
  demo?: boolean;
  bank?: KhqrBank;
}

export interface KhqrStatusResponse {
  status: "pending" | "paid" | "expired" | "failed" | "refunded";
}

export function initiateKhqrPayment(orderId: string, amount: number, bank: KhqrBank): Promise<KhqrPaymentResponse> {
  return request<KhqrPaymentResponse>("/api/payments/khqr", {
    method: "POST",
    body: JSON.stringify({ orderId, amount, bank }),
  });
}

export function getKhqrStatus(paymentId: string): Promise<KhqrStatusResponse> {
  return request<KhqrStatusResponse>(`/api/payments/khqr/${encodeURIComponent(paymentId)}/status`);
}
