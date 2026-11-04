import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { Page } from "../data";
import { fetchMyOrders } from "../lib/api";

interface Props {
  navigate: (page: Page, data?: unknown) => void;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role?: string;
  status?: string;
}

interface Address {
  id: string;
  user_id: string;
  label: string;
  address: string;
  icon: string;
  is_default?: boolean;
  created_at?: string;
}

interface CustomerOrder {
  id: string | number;
  created_at?: string | null;
  status?: string | null;
  total?: number | string | null;
  total_amount?: number | string | null;
  restaurant_name?: string | null;
  restaurant?: { name?: string | null } | null;
  items?: Array<{ name?: string; item_name?: string; quantity?: number }> | null;
}

type Tab = "orders" | "addresses" | "settings";

const AVATAR_BUCKET = "avatars";
const ADDRESS_TABLE = "addresses";

function formatMoney(value: unknown): string {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "—";
}

function formatDate(value?: string | null): string {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function displayStatus(status?: string | null): string {
  if (!status) return "Status unavailable";
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : (parts[0] || "F").slice(0, 2)
  ).toUpperCase();
}

export default function ProfilePage({ navigate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [notifications, setNotifications] = useState(true);
  const [promoEmails, setPromoEmails] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [profileModal, setProfileModal] = useState(false);
  const [addressModal, setAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [addressDraft, setAddressDraft] = useState({
    label: "Home",
    address: "",
    icon: "🏠",
    is_default: false,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

 
const notify = useCallback((text: string, isError = false) => {
  setMessage(isError ? "" : text);
  setError(isError ? text : "");

  window.setTimeout(() => {
    setMessage("");
    setError("");
  }, 4000);
}, []);


  
const loadProfile = useCallback(async (): Promise<Profile | null> => {
  setLoadingProfile(true);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    const user = session?.user;

    if (!user) {
      setProfile(null);
      setOrders([]);
      setAddresses([]);
      setError("Please sign in to view your profile.");
      return null;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, role, status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Could not load profile: ${profileError.message}`);
    }

    const resolved: Profile = {
      id: user.id,
      full_name:
        data?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "",
      email: user.email || data?.email || "",
      phone: data?.phone || "",
      avatar_url: data?.avatar_url || null,
      role: data?.role,
      status: data?.status,
    };

    if (!data) {
      const { error: insertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            full_name: resolved.full_name,
            email: resolved.email,
            phone: resolved.phone,
            avatar_url: resolved.avatar_url,
          },
          { onConflict: "id" }
        );

      if (insertError) {
        console.error(
          "Could not create profile row:",
          insertError.message
        );
      }
    }

    setProfile(resolved);
    setNameDraft(resolved.full_name);
    setPhoneDraft(resolved.phone);
    setError("");

    return resolved;
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "Unknown error";

    console.error("Profile load failed:", detail);
    setProfile(null);
    setError(`Could not load your profile: ${detail}`);

    return null;
  } finally {
    setLoadingProfile(false);
  }
}, []);


  
const loadOrders = useCallback(async (_userId: string) => {
  setLoadingOrders(true);

  try {
    // The backend maps the authenticated Supabase user to the checkout
    // customer record by the phone number saved in the customer's profile.
    const result = await fetchMyOrders();
    setOrders(result.orders || []);
    setError(result.message || "");
  } catch (err) {
    console.error("Order history request failed:", err);
    setOrders([]);
    setError(`Could not load order history: ${err instanceof Error ? err.message : "Unknown error"}`);
  } finally {
    setLoadingOrders(false);
  }
}, []);

  const loadAddresses = useCallback(async (userId: string) => {
    setLoadingAddresses(true);
    try {
      const { data, error: addressError } = await supabase
        .from(ADDRESS_TABLE)
        .select("id, user_id, label, address, icon, is_default, created_at")
        .eq("user_id", userId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (addressError) {
        setAddresses([]);
        setError(
          addressError.code === "42P01" || addressError.code === "PGRST205"
            ? "Saved addresses are not set up yet. Create the addresses table and policies before using this section."
            : `Could not load saved addresses: ${addressError.message}`
        );
      } else {
        setAddresses((data || []) as Address[]);
      }
    } catch (err) {
      setAddresses([]);
      setError(`Could not load saved addresses: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

 
useEffect(() => {
  let cancelled = false;
  let refreshTimer: number | undefined;

  const loadAll = async () => {
    const loadedProfile = await loadProfile();

    if (cancelled || !loadedProfile) return;

    await Promise.allSettled([
      loadOrders(loadedProfile.id),
      loadAddresses(loadedProfile.id),
    ]);
  };

  void loadAll();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "INITIAL_SESSION") return;

    if (refreshTimer !== undefined) {
      window.clearTimeout(refreshTimer);
    }

    if (!session?.user) {
      setProfile(null);
      setOrders([]);
      setAddresses([]);
      setLoadingProfile(false);
      setLoadingOrders(false);
      setLoadingAddresses(false);
      setError("Please sign in to view your profile.");
      return;
    }

    // Run Supabase requests after the auth callback finishes.
    refreshTimer = window.setTimeout(() => {
      if (!cancelled) {
        void loadAll();
      }
    }, 0);
  });

  return () => {
    cancelled = true;

    if (refreshTimer !== undefined) {
      window.clearTimeout(refreshTimer);
    }

    subscription.unsubscribe();
  };
}, [loadProfile, loadOrders, loadAddresses]);


  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    const full_name = nameDraft.trim();
    const phone = phoneDraft.trim();

    if (!full_name) {
      notify("Please enter your full name.", true);
      return;
    }

    setSavingProfile(true);
    const { data, error: updateError } = await supabase
      .from("profiles")
      .upsert(
        { id: profile.id, full_name, phone, email: profile.email, avatar_url: profile.avatar_url },
        { onConflict: "id" }
      )
      .select("id, full_name, email, phone, avatar_url, role, status")
      .single();

    setSavingProfile(false);
    if (updateError) {
      notify(`Could not save profile: ${updateError.message}`, true);
      return;
    }

    const updated: Profile = {
      ...profile,
      ...data,
      email: profile.email,
      full_name: data.full_name || full_name,
      phone: data.phone || "",
    };
    setProfile(updated);
    setProfileModal(false);
    notify("Profile updated.");
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;

    if (!file.type.startsWith("image/")) {
      notify("Choose an image file.", true);
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      notify("The image must be 3 MB or smaller.", true);
      return;
    }

    setUploadingAvatar(true);
    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${profile.id}/${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      setUploadingAvatar(false);
      notify(`Could not upload photo: ${uploadError.message}. Check the "${AVATAR_BUCKET}" bucket and its policies.`, true);
      return;
    }

    const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const avatar_url = publicData.publicUrl;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url })
      .eq("id", profile.id);

    setUploadingAvatar(false);
    if (updateError) {
      notify(`Photo uploaded but profile could not be updated: ${updateError.message}`, true);
      return;
    }
    
setProfile({ ...profile, avatar_url });

window.dispatchEvent(
  new CustomEvent("foodie6:avatar-updated", {
    detail: { avatarUrl: avatar_url },
  })
);

notify("Profile photo updated.");

  };

  const openAddAddress = () => {
    setEditingAddress(null);
    setAddressDraft({ label: "Home", address: "", icon: "🏠", is_default: addresses.length === 0 });
    setAddressModal(true);
  };

  const openEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressDraft({
      label: address.label,
      address: address.address,
      icon: address.icon || "📍",
      is_default: Boolean(address.is_default),
    });
    setAddressModal(true);
  };

  const saveAddress = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) return;
    const label = addressDraft.label.trim();
    const address = addressDraft.address.trim();
    if (!label || !address) {
      notify("Enter both an address label and delivery address.", true);
      return;
    }

    setSavingAddress(true);
    if (addressDraft.is_default) {
      const { error: defaultError } = await supabase
        .from(ADDRESS_TABLE)
        .update({ is_default: false })
        .eq("user_id", profile.id);
      if (defaultError) {
        setSavingAddress(false);
        notify(`Could not update default address: ${defaultError.message}`, true);
        return;
      }
    }

    const payload = {
      user_id: profile.id,
      label,
      address,
      icon: addressDraft.icon,
      is_default: addressDraft.is_default,
    };
    const request = editingAddress
      ? supabase.from(ADDRESS_TABLE).update(payload).eq("id", editingAddress.id).eq("user_id", profile.id)
      : supabase.from(ADDRESS_TABLE).insert(payload);

    const { error: saveError } = await request;
    setSavingAddress(false);
    if (saveError) {
      notify(`Could not save address: ${saveError.message}`, true);
      return;
    }
    setAddressModal(false);
    notify(editingAddress ? "Address updated." : "Address added.");
    await loadAddresses(profile.id);
  };

  const deleteAddress = async (address: Address) => {
    if (!profile || !window.confirm(`Delete the ${address.label} address?`)) return;
    const { error: deleteError } = await supabase
      .from(ADDRESS_TABLE)
      .delete()
      .eq("id", address.id)
      .eq("user_id", profile.id);
    if (deleteError) {
      notify(`Could not delete address: ${deleteError.message}`, true);
      return;
    }
    notify("Address deleted.");
    await loadAddresses(profile.id);
  };

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      notify(`Could not sign out: ${signOutError.message}`, true);
      return;
    }
    navigate("home");
  };

  if (loadingProfile) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center text-[var(--muted-foreground)]">
        Loading your profile…
      </div>
    );
  }

  
if (!profile) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 text-center">
      <h1 className="text-xl font-bold text-[var(--foreground)]">
        Sign in to view your profile
      </h1>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">
        Create an account or sign in to view your details, orders,
        and saved delivery addresses.
      </p>

      <button
        type="button"
        onClick={() => navigate("login")}
        className="mt-5 rounded-xl bg-[var(--primary)] px-5 py-2.5 font-semibold text-white"
      >
        Sign in / Create account
      </button>

      <button
        type="button"
        onClick={() => navigate("home")}
        className="ml-3 mt-5 rounded-xl border border-[var(--border)] px-5 py-2.5 font-semibold"
      >
        Back to home
      </button>
    </div>
  );
}


  const completedOrders = orders.filter((order) => {
    const status = String(order.status || "").toLowerCase();
    return ["delivered", "completed"].includes(status);
  }).length;

  return (
    <div className="min-h-full max-w-3xl mx-auto px-4 sm:px-6 py-8">
      {(message || error) && (
        <div role={error ? "alert" : "status"} className={`fixed top-5 right-5 z-[100] max-w-sm rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${error ? "bg-red-600 text-white" : "bg-[var(--foreground)] text-white"}`}>
          {error || message}
          <button type="button" className="ml-3 opacity-80" onClick={() => { setMessage(""); setError(""); }} aria-label="Dismiss message">×</button>
        </div>
      )}

      <section className="rounded-3xl p-6 mb-6 text-white bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={`${profile.full_name || "Customer"} profile`} className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30" />
            ) : (
              <div aria-label="Profile initials" className="w-16 h-16 rounded-2xl border-2 border-white/30 bg-white/15 flex items-center justify-center text-xl font-bold">
                {initials(profile.full_name || profile.email)}
              </div>
            )}
            <input id="profile-avatar-upload" name="avatar" ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadAvatar} className="hidden" />
            <button type="button" title="Change profile photo" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white text-[var(--primary)] flex items-center justify-center shadow disabled:opacity-60">
              {uploadingAvatar ? "…" : "✎"}
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold truncate">{profile.full_name || "Your profile"}</h1>
            <p className="text-white/80 text-sm truncate">{profile.email || "Email unavailable"}</p>
            {profile.phone && <p className="text-white/70 text-xs mt-1">{profile.phone}</p>}
            <p className="text-white/80 text-xs mt-2">{orders.length} orders · {completedOrders} delivered</p>
          </div>
        </div>
        <button type="button" onClick={() => { setNameDraft(profile.full_name); setPhoneDraft(profile.phone); setProfileModal(true); }} className="mt-5 w-full rounded-xl bg-white/15 hover:bg-white/25 text-white py-2.5 text-sm font-semibold">
          Edit profile
        </button>
      </section>

      <div className="flex gap-1 bg-[var(--muted)] rounded-2xl p-1 mb-6">
        {(["orders", "addresses", "settings"] as const).map((tab) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize ${activeTab === tab ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "orders" && (
        <div className="space-y-3">
          {loadingOrders ? <p className="p-6 text-center text-sm text-[var(--muted-foreground)]">Loading your orders…</p> :
            orders.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] p-8 text-center">
                <p className="font-semibold text-[var(--foreground)]">No orders yet</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Your real order history will appear here after you place an order.</p>
                <button type="button" onClick={() => navigate("restaurants")} className="mt-4 rounded-xl bg-[var(--primary)] px-4 py-2 text-white text-sm font-semibold">Explore restaurants</button>
              </div>
            ) : orders.map((order) => {
              const orderTotal = order.total_amount ?? order.total;
              const restaurantName = order.restaurant_name || order.restaurant?.name || "BiteGo order";
              return (
                <article key={String(order.id)} className="bg-white rounded-2xl p-4 border border-[var(--border)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--foreground)]">{restaurantName}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">{formatDate(order.created_at)} · #{String(order.id)}</p>
                      <span className="inline-block mt-2 px-2 py-1 rounded-full bg-[var(--muted)] text-xs text-[var(--foreground)]">{displayStatus(order.status)}</span>
                    </div>
                    <p className="font-bold text-[var(--primary)] whitespace-nowrap">{formatMoney(orderTotal)}</p>
                  </div>
                  {order.items && order.items.length > 0 && (
                    <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                      {order.items.map((item) => `${item.name || item.item_name || "Item"} × ${Number(item.quantity || 1)}`).join(" · ")}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--border)]">
                    <button type="button" onClick={() => navigate("tracking", order)} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold hover:border-[var(--primary)]">Track order</button>
                    <button type="button" onClick={() => navigate("restaurants")} className="flex-1 py-2 rounded-xl bg-[var(--secondary)] text-[var(--primary)] text-xs font-semibold">Order again</button>
                  </div>
                </article>
              );
            })}
        </div>
      )}

      {activeTab === "addresses" && (
        <div className="space-y-3">
          {loadingAddresses ? <p className="p-6 text-center text-sm text-[var(--muted-foreground)]">Loading addresses…</p> :
            addresses.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] p-8 text-center">
                <p className="font-semibold text-[var(--foreground)]">No saved addresses</p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Add a delivery address to make checkout easier.</p>
              </div>
            ) : addresses.map((address) => (
              <article key={address.id} className="bg-white rounded-2xl p-4 border border-[var(--border)] flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--muted)] flex items-center justify-center text-xl shrink-0">{address.icon || "📍"}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{address.label} {address.is_default && <span className="text-xs text-[var(--primary)]">· Default</span>}</p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1 break-words">{address.address}</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => openEditAddress(address)} className="px-2 py-1 text-sm rounded-lg hover:bg-[var(--muted)]" aria-label={`Edit ${address.label}`}>Edit</button>
                  <button type="button" onClick={() => void deleteAddress(address)} className="px-2 py-1 text-sm text-red-600 rounded-lg hover:bg-red-50" aria-label={`Delete ${address.label}`}>Delete</button>
                </div>
              </article>
            ))}
          <button type="button" onClick={openAddAddress} className="w-full py-3 rounded-2xl border-2 border-dashed border-[var(--border)] text-sm font-semibold text-[var(--muted-foreground)] hover:border-[var(--primary)]">+ Add delivery address</button>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-3">
          <section className="bg-white rounded-2xl p-5 border border-[var(--border)]">
            <h2 className="font-bold text-sm mb-4">Preferences on this device</h2>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">These preferences are stored locally. They do not send notifications or marketing emails until those services are connected.</p>
            {[
              { key: "notifications" as const, label: "Order update preferences", checked: notifications, set: setNotifications },
              { key: "promos" as const, label: "Promotional email preference", checked: promoEmails, set: setPromoEmails },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between py-3 border-t border-[var(--border)] gap-4">
                <span className="text-sm">{item.label}</span>
                <input id={`preference-${item.key}`} name={item.key} type="checkbox" checked={item.checked} onChange={(event) => item.set(event.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
              </label>
            ))}
          </section>
          <section className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
            <button type="button" onClick={() => notify("Payment methods remain managed by your existing checkout flow.")} className="w-full p-4 text-left border-b border-[var(--border)] hover:bg-[var(--muted)]">💳 <span className="ml-2 text-sm font-medium">Payment methods</span></button>
            <button type="button" onClick={() => notify("Contact your BiteGo support team for assistance.")} className="w-full p-4 text-left border-b border-[var(--border)] hover:bg-[var(--muted)]">🎧 <span className="ml-2 text-sm font-medium">Help & support</span></button>
            <div className="p-4 text-sm text-[var(--muted-foreground)]">BiteGo customer profile</div>
          </section>
          <button type="button" onClick={() => void signOut()} className="w-full py-3 rounded-2xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50">Sign out</button>
        </div>
      )}

      {profileModal && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={saveProfile} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div><h2 className="text-lg font-extrabold">Edit profile</h2><p className="text-xs text-[var(--muted-foreground)] mt-1">Your email is managed by your sign-in account.</p></div>
              <button type="button" onClick={() => setProfileModal(false)} className="w-9 h-9 rounded-full bg-[var(--muted)]" aria-label="Close">×</button>
            </div>
            <label className="block mb-4"><span className="block text-xs font-semibold mb-1.5">Full name</span><input id="profile-full-name" name="full_name" autoComplete="name" required maxLength={120} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm" placeholder="Your full name" /></label>
            <label className="block mb-4"><span className="block text-xs font-semibold mb-1.5">Email</span><input id="profile-email" name="email" autoComplete="email" disabled value={profile.email} className="w-full rounded-xl border border-[var(--border)] bg-gray-50 px-3 py-2.5 text-sm" /></label>
            <label className="block"><span className="block text-xs font-semibold mb-1.5">Phone</span><input id="profile-phone" name="phone" autoComplete="tel" maxLength={30} value={phoneDraft} onChange={(event) => setPhoneDraft(event.target.value)} className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm" placeholder="Phone number" /></label>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setProfileModal(false)} className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={savingProfile} className="flex-1 rounded-xl bg-[var(--primary)] text-white py-2.5 text-sm font-semibold disabled:opacity-60">{savingProfile ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>
      )}

      {addressModal && (
        <div className="fixed inset-0 z-[90] bg-black/50 flex items-center justify-center p-4">
          <form onSubmit={saveAddress} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5"><h2 className="text-lg font-extrabold">{editingAddress ? "Edit address" : "Add delivery address"}</h2><button type="button" onClick={() => setAddressModal(false)} className="w-9 h-9 rounded-full bg-[var(--muted)]" aria-label="Close">×</button></div>
            <label className="block mb-4"><span className="block text-xs font-semibold mb-1.5">Label</span><input id="address-label" name="label" required maxLength={60} value={addressDraft.label} onChange={(event) => setAddressDraft((current) => ({ ...current, label: event.target.value }))} className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm" placeholder="Home, office…" /></label>
            <label className="block mb-4"><span className="block text-xs font-semibold mb-1.5">Full delivery address</span><textarea id="delivery-address" name="address" autoComplete="street-address" required maxLength={500} rows={3} value={addressDraft.address} onChange={(event) => setAddressDraft((current) => ({ ...current, address: event.target.value }))} className="w-full rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm resize-y" placeholder="Street, building, district, city" /></label>
            <div className="mb-4"><span className="block text-xs font-semibold mb-2">Address icon</span><div className="flex gap-2">{["🏠", "🏢", "📍", "🏨", "🏫"].map((icon) => <button key={icon} type="button" onClick={() => setAddressDraft((current) => ({ ...current, icon }))} className={`w-10 h-10 rounded-xl border text-xl ${addressDraft.icon === icon ? "border-[var(--primary)] bg-[var(--secondary)]" : "border-[var(--border)]"}`} aria-label={`Choose ${icon}`}>{icon}</button>)}</div></div>
            <label className="flex items-center gap-2 text-sm"><input id="address-is-default" name="is_default" type="checkbox" checked={addressDraft.is_default} onChange={(event) => setAddressDraft((current) => ({ ...current, is_default: event.target.checked }))} /> Set as default address</label>
            <div className="flex gap-2 mt-6"><button type="button" onClick={() => setAddressModal(false)} className="flex-1 rounded-xl border border-[var(--border)] py-2.5 text-sm font-semibold">Cancel</button><button type="submit" disabled={savingAddress} className="flex-1 rounded-xl bg-[var(--primary)] text-white py-2.5 text-sm font-semibold disabled:opacity-60">{savingAddress ? "Saving…" : editingAddress ? "Update address" : "Add address"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
