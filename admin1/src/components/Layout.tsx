import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  LayoutDashboard,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Grid3X3,
  Users,
  CreditCard,
  Star,
  Tag,
  Bike,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";

export type Page =
  | "dashboard"
  | "orders"
  | "restaurants"
  | "menu"
  | "categories"
  | "customers"
  | "payments"
  | "reviews"
  | "promotions"
  | "riders"
  | "reports"
  | "settings";

const navItems: {
  id: Page;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
  },
  {
    id: "orders",
    label: "Orders",
    icon: <ShoppingBag size={18} />,
  },
  {
    id: "restaurants",
    label: "Restaurants",
    icon: <Store size={18} />,
  },
  {
    id: "menu",
    label: "Menu",
    icon: <UtensilsCrossed size={18} />,
  },
  {
    id: "categories",
    label: "Categories",
    icon: <Grid3X3 size={18} />,
  },
  {
    id: "customers",
    label: "Customers",
    icon: <Users size={18} />,
  },
  {
    id: "payments",
    label: "Payments",
    icon: <CreditCard size={18} />,
  },
  {
    id: "reviews",
    label: "Reviews",
    icon: <Star size={18} />,
  },
  {
    id: "promotions",
    label: "Promotions",
    icon: <Tag size={18} />,
  },
  {
    id: "riders",
    label: "Riders",
    icon: <Bike size={18} />,
  },
  {
    id: "reports",
    label: "Reports",
    icon: <BarChart3 size={18} />,
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings size={18} />,
  },
];

interface LayoutProps {
  page: Page;
  onNavigate: (p: Page) => void;
  children: React.ReactNode;
  notifications: number;
}

export default function Layout({
  page,
  onNavigate,
  children,
  notifications,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const [userName, setUserName] = useState("Super Admin");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("Admin");
  const [loggingOut, setLoggingOut] = useState(false);

  const currentItem = navItems.find((n) => n.id === page);

  // ============================================================
  // LOAD CURRENT SUPABASE USER
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted || !user) return;

        setUserEmail(user.email || "");

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, role, status")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.warn("Profile could not be loaded:", error.message);
        }

        if (!mounted) return;

        if (profile) {
          setUserName(profile.full_name || "Super Admin");

          const role = String(profile.role || "admin").toLowerCase();

          if (role === "admin" || role === "super_admin") {
            setUserRole("Super Admin");
          } else if (role === "manager") {
            setUserRole("Manager");
          } else if (role === "staff") {
            setUserRole("Staff");
          } else {
            setUserRole(profile.role || "Admin");
          }
        }
      } catch (error) {
        console.error("Failed to load user:", error);
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================
  // CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
  // ============================================================

  useEffect(() => {
    const handleClickOutside = () => {
      setUserMenuOpen(false);
      setNotificationOpen(false);
    };

    if (userMenuOpen || notificationOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [userMenuOpen, notificationOpen]);

  // ============================================================
  // CLOSE MOBILE SIDEBAR WHEN WINDOW BECOMES DESKTOP
  // ============================================================

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // ============================================================
  // USER INITIALS
  // ============================================================

  const initials =
    userName
      .split(" ")
      .filter(Boolean)
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SA";

  // ============================================================
  // NAVIGATION
  // ============================================================

  const handleNavigation = (nextPage: Page) => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
    setNotificationOpen(false);
    setMobileSearchOpen(false);
    onNavigate(nextPage);
  };

  // ============================================================
  // NOTIFICATIONS
  // ============================================================

  const handleNotifications = () => {
    setUserMenuOpen(false);
    setNotificationOpen((value) => !value);
  };

  // ============================================================
  // ACCOUNT SETTINGS
  // ============================================================

  const handleAccountSettings = () => {
    setUserMenuOpen(false);
    setNotificationOpen(false);
    setSidebarOpen(false);
    onNavigate("settings");
  };

  // ============================================================
  // PROFILE
  // ============================================================

  const handleProfile = () => {
    setUserMenuOpen(false);
    setNotificationOpen(false);
    setSidebarOpen(false);
    onNavigate("settings");
  };

  // ============================================================
  // SIGN OUT
  // ============================================================

  const handleSignOut = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Sign out error:", error);
        setLoggingOut(false);
        return;
      }

      setUserMenuOpen(false);
      setNotificationOpen(false);
      setSidebarOpen(false);

      window.location.href = "/login";
    } catch (error) {
      console.error("Sign out failed:", error);
      setLoggingOut(false);
    }
  };

  return (
    <>
      {/* ========================================================
          RESPONSIVE CSS
      ======================================================== */}

      <style>
        {`
          .foodie6-sidebar {
            width: 220px;
            background: white;
            border-right: 1px solid #E8EAF0;
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            height: 100%;
            z-index: 100;
            overflow-y: auto;
            position: relative;
            transform: translateX(0);
            transition: transform 0.25s ease;
          }

          .foodie6-sidebar-close {
            display: none;
          }

          .foodie6-mobile-menu {
            display: none;
          }

          .foodie6-overlay {
            display: none;
          }

          .foodie6-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-width: 0;
          }

          .foodie6-header {
            height: 60px;
            background: white;
            border-bottom: 1px solid #E8EAF0;
            display: flex;
            align-items: center;
            padding: 0 24px;
            gap: 16px;
            flex-shrink: 0;
          }

          .foodie6-search {
            max-width: 300px;
            margin-left: auto;
          }

          .foodie6-mobile-search {
            display: none;
            align-items: center;
            justify-content: center;
            width: 38px;
            height: 38px;
            flex-shrink: 0;
            border: none;
            background: transparent;
            color: #6B7280;
            border-radius: 8px;
            cursor: pointer;
          }

          .foodie6-mobile-search:hover {
            background: #F9FAFB;
            color: #F05A28;
          }

          .foodie6-mobile-search-panel {
            display: none;
          }

          .foodie6-user-text {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }

          .foodie6-content {
            flex: 1;
            overflow-y: auto;
            padding: 24px;
          }

          @media (max-width: 768px) {
            .foodie6-sidebar {
              position: fixed;
              top: 0;
              left: 0;
              bottom: 0;
              width: 280px;
              height: 100vh;
              transform: translateX(-100%);
              box-shadow: 8px 0 30px rgba(0, 0, 0, 0.15);
            }

            .foodie6-sidebar.open {
              transform: translateX(0);
            }

            .foodie6-sidebar-close {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 34px;
              height: 34px;
              border: none;
              background: #F9FAFB;
              color: #6B7280;
              border-radius: 8px;
              cursor: pointer;
            }

            .foodie6-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.45);
              z-index: 90;
              display: none;
            }

            .foodie6-overlay.open {
              display: block;
            }

            .foodie6-mobile-menu {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 38px;
              height: 38px;
              flex-shrink: 0;
              border: none;
              background: #F9FAFB;
              color: #374151;
              border-radius: 8px;
              cursor: pointer;
            }

            .foodie6-header {
              height: 60px;
              padding: 0 12px;
              gap: 8px;
            }

            .foodie6-search {
              display: none;
            }

            .foodie6-mobile-search {
              display: flex;
            }

            .foodie6-mobile-search-panel {
              position: fixed;
              top: 68px;
              left: 10px;
              right: 10px;
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 12px;
              background: white;
              border: 1px solid #E8EAF0;
              border-radius: 10px;
              box-shadow: 0 8px 30px rgba(0,0,0,0.12);
              z-index: 250;
            }

            .foodie6-mobile-search-panel input {
              min-width: 0;
              flex: 1;
              border: none;
              outline: none;
              font-size: 14px;
              font-family: 'Inter', sans-serif;
              color: #1A1D23;
              background: transparent;
            }

            .foodie6-user-text {
              display: none;
            }

            .foodie6-content {
              padding: 16px;
            }

            .foodie6-breadcrumb {
              flex: 1;
              min-width: 0;
            }

            .foodie6-breadcrumb-current {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .foodie6-account-button {
              padding: 5px !important;
            }

            .foodie6-account-button svg {
              display: none;
            }

            .foodie6-notification-dropdown {
              position: fixed !important;
              top: 66px !important;
              right: 10px !important;
              width: min(320px, calc(100vw - 20px)) !important;
            }

            .foodie6-account-dropdown {
              position: fixed !important;
              top: 66px !important;
              right: 10px !important;
              width: min(250px, calc(100vw - 20px)) !important;
            }
          }

          @media (max-width: 480px) {
            .foodie6-header {
              padding: 0 8px;
              gap: 4px;
            }

            .foodie6-content {
              padding: 12px;
            }

            .foodie6-breadcrumb span {
              font-size: 12px !important;
            }

            .foodie6-breadcrumb svg {
              width: 12px;
            }
          }
        `}
      </style>

      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          background: "#F5F6FA",
        }}
      >
        {/* ======================================================
            MOBILE OVERLAY
        ====================================================== */}

        <div
          className={`foodie6-overlay${sidebarOpen ? " open" : ""}`}
          onClick={() => setSidebarOpen(false)}
        />

        {/* ======================================================
            SIDEBAR
        ====================================================== */}

        <aside
          className={`foodie6-sidebar${sidebarOpen ? " open" : ""}`}
        >
          {/* Logo */}

          <div
            style={{
              padding: "16px 16px",
              borderBottom: "1px solid #F3F4F6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <img
                src="/brand/bitego-mark.svg"
                alt="BiteGo"
                width={42}
                height={42}
                style={{ display: "block", flexShrink: 0, borderRadius: 13 }}
              />

              <div>
                <div
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 800,
                    fontSize: 17,
                    color: "#1A1D23",
                    letterSpacing: "-0.3px",
                  }}
                >
                  Bite<span style={{ color: "#F05A28" }}>Go</span>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    fontWeight: 500,
                  }}
                >
                  BiteGo Admin Panel
                </div>
              </div>
            </div>

            {/* Mobile X */}

            <button
              className="foodie6-sidebar-close"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
              title="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}

          <nav
            style={{
              padding: "12px 10px",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`sidebar-link${
                  page === item.id ? " active" : ""
                }`}
                style={{
                  width: "100%",
                  background: undefined,
                }}
              >
                {item.icon}

                <span>{item.label}</span>

                {item.id === "orders" && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: "#F05A28",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 10,
                    }}
                  >
                    4
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Sidebar User */}

          <div
            style={{
              padding: "12px 10px",
              borderTop: "1px solid #F3F4F6",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background:
                    "linear-gradient(135deg, #F05A28, #E03A10)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: 700,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
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
                  {userName}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {userEmail || "Loading..."}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ======================================================
            MAIN
        ====================================================== */}

        <div className="foodie6-main">
          {/* ====================================================
              TOPBAR
          ==================================================== */}

          <header className="foodie6-header">
            {/* MOBILE HAMBURGER */}

            <button
              className="foodie6-mobile-menu"
              onClick={() => {
                setSidebarOpen(true);
                setUserMenuOpen(false);
                setNotificationOpen(false);
              }}
              aria-label="Open menu"
              title="Open menu"
            >
              <Menu size={21} />
            </button>

            {/* Breadcrumb */}

            <div
              className="foodie6-breadcrumb"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "#9CA3AF",
                }}
              >
                BiteGo
              </span>

              <ChevronRight
                size={14}
                color="#D1D5DB"
              />

              <span
                className="foodie6-breadcrumb-current"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1A1D23",
                }}
              >
                {currentItem?.label}
              </span>
            </div>

            {/* Search */}

            <div
              className="search-bar foodie6-search"
              style={{
                width: "100%",
              }}
            >
              <Search
                size={15}
                color="#9CA3AF"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search anything..."
              />
            </div>

            {/* ==================================================
                MOBILE SEARCH
            ================================================== */}

            <button
              className="foodie6-mobile-search"
              onClick={(e) => {
                e.stopPropagation();
                setNotificationOpen(false);
                setUserMenuOpen(false);
                setMobileSearchOpen((value) => !value);
              }}
              aria-label="Search"
              title="Search"
            >
              <Search size={20} />
            </button>

            {/* ==================================================
                NOTIFICATIONS
            ================================================== */}

            <div
              style={{
                position: "relative",
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNotifications();
                }}
                title="Notifications"
                aria-label="Notifications"
                style={{
                  position: "relative",
                  background: notificationOpen
                    ? "#FFF0EB"
                    : "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 8,
                  color: notificationOpen
                    ? "#F05A28"
                    : "#6B7280",
                }}
              >
                <Bell size={20} />

                {notifications > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      right: 3,
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      background: "#F05A28",
                      color: "white",
                      borderRadius: 10,
                      border: "2px solid white",
                      fontSize: 9,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {notifications > 99
                      ? "99+"
                      : notifications}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}

              {notificationOpen && (
                <div
                  className="foodie6-notification-dropdown"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: 6,
                    width: 320,
                    background: "white",
                    border: "1px solid #E8EAF0",
                    borderRadius: 10,
                    boxShadow:
                      "0 8px 30px rgba(0,0,0,0.12)",
                    zIndex: 200,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "14px 16px",
                      borderBottom:
                        "1px solid #F3F4F6",
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: "#1A1D23",
                      }}
                    >
                      Notifications
                    </div>

                    {notifications > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#F05A28",
                        }}
                      >
                        {notifications} new
                      </span>
                    )}
                  </div>

                  {notifications > 0 ? (
                    <div>
                      <button
                        onClick={() =>
                          handleNavigation(
                            "orders"
                          )
                        }
                        style={{
                          width: "100%",
                          display: "flex",
                          gap: 12,
                          padding: "14px 16px",
                          border: "none",
                          borderBottom:
                            "1px solid #F3F4F6",
                          background: "white",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 8,
                            background: "#FFF0EB",
                            color: "#F05A28",
                            display: "flex",
                            alignItems: "center",
                            justifyContent:
                              "center",
                            flexShrink: 0,
                          }}
                        >
                          <ShoppingBag size={16} />
                        </div>

                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#1A1D23",
                            }}
                          >
                            Pending orders
                          </div>

                          <div
                            style={{
                              fontSize: 12,
                              color: "#6B7280",
                              marginTop: 3,
                            }}
                          >
                            You have{" "}
                            {notifications} notification
                            {notifications !== 1
                              ? "s"
                              : ""}
                            .
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() =>
                          handleNavigation(
                            "orders"
                          )
                        }
                        style={{
                          width: "100%",
                          padding: "11px 16px",
                          border: "none",
                          background: "white",
                          color: "#F05A28",
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                      >
                        View Orders →
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "30px 20px",
                        textAlign: "center",
                      }}
                    >
                      <Bell
                        size={30}
                        color="#D1D5DB"
                        style={{
                          marginBottom: 8,
                        }}
                      />

                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#374151",
                        }}
                      >
                        No new notifications
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#9CA3AF",
                          marginTop: 4,
                        }}
                      >
                        You're all caught up.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ==================================================
                ADMIN ACCOUNT
            ================================================== */}

            <div
              style={{
                position: "relative",
              }}
            >
              <button
                className="foodie6-account-button"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotificationOpen(false);
                  setUserMenuOpen(
                    (value) => !value
                  );
                }}
                title="Account menu"
                aria-label="Account menu"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: userMenuOpen
                    ? "#F9FAFB"
                    : "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "6px 10px",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background:
                      "linear-gradient(135deg, #F05A28, #E03A10)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: 700,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                <div className="foodie6-user-text">
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#374151",
                    }}
                  >
                    {userName}
                  </span>

                  <span
                    style={{
                      fontSize: 10,
                      color: "#9CA3AF",
                    }}
                  >
                    {userRole}
                  </span>
                </div>

                <ChevronDown
                  size={14}
                  color="#9CA3AF"
                />
              </button>

              {/* Account dropdown */}

              {userMenuOpen && (
                <div
                  className="foodie6-account-dropdown"
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    background: "white",
                    border: "1px solid #E8EAF0",
                    borderRadius: 10,
                    padding: 8,
                    width: 230,
                    boxShadow:
                      "0 8px 30px rgba(0,0,0,0.12)",
                    zIndex: 200,
                    marginTop: 6,
                  }}
                >
                  {/* Account information */}

                  <div
                    style={{
                      padding:
                        "10px 10px 12px",
                      borderBottom:
                        "1px solid #F3F4F6",
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 9,
                          background:
                            "linear-gradient(135deg, #F05A28, #E03A10)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "center",
                          color: "white",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {initials}
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#1A1D23",
                            whiteSpace:
                              "nowrap",
                            overflow: "hidden",
                            textOverflow:
                              "ellipsis",
                          }}
                        >
                          {userName}
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color: "#9CA3AF",
                            marginTop: 2,
                            whiteSpace:
                              "nowrap",
                            overflow: "hidden",
                            textOverflow:
                              "ellipsis",
                          }}
                        >
                          {userEmail ||
                            "Loading..."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile */}

                  <button
                    onClick={handleProfile}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "9px 10px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      borderRadius: 7,
                      fontSize: 14,
                      color: "#374151",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "none";
                    }}
                  >
                    <User size={15} />
                    Profile
                  </button>

                  {/* Account Settings */}

                  <button
                    onClick={
                      handleAccountSettings
                    }
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "9px 10px",
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      borderRadius: 7,
                      fontSize: 14,
                      color: "#374151",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "#F9FAFB";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "none";
                    }}
                  >
                    <Settings size={15} />
                    Account Settings
                  </button>

                  <div
                    style={{
                      height: 1,
                      background: "#F3F4F6",
                      margin: "4px 0",
                    }}
                  />

                  {/* Sign out */}

                  <button
                    onClick={handleSignOut}
                    disabled={loggingOut}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      padding: "9px 10px",
                      border: "none",
                      background: "none",
                      cursor: loggingOut
                        ? "wait"
                        : "pointer",
                      borderRadius: 7,
                      fontSize: 14,
                      color: "#EF4444",
                      textAlign: "left",
                      opacity: loggingOut
                        ? 0.6
                        : 1,
                    }}
                  >
                    <LogOut size={15} />

                    {loggingOut
                      ? "Signing Out..."
                      : "Sign Out"}
                  </button>
                </div>
              )}
            </div>
          </header>

          {mobileSearchOpen && (
            <div
              className="foodie6-mobile-search-panel"
              onClick={(e) => e.stopPropagation()}
            >
              <Search size={16} color="#9CA3AF" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anything..."
                aria-label="Search anything"
              />
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setMobileSearchOpen(false);
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#9CA3AF",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 4,
                }}
                aria-label="Close search"
                title="Close search"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* ====================================================
              PAGE CONTENT
          ==================================================== */}

          <main className="foodie6-content">
            <div className="admin-page-enter" key={page}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

