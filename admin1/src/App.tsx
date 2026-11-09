import { useState, useCallback, useEffect } from "react";
import Login from "./pages/Login";
import Layout, { type Page } from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Restaurants from "./pages/Restaurants";
import Menu from "./pages/Menu";
import Categories from "./pages/Categories";
import Customers from "./pages/Customers";
import Payments from "./pages/Payments";
import Reviews from "./pages/Reviews";
import Promotions from "./pages/Promotions";
import Riders from "./pages/Riders";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Toast, { type ToastItem, type ToastType } from "./components/Toast";
import { supabase } from "./lib/supabase";
import { loadLiveData } from "./data/mockData";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      try { setLoadingData(true); await loadLiveData(); setLoggedIn(true); } catch (e) { console.error(e); await supabase.auth.signOut(); } finally { setLoadingData(false); }
    });
  }, []);

  const handleLogin = async () => {
    try { setLoadingData(true); await loadLiveData(); setLoggedIn(true); } catch (e:any) { console.error(e); showToast?.(e.message || "Unable to load data", "error"); await supabase.auth.signOut(); } finally { setLoadingData(false); }
  };

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (loadingData) return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",fontFamily:"Arial",color:"#6B7280"}}>Loading BiteGo Admin…</div>;

  if (!loggedIn) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  const pageProps = { showToast };

  const pages: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />,
    orders: <Orders {...pageProps} />,
    restaurants: <Restaurants {...pageProps} />,
    menu: <Menu {...pageProps} />,
    categories: <Categories {...pageProps} />,
    customers: <Customers {...pageProps} />,
    payments: <Payments {...pageProps} />,
    reviews: <Reviews {...pageProps} />,
    promotions: <Promotions {...pageProps} />,
    riders: <Riders {...pageProps} />,
    reports: <Reports {...pageProps} />,
    settings: <Settings {...pageProps} />,
  };

  return (
    <>
      <Layout page={page} onNavigate={setPage} notifications={3}>
        {pages[page]}
      </Layout>
      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
}
