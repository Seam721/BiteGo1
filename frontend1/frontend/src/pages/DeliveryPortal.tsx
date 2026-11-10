import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL ?? "";
type DeliveryOrder = {
  id: string; status: string; total: number; delivery_address: string;
  customer?: { name?: string; phone?: string } | null;
  customerLocation?: { latitude: number; longitude: number; updated_at: string } | null;
};

export default function DeliveryPortal() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  async function api(path: string, options: RequestInit = {}) {
    const { data: { session: current } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(current?.access_token ? { Authorization: `Bearer ${current.access_token}` } : {}), ...(options.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Request failed");
    return body;
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setError("");
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) { setError(authError.message); return; }
    setSession(data.session);
  }

  async function loadOrders() {
    try { setOrders(await api("/api/driver/orders")); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load deliveries"); }
  }

  async function updateStatus(orderId: string, status: string) {
    try {
      await api(`/api/driver/orders/${encodeURIComponent(orderId)}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      setMessage(`Order ${orderId} updated to ${status.replaceAll("_", " ")}.`);
      await loadOrders();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update order status"); }
  }

  function startLocation(orderId: string) {
    if (!navigator.geolocation) { setError("This device does not support GPS location."); return; }
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    setSharing(true); setMessage("Waiting for GPS permission…");
    watchId.current = navigator.geolocation.watchPosition(async position => {
      const now = Date.now();
      if (now - lastSent.current < 5000) return;
      lastSent.current = now;
      try {
        await api(`/api/driver/orders/${encodeURIComponent(orderId)}/location`, {
          method: "POST",
          body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        });
        setMessage("Your live location is being shared with the customer.");
      } catch (e) { setError(e instanceof Error ? e.message : "Location update failed"); }
    }, err => { setSharing(false); setError(err.message || "Please allow location access in browser settings."); }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  }

  useEffect(() => {
    if (!session) return;
    void loadOrders();
    const timer = window.setInterval(loadOrders, 10000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => () => { if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current); }, []);

  if (!session) return <main className="min-h-screen bg-slate-50 grid place-items-center p-4"><form onSubmit={signIn} className="w-full max-w-md bg-white rounded-3xl p-7 shadow-sm border space-y-4">
    <div className="text-3xl">🛵</div><h1 className="text-2xl font-black">BiteGo Delivery</h1><p className="text-sm text-slate-500">Sign in with the delivery account created by your administrator.</p>
    {error && <p className="text-sm text-red-600">{error}</p>}
    <input className="w-full border rounded-xl p-3" type="email" required placeholder="Delivery email" value={email} onChange={e=>setEmail(e.target.value)}/>
    <input className="w-full border rounded-xl p-3" type="password" required placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}/>
    <button className="w-full rounded-xl bg-orange-600 text-white p-3 font-bold">Sign in</button>
  </form></main>;

  return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="max-w-3xl mx-auto">
    <header className="flex justify-between items-center mb-6"><div><p className="text-orange-600 font-bold text-sm">BITEGO PARTNER</p><h1 className="text-2xl font-black">My deliveries</h1></div><button className="border rounded-xl px-3 py-2" onClick={async()=>{if(watchId.current!==null)navigator.geolocation.clearWatch(watchId.current);await supabase.auth.signOut();setSession(null);}}>Sign out</button></header>
    {error && <p role="alert" className="bg-red-50 text-red-700 rounded-xl p-3 mb-4">{error}</p>}
    {message && <p className="bg-green-50 text-green-700 rounded-xl p-3 mb-4">{message}</p>}
    {orders.length===0 && <div className="bg-white border rounded-2xl p-8 text-center text-slate-500">No active deliveries assigned to your account yet.</div>}
    <div className="space-y-4">{orders.map(order=><article key={order.id} className="bg-white border rounded-2xl p-5 space-y-3">
      <div className="flex justify-between gap-3"><div><p className="font-bold">Order #{order.id}</p><p className="text-sm text-slate-500">{order.customer?.name || "Customer"} · {order.customer?.phone || "No phone"}</p></div><span className="text-sm font-semibold text-orange-600">{order.status.replaceAll("_"," ")}</span></div>
      <p className="text-sm">{order.delivery_address}</p>
      <p className="font-bold">${Number(order.total).toFixed(2)}</p>
      {order.customerLocation && <div className="rounded-xl overflow-hidden border"><iframe title="Customer location" className="w-full h-64" loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.customerLocation.longitude-0.006}%2C${order.customerLocation.latitude-0.004}%2C${order.customerLocation.longitude+0.006}%2C${order.customerLocation.latitude+0.004}&layer=mapnik&marker=${order.customerLocation.latitude}%2C${order.customerLocation.longitude}`}/></div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button onClick={()=>startLocation(order.id)} className="rounded-xl bg-orange-600 text-white p-3 font-bold">{sharing ? "Continue sharing GPS" : "Share my live location"}</button>
        {order.status !== "on_the_way" && <button onClick={()=>void updateStatus(order.id,"on_the_way")} className="rounded-xl border p-3 font-bold">Start delivery</button>}
        {order.status === "on_the_way" && <button onClick={()=>void updateStatus(order.id,"delivered")} className="rounded-xl bg-emerald-600 text-white p-3 font-bold">Mark delivered</button>}
      </div>
    </article>)}</div>
  </div></main>;
}
