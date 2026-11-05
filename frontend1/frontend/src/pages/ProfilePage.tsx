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
type IconName =
  | "user" | "mail" | "phone" | "edit" | "camera" | "orders" | "pin"
  | "settings" | "clock" | "check" | "arrow" | "plus" | "trash"
  | "close" | "shield" | "help" | "logout" | "home" | "briefcase"
  | "marker" | "calendar" | "bag";

const AVATAR_BUCKET = "avatars";
const ADDRESS_TABLE = "addresses";
const PREFERENCES_KEY = "bitego:profile-preferences:";
const iconPaths: Record<IconName, string[]> = {
  user: ["M20 21a8 8 0 0 0-16 0", "M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"],
  mail: ["M4 6h16v12H4z", "m4 7 8 6 8-6"],
  phone: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72l.45 3.13a2 2 0 0 1-.57 1.7L7.1 10.44a16 16 0 0 0 6 6l1.9-1.89a2 2 0 0 1 1.7-.57l3.13.45a2 2 0 0 1 1.72 2Z"],
  edit: ["M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"],
  camera: ["M14 4h-4L8 7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3Z", "M12 17a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"],
  orders: ["M6 3h12l2 4H4z", "M5 7v13h14V7", "M9 11h6", "M9 15h6"],
  pin: ["M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z", "M12 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"],
  settings: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z", "M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.8.25l-.07.05h-3.4l-.05-.08a1.7 1.7 0 0 0-1.55-.9 1.7 1.7 0 0 0-1.55.9l-.05.08h-3.4l-.07-.05a1.7 1.7 0 0 0-1.8-.25l-.08.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 2.9 15l-.03-.08v-3.4l.08-.05a1.7 1.7 0 0 0 .9-1.55 1.7 1.7 0 0 0-.9-1.55l-.08-.05v-3.4l.03-.07a1.7 1.7 0 0 0-.25-1.8l-.06-.08 1.7-2.94.08.02a1.7 1.7 0 0 0 1.8-.25l.07-.05h3.4l.05.08a1.7 1.7 0 0 0 1.55.9 1.7 1.7 0 0 0 1.55-.9l.05-.08h3.4l.07.05a1.7 1.7 0 0 0 1.8.25l.08-.02 1.7 2.94-.06.08a1.7 1.7 0 0 0-.34 1.88l.03.08v3.4Z"],
  clock: ["M12 8v4l3 2", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"],
  check: ["m5 12 4 4L19 6"],
  arrow: ["M5 12h14", "m12 5 7 7-7 7"],
  plus: ["M12 5v14", "M5 12h14"],
  trash: ["M3 6h18", "M8 6V4h8v2", "m19 6-1 14H6L5 6", "M10 11v5", "M14 11v5"],
  close: ["m18 6-12 12", "m6 6 12 12"],
  shield: ["M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z", "m9 12 2 2 4-4"],
  help: ["M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3", "M12 17h.01", "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "m16 17 5-5-5-5", "M21 12H9"],
  home: ["m3 10 9-7 9 7", "M5 9v11h14V9", "M9 20v-6h6v6"],
  briefcase: ["M3 7h18v14H3z", "M8 7V4h8v3", "M3 12h18", "M10 12v2h4v-2"],
  marker: ["M12 22s8-4 8-11a8 8 0 1 0-16 0c0 7 8 11 8 11Z", "M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"],
  calendar: ["M8 2v4", "M16 2v4", "M3 10h18", "M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z"],
  bag: ["M5 8h14l1 13H4L5 8Z", "M9 8V6a3 3 0 0 1 6 0v2"],
};

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name].map((path, index) => <path key={`${name}-${index}`} d={path} />)}
    </svg>
  );
}

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
    : (parts[0] || "B").slice(0, 2)
  ).toUpperCase();
}

function statusStyle(status?: string | null): string {
  const normalized = String(status || "").toLowerCase();
  if (["delivered", "completed"].includes(normalized)) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (["cancelled", "failed"].includes(normalized)) return "bg-red-50 text-red-700 ring-red-200";
  return "bg-amber-50 text-amber-800 ring-amber-200";
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-fade-in px-4 py-8 sm:px-6 lg:py-12" aria-label="Loading profile" role="status">
      <div className="skeleton mb-6 h-7 w-44 rounded-lg" />
      <div className="skeleton mb-8 h-56 rounded-3xl" />
      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <div className="skeleton h-64 rounded-2xl" />
        <div className="space-y-4">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-44 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
        </div>
      </div>
      <span className="sr-only">Loading your BiteGo account…</span>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white px-6 py-12 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--primary)]">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="mt-4 font-bold text-[var(--foreground)]">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
      {action}
    </div>
  );
}

function readPreferences(userId: string): { notifications: boolean; promoEmails: boolean } {
  try {
    const saved = window.localStorage.getItem(`${PREFERENCES_KEY}${userId}`);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<{ notifications: boolean; promoEmails: boolean }>;
      return {
        notifications: parsed.notifications ?? true,
        promoEmails: parsed.promoEmails ?? false,
      };
    }
  } catch (error) {
    console.warn("Could not read local account preferences:", error);
  }
  return { notifications: true, promoEmails: false };
}

export default function ProfilePage({ navigate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [orderSummary, setOrderSummary] = useState<{ totalOrders: number; completedOrders: number } | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [notifications, setNotifications] = useState(true);
  const [promoEmails, setPromoEmails] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [modal, setModal] = useState<"profile" | "address" | null>(null);
  const [closingModal, setClosingModal] = useState(false);
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
  const noticeTimerRef = useRef<number | null>(null);
  const modalTimerRef = useRef<number | null>(null);

  const notify = useCallback((text: string, isError = false) => {
    setMessage(isError ? "" : text);
    setError(isError ? text : "");
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setMessage("");
      setError("");
      noticeTimerRef.current = null;
    }, 4500);
  }, []);

  const closeModal = useCallback(() => {
    if (!modal) return;
    setClosingModal(true);
    if (modalTimerRef.current !== null) window.clearTimeout(modalTimerRef.current);
    modalTimerRef.current = window.setTimeout(() => {
      setModal(null);
      setClosingModal(false);
      modalTimerRef.current = null;
    }, 180);
  }, [modal]);

  useEffect(() => () => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    if (modalTimerRef.current !== null) window.clearTimeout(modalTimerRef.current);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, closeModal]);

  const loadProfile = useCallback(async (): Promise<Profile | null> => {
    setLoadingProfile(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw new Error(sessionError.message);
      const user = session?.user;
      if (!user) {
        setProfile(null);
        setOrders([]);
        setOrderSummary(null);
        setAddresses([]);
        setError("Please sign in to view your account.");
        return null;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, avatar_url, role, status")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw new Error(`Could not load profile: ${profileError.message}`);

      const resolved: Profile = {
        id: user.id,
        full_name: data?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "",
        email: user.email || data?.email || "",
        phone: data?.phone || "",
        avatar_url: data?.avatar_url || null,
        role: data?.role,
        status: data?.status,
      };

      if (!data) {
        const { error: insertError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name: resolved.full_name,
            email: resolved.email,
            phone: resolved.phone,
            avatar_url: resolved.avatar_url,
          },
          { onConflict: "id" }
        );
        if (insertError) console.error("Could not create profile row:", insertError.message);
      }

      setProfile(resolved);
      setNameDraft(resolved.full_name);
      setPhoneDraft(resolved.phone);
      const preferences = readPreferences(user.id);
      setNotifications(preferences.notifications);
      setPromoEmails(preferences.promoEmails);
      setError("");
      return resolved;
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unknown error";
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
      const result = await fetchMyOrders();
      setOrders(result.orders || []);
      setOrderSummary(
        typeof result.totalOrders === "number" && typeof result.completedOrders === "number"
          ? { totalOrders: result.totalOrders, completedOrders: result.completedOrders }
          : null
      );
      setError(result.message || "");
    } catch (err) {
      console.error("Order history request failed:", err);
      setOrders([]);
      setOrderSummary(null);
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
            ? "Saved addresses are not set up yet. Apply the BiteGo Supabase setup before using this section."
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
      await Promise.allSettled([loadOrders(loadedProfile.id), loadAddresses(loadedProfile.id)]);
    };
    void loadAll();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") return;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
      if (!session?.user) {
        setProfile(null);
        setOrders([]);
        setOrderSummary(null);
        setAddresses([]);
        setLoadingProfile(false);
        setLoadingOrders(false);
        setLoadingAddresses(false);
        setError("Please sign in to view your account.");
        return;
      }
      refreshTimer = window.setTimeout(() => {
        if (!cancelled) void loadAll();
      }, 0);
    });

    return () => {
      cancelled = true;
      if (refreshTimer !== undefined) window.clearTimeout(refreshTimer);
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
    if (phone.length > 30) {
      notify("Phone numbers must be 30 characters or fewer.", true);
      return;
    }

    setSavingProfile(true);
    try {
      const { data, error: updateError } = await supabase
        .from("profiles")
        .upsert(
          { id: profile.id, full_name, phone, email: profile.email, avatar_url: profile.avatar_url },
          { onConflict: "id" }
        )
        .select("id, full_name, email, phone, avatar_url, role, status")
        .single();
      if (updateError) throw new Error(updateError.message);
      setProfile({
        ...profile,
        ...data,
        email: profile.email,
        full_name: data.full_name || full_name,
        phone: data.phone || "",
      });
      closeModal();
      notify("Profile updated.");
    } catch (err) {
      notify(`Could not save profile: ${err instanceof Error ? err.message : "Unknown error"}`, true);
    } finally {
      setSavingProfile(false);
    }
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
    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${profile.id}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw new Error(`${uploadError.message}. Check the "${AVATAR_BUCKET}" bucket and its policies.`);

      const { data: publicData } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const avatar_url = publicData.publicUrl;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url })
        .eq("id", profile.id);
      if (updateError) throw new Error(`Photo uploaded but profile could not be updated: ${updateError.message}`);

      setProfile((current) => current ? { ...current, avatar_url } : current);
      window.dispatchEvent(new CustomEvent("foodie6:avatar-updated", { detail: { avatarUrl: avatar_url } }));
      notify("Profile photo updated.");
    } catch (err) {
      notify(`Could not upload photo: ${err instanceof Error ? err.message : "Unknown error"}`, true);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const openAddAddress = () => {
    setEditingAddress(null);
    setAddressDraft({ label: "Home", address: "", icon: "🏠", is_default: addresses.length === 0 });
    setModal("address");
    setClosingModal(false);
  };

  const openEditAddress = (address: Address) => {
    setEditingAddress(address);
    setAddressDraft({
      label: address.label,
      address: address.address,
      icon: address.icon || "📍",
      is_default: Boolean(address.is_default),
    });
    setModal("address");
    setClosingModal(false);
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
    try {
      if (addressDraft.is_default) {
        const { error: defaultError } = await supabase
          .from(ADDRESS_TABLE)
          .update({ is_default: false })
          .eq("user_id", profile.id);
        if (defaultError) throw new Error(`Could not update default address: ${defaultError.message}`);
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
      if (saveError) throw new Error(saveError.message);
      closeModal();
      notify(editingAddress ? "Address updated." : "Address added.");
      await loadAddresses(profile.id);
    } catch (err) {
      notify(`Could not save address: ${err instanceof Error ? err.message : "Unknown error"}`, true);
    } finally {
      setSavingAddress(false);
    }
  };

  const deleteAddress = async (address: Address) => {
    if (!profile || !window.confirm(`Delete the ${address.label} address?`)) return;
    try {
      const { error: deleteError } = await supabase
        .from(ADDRESS_TABLE)
        .delete()
        .eq("id", address.id)
        .eq("user_id", profile.id);
      if (deleteError) throw new Error(deleteError.message);
      notify("Address deleted.");
      await loadAddresses(profile.id);
    } catch (err) {
      notify(`Could not delete address: ${err instanceof Error ? err.message : "Unknown error"}`, true);
    }
  };

  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      notify(`Could not sign out: ${signOutError.message}`, true);
      return;
    }
    navigate("home");
  };

  const updatePreference = (key: "notifications" | "promoEmails", value: boolean) => {
    const next = { notifications, promoEmails, [key]: value };
    if (key === "notifications") setNotifications(value);
    else setPromoEmails(value);
    if (!profile) return;
    try {
      window.localStorage.setItem(`${PREFERENCES_KEY}${profile.id}`, JSON.stringify(next));
    } catch {
      notify("This browser could not save the preference on this device.", true);
    }
  };

  if (loadingProfile) return <ProfileSkeleton />;

  if (!profile) {
    return (
      <div className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-4 py-12 text-center animate-fade-up">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--secondary)] text-[var(--primary)]"><Icon name="user" className="h-8 w-8" /></span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary)]">BiteGo account</p>
        <h1 className="mt-2 text-2xl font-extrabold text-[var(--foreground)]">Sign in to your account</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">Your profile, order history and saved delivery addresses are available after signing in.</p>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => navigate("login")} className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"><Icon name="user" className="h-4 w-4" /> Sign in / Create account</button>
          <button type="button" onClick={() => navigate("home")} className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold transition-colors hover:bg-[var(--muted)]">Back to BiteGo</button>
        </div>
      </div>
    );
  }

  const completedOrdersFromList = orders.filter((order) => ["delivered", "completed"].includes(String(order.status || "").toLowerCase())).length;
  const totalOrderCount = orderSummary?.totalOrders ?? orders.length;
  const completedOrderCount = orderSummary?.completedOrders ?? completedOrdersFromList;
  const accountIsActive = !profile.status || profile.status.toLowerCase() === "active";
  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: "orders", label: "Order history", icon: "orders" },
    { id: "addresses", label: "Saved addresses", icon: "pin" },
    { id: "settings", label: "Account settings", icon: "settings" },
  ];

  return (
    <div className="mx-auto min-h-full max-w-6xl animate-fade-up px-4 py-7 pb-28 sm:px-6 lg:py-10">
      {(message || error) && (
        <div role={error ? "alert" : "status"} className={`fixed right-4 top-20 z-[100] flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl sm:right-6 ${error ? "bg-red-700 text-white" : "bg-[var(--foreground)] text-white"}`}>
          <span className="flex-1">{error || message}</span>
          <button type="button" onClick={() => { setMessage(""); setError(""); }} className="rounded-md p-0.5 opacity-80 transition-opacity hover:opacity-100" aria-label="Dismiss message"><Icon name="close" className="h-4 w-4" /></button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Your account</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[var(--foreground)] sm:text-3xl">Welcome back{profile.full_name ? `, ${profile.full_name.split(/\s+/)[0]}` : ""}</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Your BiteGo details, orders and delivery preferences.</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${accountIsActive ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span className={`h-1.5 w-1.5 rounded-full ${accountIsActive ? "bg-emerald-500" : "bg-amber-500"}`} /> {accountIsActive ? "Account active" : displayStatus(profile.status)}</span>
      </div>

      <section className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(115deg,#211f1d_0%,#30251f_58%,#513022_100%)] px-5 py-6 text-white shadow-[var(--shadow-md)] sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] border-l border-white/10 bg-white/[0.025] md:block" />
        <div className="relative grid gap-7 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)] md:items-center">
          <div className="flex min-w-0 items-center gap-4 sm:gap-6">
            <div className="relative shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={`${profile.full_name || "Customer"} profile`} className="h-20 w-20 rounded-2xl border-2 border-white/25 object-cover shadow-lg sm:h-24 sm:w-24" />
              ) : (
                <div aria-label="Profile initials" className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-white/25 bg-white/10 text-2xl font-extrabold sm:h-24 sm:w-24">{initials(profile.full_name || profile.email)}</div>
              )}
              <input id="profile-avatar-upload" name="avatar" ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={uploadAvatar} className="sr-only" />
              <button type="button" title="Change profile photo" aria-label="Change profile photo" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-xl border-2 border-[#30251f] bg-white text-[var(--primary)] shadow-md transition-transform hover:scale-105 disabled:cursor-wait disabled:opacity-60">
                {uploadingAvatar ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" /> : <Icon name="camera" className="h-4 w-4" />}
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-200">BiteGo member</p>
              <h2 className="mt-1 truncate text-xl font-extrabold sm:text-2xl">{profile.full_name || "Your profile"}</h2>
              <div className="mt-2 space-y-1.5 text-sm text-white/75">
                <p className="flex min-w-0 items-center gap-2"><Icon name="mail" className="h-4 w-4 shrink-0 text-orange-200" /><span className="truncate">{profile.email || "Email unavailable"}</span></p>
                <p className="flex min-w-0 items-center gap-2"><Icon name="phone" className="h-4 w-4 shrink-0 text-orange-200" /><span className="truncate">{profile.phone || "Add a phone number"}</span></p>
              </div>
              <button type="button" onClick={() => { setNameDraft(profile.full_name); setPhoneDraft(profile.phone); setModal("profile"); setClosingModal(false); }} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 text-sm font-semibold transition-colors hover:bg-white/20">
                <Icon name="edit" className="h-4 w-4" /> Edit profile
              </button>
            </div>
          </div>

          <div className="relative grid grid-cols-2 divide-x divide-white/15 border-t border-white/15 pt-5 md:border-l md:border-t-0 md:pl-7 md:pt-0">
            <div className="pr-4 sm:pr-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-orange-200"><Icon name="bag" className="h-5 w-5" /></span>
              <p className="mt-3 text-3xl font-extrabold tabular-nums">{loadingOrders ? "–" : totalOrderCount}</p>
              <p className="mt-1 text-xs font-medium text-white/65">Orders placed</p>
            </div>
            <div className="pl-4 sm:pl-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-emerald-200"><Icon name="check" className="h-5 w-5" /></span>
              <p className="mt-3 text-3xl font-extrabold tabular-nums">{loadingOrders ? "–" : completedOrderCount}</p>
              <p className="mt-1 text-xs font-medium text-white/65">Completed orders</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-7 grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-2 lg:sticky lg:top-24">
        <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-[var(--border)] bg-white p-2 shadow-[var(--shadow-sm)] lg:flex-col lg:overflow-visible" aria-label="Account sections" role="tablist">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} aria-controls={`profile-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)} className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-all duration-200 lg:w-full ${activeTab === tab.id ? "bg-[var(--secondary)] text-[var(--primary)] shadow-sm" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"}`}>
              <Icon name={tab.icon} className="h-[18px] w-[18px] shrink-0" /><span>{tab.label}</span>
              {activeTab === tab.id && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-[var(--primary)] lg:block" />}
            </button>
          ))}
        </nav>
        <button type="button" onClick={() => void signOut()} className="hidden min-h-11 w-full items-center gap-3 rounded-xl border border-red-100 bg-white px-3 text-left text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 lg:flex"><Icon name="logout" className="h-[18px] w-[18px]" /> Sign out</button>
        </div>

        <section key={activeTab} id={`profile-panel-${activeTab}`} role="tabpanel" aria-label={tabs.find((tab) => tab.id === activeTab)?.label} className="min-w-0 animate-fade-up">
          {activeTab === "orders" && (
            <div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div><h2 className="text-lg font-extrabold text-[var(--foreground)]">Order history</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Your recent BiteGo orders.</p></div>
                {!loadingOrders && orders.length > 0 && <span className="text-xs font-semibold text-[var(--muted-foreground)]">{orders.length} {orders.length === 1 ? "order" : "orders"}</span>}
              </div>
              {loadingOrders ? (
                <div className="space-y-3" role="status" aria-label="Loading orders"><div className="skeleton h-36 rounded-2xl" /><div className="skeleton h-36 rounded-2xl" /><span className="sr-only">Loading your orders…</span></div>
              ) : orders.length === 0 ? (
                <EmptyState icon="orders" title="No orders yet" description="Your order history will appear here after your first BiteGo order." action={<button type="button" onClick={() => navigate("restaurants")} className="btn-primary mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold">Explore restaurants <Icon name="arrow" className="h-4 w-4" /></button>} />
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => {
                    const orderTotal = order.total_amount ?? order.total;
                    const restaurantName = order.restaurant_name || order.restaurant?.name || "BiteGo order";
                    return (
                      <article key={String(order.id)} className="group rounded-2xl border border-[var(--border)] bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[var(--shadow-md)] sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary)] text-[var(--primary)]"><Icon name="bag" className="h-5 w-5" /></span>
                            <div className="min-w-0">
                              <h3 className="truncate font-bold text-[var(--foreground)]">{restaurantName}</h3>
                              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted-foreground)]"><span className="inline-flex items-center gap-1"><Icon name="calendar" className="h-3.5 w-3.5" />{formatDate(order.created_at)}</span><span aria-hidden="true">·</span><span>#{String(order.id)}</span></p>
                            </div>
                          </div>
                          <div className="ml-auto text-right sm:ml-0">
                            <p className="font-extrabold tabular-nums text-[var(--foreground)]">{formatMoney(orderTotal)}</p>
                            <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${statusStyle(order.status)}`}>{displayStatus(order.status)}</span>
                          </div>
                        </div>
                        {order.items && order.items.length > 0 && (
                          <div className="mt-4 border-t border-[var(--border)] pt-3">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Items</p>
                            <p className="mt-1.5 text-sm leading-6 text-[var(--ink-soft)]">{order.items.map((item) => `${item.name || item.item_name || "Item"} × ${Number(item.quantity || 1)}`).join(" · ")}</p>
                          </div>
                        )}
                        <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:justify-end">
                          <button type="button" onClick={() => navigate("tracking", order)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 text-sm font-semibold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"><Icon name="pin" className="h-4 w-4" /> Track order</button>
                          <button type="button" onClick={() => navigate("restaurants")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-brand)]"><Icon name="orders" className="h-4 w-4" /> Order again</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "addresses" && (
            <div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div><h2 className="text-lg font-extrabold text-[var(--foreground)]">Saved addresses</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Choose a familiar place for your next delivery.</p></div>
                <button type="button" onClick={openAddAddress} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--primary)] px-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-brand)]"><Icon name="plus" className="h-4 w-4" /> Add address</button>
              </div>
              {loadingAddresses ? (
                <div className="space-y-3" role="status" aria-label="Loading addresses"><div className="skeleton h-24 rounded-2xl" /><div className="skeleton h-24 rounded-2xl" /><span className="sr-only">Loading saved addresses…</span></div>
              ) : addresses.length === 0 ? (
                <EmptyState icon="pin" title="No saved addresses" description="Save your home, office or another delivery location for a faster checkout." action={<button type="button" onClick={openAddAddress} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--primary)] px-4 py-2.5 text-sm font-bold text-[var(--primary)] transition-colors hover:bg-[var(--secondary)]"><Icon name="plus" className="h-4 w-4" /> Add your first address</button>} />
              ) : (
                <div className="space-y-3">
                  {addresses.map((address) => (
                    <article key={address.id} className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 transition-all duration-200 hover:border-orange-200 hover:shadow-[var(--shadow-sm)] sm:flex-row sm:items-center sm:p-5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary)] text-xl" aria-hidden="true">{address.icon || "📍"}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[var(--foreground)]">{address.label}</h3>{address.is_default && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700"><Icon name="check" className="h-3 w-3" /> Default</span>}</div>
                        <p className="mt-1 break-words text-sm leading-6 text-[var(--muted-foreground)]">{address.address}</p>
                      </div>
                      <div className="flex shrink-0 gap-2 sm:ml-auto">
                        <button type="button" onClick={() => openEditAddress(address)} aria-label={`Edit ${address.label} address`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"><Icon name="edit" className="h-3.5 w-3.5" /> Edit</button>
                        <button type="button" onClick={() => void deleteAddress(address)} aria-label={`Delete ${address.label} address`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50"><Icon name="trash" className="h-3.5 w-3.5" /> Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-5">
              <div><h2 className="text-lg font-extrabold text-[var(--foreground)]">Account settings</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Manage your profile and preferences.</p></div>
              <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                <div className="flex items-start gap-3 border-b border-[var(--border)] p-4 sm:p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--secondary)] text-[var(--primary)]"><Icon name="settings" className="h-[18px] w-[18px]" /></span>
                  <div><h3 className="font-bold">Preferences on this device</h3><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">These choices are saved in this browser only. They are not sent to BiteGo or used to send messages.</p></div>
                </div>
                <label className="flex cursor-pointer items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 transition-colors hover:bg-[var(--muted)]/50 sm:px-5">
                  <span><span className="block text-sm font-semibold">Order update preference</span><span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">Local preference only; notifications are not connected.</span></span>
                  <input id="preference-notifications" name="notifications" type="checkbox" checked={notifications} onChange={(event) => updatePreference("notifications", event.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-[var(--muted)]/50 sm:px-5">
                  <span><span className="block text-sm font-semibold">Promotional email preference</span><span className="mt-0.5 block text-xs text-[var(--muted-foreground)]">Local preference only; marketing emails are not connected.</span></span>
                  <input id="preference-promos" name="promos" type="checkbox" checked={promoEmails} onChange={(event) => updatePreference("promoEmails", event.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
                </label>
              </section>

              <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
                <div className="border-b border-[var(--border)] px-4 py-4 sm:px-5"><h3 className="font-bold">Account information</h3><p className="mt-1 text-xs text-[var(--muted-foreground)]">Your details are stored with your BiteGo profile.</p></div>
                <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                  <div className="flex min-w-0 items-start gap-3"><Icon name="user" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" /><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Full name</p><p className="mt-1 truncate text-sm font-semibold">{profile.full_name || "Not provided"}</p></div></div>
                  <div className="flex min-w-0 items-start gap-3"><Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" /><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Email</p><p className="mt-1 truncate text-sm font-semibold">{profile.email || "Not available"}</p><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">Managed by your sign-in account</p></div></div>
                  <div className="flex min-w-0 items-start gap-3"><Icon name="phone" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" /><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Phone</p><p className="mt-1 truncate text-sm font-semibold">{profile.phone || "Not provided"}</p></div></div>
                  <div className="flex min-w-0 items-start gap-3"><Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" /><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Account status</p><p className="mt-1 text-sm font-semibold">{displayStatus(profile.status || "active")}</p></div></div>
                </div>
                <div className="border-t border-[var(--border)] px-4 py-3 sm:px-5"><button type="button" onClick={() => { setNameDraft(profile.full_name); setPhoneDraft(profile.phone); setModal("profile"); setClosingModal(false); }} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] transition-colors hover:text-[var(--foreground)]"><Icon name="edit" className="h-4 w-4" /> Edit profile details</button></div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--foreground)]"><Icon name="help" className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-bold">Help & support</h3><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">In-app support contact details are not configured. Please use BiteGo’s official support channel.</p></div>
                <div className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--muted)] text-[var(--foreground)]"><Icon name="shield" className="h-5 w-5" /></span><h3 className="mt-3 text-sm font-bold">Account privacy</h3><p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">Your personal details and addresses are associated with your signed-in account.</p></div>
              </section>
              <button type="button" onClick={() => void signOut()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-700 transition-colors hover:bg-red-50 lg:hidden"><Icon name="logout" className="h-4 w-4" /> Sign out</button>
            </div>
          )}
        </section>
      </div>

      {modal && (
        <div className={`fixed inset-0 z-[90] flex items-end justify-center bg-black/55 p-0 backdrop-blur-[2px] transition-opacity duration-200 sm:items-center sm:p-4 ${closingModal ? "opacity-0" : "animate-fade-in"}`} onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
          {modal === "profile" ? (
            <form role="dialog" aria-modal="true" aria-labelledby="profile-modal-title" onSubmit={saveProfile} className={`max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl transition-all duration-200 sm:rounded-2xl sm:p-6 ${closingModal ? "translate-y-5 scale-[0.98] opacity-0 sm:translate-y-2" : "animate-fade-up"}`}>
              <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--primary)]">Account details</p><h2 id="profile-modal-title" className="mt-1 text-xl font-extrabold">Edit profile</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">Your email is managed by your sign-in account.</p></div><button type="button" onClick={closeModal} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] transition-colors hover:bg-[var(--border)]" aria-label="Close edit profile"><Icon name="close" className="h-4 w-4" /></button></div>
              <label className="mb-4 block"><span className="mb-1.5 block text-xs font-bold">Full name</span><input id="profile-full-name" name="full_name" autoComplete="name" autoFocus required maxLength={120} value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 text-sm outline-none transition-shadow focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" placeholder="Your full name" /></label>
              <label className="mb-4 block"><span className="mb-1.5 block text-xs font-bold">Email</span><input id="profile-email" name="email" autoComplete="email" disabled value={profile.email} className="w-full rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3.5 py-3 text-sm text-[var(--muted-foreground)]" /></label>
              <label className="block"><span className="mb-1.5 block text-xs font-bold">Phone number</span><input id="profile-phone" name="phone" autoComplete="tel" maxLength={30} value={phoneDraft} onChange={(event) => setPhoneDraft(event.target.value)} className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 text-sm outline-none transition-shadow focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" placeholder="Your phone number" /></label>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={closeModal} className="min-h-11 flex-1 rounded-xl border border-[var(--border)] text-sm font-semibold transition-colors hover:bg-[var(--muted)]">Cancel</button><button type="submit" disabled={savingProfile} className="btn-primary min-h-11 flex-1 rounded-xl text-sm font-bold disabled:cursor-wait disabled:opacity-60">{savingProfile ? "Saving…" : "Save changes"}</button></div>
            </form>
          ) : (
            <form role="dialog" aria-modal="true" aria-labelledby="address-modal-title" onSubmit={saveAddress} className={`max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl transition-all duration-200 sm:rounded-2xl sm:p-6 ${closingModal ? "translate-y-5 scale-[0.98] opacity-0 sm:translate-y-2" : "animate-fade-up"}`}>
              <div className="mb-5 flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--primary)]">Delivery details</p><h2 id="address-modal-title" className="mt-1 text-xl font-extrabold">{editingAddress ? "Edit address" : "Add delivery address"}</h2></div><button type="button" onClick={closeModal} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--muted)] transition-colors hover:bg-[var(--border)]" aria-label="Close address form"><Icon name="close" className="h-4 w-4" /></button></div>
              <label className="mb-4 block"><span className="mb-1.5 block text-xs font-bold">Address label</span><select id="address-label" name="label" required value={addressDraft.label} onChange={(event) => setAddressDraft((current) => ({ ...current, label: event.target.value }))} className="w-full rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15">{["Home", "Office", "Other"].map((label) => <option key={label} value={label}>{label}</option>)}</select></label>
              <label className="mb-4 block"><span className="mb-1.5 block text-xs font-bold">Full delivery address</span><textarea id="delivery-address" name="address" autoComplete="street-address" required maxLength={500} rows={3} value={addressDraft.address} onChange={(event) => setAddressDraft((current) => ({ ...current, address: event.target.value }))} className="w-full resize-y rounded-xl border border-[var(--border)] bg-white px-3.5 py-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15" placeholder="Street, building, district, city" /></label>
              <fieldset className="mb-4"><legend className="mb-2 text-xs font-bold">Choose an icon</legend><div className="flex gap-2">{[{ value: "🏠", label: "Home" }, { value: "🏢", label: "Office" }, { value: "📍", label: "Location" }, { value: "🏨", label: "Hotel" }, { value: "🏫", label: "School" }].map((icon) => <button key={icon.value} type="button" onClick={() => setAddressDraft((current) => ({ ...current, icon: icon.value }))} className={`flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition-colors ${addressDraft.icon === icon.value ? "border-[var(--primary)] bg-[var(--secondary)]" : "border-[var(--border)] hover:bg-[var(--muted)]"}`} aria-label={`Choose ${icon.label} icon`} aria-pressed={addressDraft.icon === icon.value}>{icon.value}</button>)}</div></fieldset>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium"><input id="address-is-default" name="is_default" type="checkbox" checked={addressDraft.is_default} onChange={(event) => setAddressDraft((current) => ({ ...current, is_default: event.target.checked }))} className="h-4 w-4 accent-[var(--primary)]" /> Set as default address</label>
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={closeModal} className="min-h-11 flex-1 rounded-xl border border-[var(--border)] text-sm font-semibold transition-colors hover:bg-[var(--muted)]">Cancel</button><button type="submit" disabled={savingAddress} className="btn-primary min-h-11 flex-1 rounded-xl text-sm font-bold disabled:cursor-wait disabled:opacity-60">{savingAddress ? "Saving…" : editingAddress ? "Save address" : "Add address"}</button></div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}