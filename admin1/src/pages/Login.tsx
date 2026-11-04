
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  Package,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * Load Remember Me preference.
   */
  useEffect(() => {
    const savedRememberMe = localStorage.getItem("foodie6_remember_me");

    if (savedRememberMe !== null) {
      setRememberMe(savedRememberMe === "true");
    }
  }, []);

  /*
   * Save Remember Me preference.
   */
  useEffect(() => {
    localStorage.setItem(
      "foodie6_remember_me",
      String(rememberMe)
    );
  }, [rememberMe]);

  /*
   * Login
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      /*
       * Supabase authentication.
       *
       * Session persistence is controlled by supabase.ts:
       * persistSession: true
       */
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      /*
       * Get authenticated user.
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        await supabase.auth.signOut();

        setError(
          userError?.message || "Unable to get authenticated user."
        );

        setLoading(false);
        return;
      }

      /*
       * Check admin profile.
       */
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role,status")
        .eq("id", user.id)
        .single();

      if (profileError) {
        await supabase.auth.signOut();

        setError(`Profile error: ${profileError.message}`);

        setLoading(false);
        return;
      }

      if (!profile) {
        await supabase.auth.signOut();

        setError("Profile not found.");

        setLoading(false);
        return;
      }

      /*
       * Check allowed roles.
       */
      const allowedRoles = ["admin", "manager", "staff"];

      if (
        !allowedRoles.includes(profile.role) ||
        profile.status !== "active"
      ) {
        await supabase.auth.signOut();

        setError(
          `Access denied. Role: ${profile.role}, Status: ${profile.status}`
        );

        setLoading(false);
        return;
      }

      /*
       * Remember Me
       *
       * Supabase's persistSession setting keeps the session
       * in browser storage.
       *
       * We additionally save the user's preference so the
       * checkbox remembers its state.
       */
      localStorage.setItem(
        "foodie6_remember_me",
        String(rememberMe)
      );

      setLoading(false);

      /*
       * Login successful.
       */
      onLogin();
    } catch (err) {
      console.error("Login error:", err);

      setLoading(false);

      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    }
  };

  /*
   * Forgot Password
   */
  const handleForgotPassword = async () => {
    setError("");
    setSuccess("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError(
        "Please enter your email address first, then click Forgot password."
      );
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setForgotLoading(true);

    try {
      /*
       * The user will be redirected to this page after
       * clicking the password reset email.
       *
       * We use /reset-password because that is the route
       * your application should use for the reset screen.
       */
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: redirectUrl,
          }
        );

      if (resetError) {
        setError(resetError.message);
        setForgotLoading(false);
        return;
      }

      setSuccess(
        "Password reset email sent. Please check your email inbox."
      );

      setForgotLoading(false);
    } catch (err) {
      console.error("Password reset error:", err);

      setForgotLoading(false);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to send password reset email."
      );
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F6FA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            background:
              "radial-gradient(circle, rgba(240,90,40,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />

        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -100,
            width: 500,
            height: 500,
            background:
              "radial-gradient(circle, rgba(240,90,40,0.05) 0%, transparent 70%)",
            borderRadius: "50%",
          }}
        />
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          position: "relative",
        }}
      >
        {/* Logo */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              background:
                "linear-gradient(135deg, #F05A28, #E03A10)",
              borderRadius: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow:
                "0 8px 24px rgba(240,90,40,0.3)",
            }}
          >
            <Package size={32} color="white" />
          </div>

          <h1
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              color: "#1A1D23",
              marginBottom: 4,
            }}
          >
            Foodie
            <span style={{ color: "#F05A28" }}>6</span> Admin
          </h1>

          <p
            style={{
              color: "#6B7280",
              fontSize: 14,
            }}
          >
            Cambodia's Premier Food Delivery Platform
          </p>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            padding: 32,
          }}
        >
          <h2
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: "#1A1D23",
              marginBottom: 6,
            }}
          >
            Welcome back
          </h2>

          <p
            style={{
              color: "#6B7280",
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            Sign in to your admin account
          </p>

          {/* Error */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                background: "#FEE2E2",
                border: "1px solid #FECACA",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
              }}
            >
              <AlertCircle
                size={16}
                color="#EF4444"
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />

              <span
                style={{
                  fontSize: 13,
                  color: "#B91C1C",
                  lineHeight: 1.4,
                }}
              >
                {error}
              </span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                background: "#DCFCE7",
                border: "1px solid #BBF7D0",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 16,
              }}
            >
              <CheckCircle
                size={16}
                color="#16A34A"
                style={{
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />

              <span
                style={{
                  fontSize: 13,
                  color: "#166534",
                  lineHeight: 1.4,
                }}
              >
                {success}
              </span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Email */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Email address
              </label>

              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                  setSuccess("");
                }}
                placeholder="admin@bitego.app"
                autoComplete="email"
                disabled={loading || forgotLoading}
              />
            </div>

            {/* Password */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 6,
                }}
              >
                Password
              </label>

              <div
                style={{
                  position: "relative",
                }}
              >
                <input
                  className="input"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading || forgotLoading}
                  style={{
                    paddingRight: 44,
                  }}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPass((value) => !value)
                  }
                  disabled={loading || forgotLoading}
                  aria-label={
                    showPass
                      ? "Hide password"
                      : "Show password"
                  }
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#9CA3AF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 4,
                  }}
                >
                  {showPass ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot Password */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor:
                    loading || forgotLoading
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) =>
                    setRememberMe(e.target.checked)
                  }
                  disabled={loading || forgotLoading}
                  style={{
                    accentColor: "#F05A28",
                    width: 16,
                    height: 16,
                    cursor:
                      loading || forgotLoading
                        ? "not-allowed"
                        : "pointer",
                  }}
                />

                <span
                  style={{
                    fontSize: 13,
                    color: "#6B7280",
                  }}
                >
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading || forgotLoading}
                style={{
                  fontSize: 13,
                  color: "#F05A28",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor:
                    loading || forgotLoading
                      ? "not-allowed"
                      : "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity:
                    loading || forgotLoading ? 0.6 : 1,
                }}
              >
                {forgotLoading && (
                  <Loader2
                    size={13}
                    style={{
                      animation:
                        "spin 1s linear infinite",
                    }}
                  />
                )}

                {forgotLoading
                  ? "Sending..."
                  : "Forgot password?"}
              </button>
            </div>

            {/* Login button */}
            <button
              className="btn-primary"
              type="submit"
              disabled={loading || forgotLoading}
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "12px 24px",
                fontSize: 15,
                marginTop: 4,
                opacity:
                  loading || forgotLoading ? 0.7 : 1,
                cursor:
                  loading || forgotLoading
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    size={17}
                    style={{
                      animation:
                        "spin 1s linear infinite",
                    }}
                  />

                  Signing in...
                </>
              ) : (
                "Sign in to Dashboard"
              )}
            </button>
          </form>
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#9CA3AF",
            marginTop: 20,
          }}
        >
          © 2026 BiteGo Cambodia. All rights reserved.
        </p>
      </div>

      {/* Loading animation */}
      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}
