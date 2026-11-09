import { useEffect, useState } from "react";
import { db } from "../lib/db";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Star,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { restaurants as mockRestaurants } from "../data/mockData";
import ConfirmModal from "../components/ConfirmModal";

export default function Restaurants({
  showToast,
}: {
  showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cuisineFilter, setCuisineFilter] = useState("all");

  const [restaurants, setRestaurants] = useState<any[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [editItem, setEditItem] = useState<any | null>(null);

  // Restaurant form
  const [form, setForm] = useState({
    name: "",
    cuisine: "",
    deliveryFee: "",
    deliveryTime: "",
    imageUrl: "",
  });

  // ---------------------------------------------------------
  // LOAD RESTAURANTS
  // ---------------------------------------------------------
  useEffect(() => {
    loadRestaurants();
  }, []);

  const loadRestaurants = async () => {
    const { data, error } = await db.restaurants.list();

    if (error) {
      showToast(error.message, "error");
      return;
    }

    setRestaurants(
      (data || []).map((x: any) => ({
        id: String(x.id),
        name: x.name || "",
        cuisine: x.cuisine || "",
        rating: Number(x.rating || 0),
        orders: 0,
        revenue: 0,
        deliveryFee: Number(x.delivery_fee || 0),
        deliveryTime: `${x.delivery_time_min || 0}-${x.delivery_time_max || 0}`,
        status: x.status === "active" ? "Active" : "Suspended",

        // Cloudinary URL
        image: x.image_url || "",
      }))
    );
  };

  // ---------------------------------------------------------
  // FILTER
  // ---------------------------------------------------------
  const filtered = restaurants.filter((r) => {
    const searchText = search.trim().toLowerCase();

    const matchesSearch =
      !searchText ||
      String(r.name || "")
        .toLowerCase()
        .includes(searchText) ||
      String(r.cuisine || "")
        .toLowerCase()
        .includes(searchText);

    const matchesStatus =
      statusFilter === "all" ||
      String(r.status || "").toLowerCase() ===
        statusFilter.toLowerCase();

    const matchesCuisine =
      cuisineFilter === "all" ||
      String(r.cuisine || "").toLowerCase() ===
        cuisineFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesCuisine;
  });

  // ---------------------------------------------------------
  // TOGGLE STATUS
  // ---------------------------------------------------------
  const toggleStatus = async (id: string) => {
    const r = restaurants.find((x) => x.id === id);

    if (!r) return;

    const next =
      r.status === "Active"
        ? "suspended"
        : "active";

    const { error } = await db.restaurants.update(
      Number(id),
      {
        status: next,
      }
    );

    if (error) {
      showToast(error.message, "error");
      return;
    }

    setRestaurants((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              status:
                next === "active"
                  ? "Active"
                  : "Suspended",
            }
          : x
      )
    );

    showToast("Restaurant status updated", "success");
  };

  // ---------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------
  const handleDelete = async (id: string) => {
    const { error } = await db.restaurants.remove(
      Number(id)
    );

    if (error) {
      showToast(error.message, "error");
      return;
    }

    setRestaurants((prev) =>
      prev.filter((r) => r.id !== id)
    );

    showToast("Restaurant deleted", "success");
    setDeleteTarget(null);
  };

  // ---------------------------------------------------------
  // OPEN ADD FORM
  // ---------------------------------------------------------
  const openAdd = () => {
    setEditItem(null);

    setForm({
      name: "",
      cuisine: "",
      deliveryFee: "",
      deliveryTime: "",
      imageUrl: "",
    });

    setShowForm(true);
  };

  // ---------------------------------------------------------
  // OPEN EDIT FORM
  // ---------------------------------------------------------
  const openEdit = (r: any) => {
    setEditItem(r);

    setForm({
      name: r.name || "",
      cuisine: r.cuisine || "",
      deliveryFee: String(r.deliveryFee || ""),
      deliveryTime: r.deliveryTime || "",
      imageUrl: r.image || "",
    });

    setShowForm(true);
  };

  // ---------------------------------------------------------
  // SAVE RESTAURANT
  // ---------------------------------------------------------
  const handleSave = async () => {
    if (!form.name.trim() || !form.cuisine.trim()) {
      showToast(
        "Please fill required fields",
        "error"
      );
      return;
    }

    // Delivery time
    const [a, b] = (
      form.deliveryTime || "20-30"
    )
      .split("-")
      .map(Number);

    const deliveryMin = a || 20;
    const deliveryMax = b || 30;

    // -------------------------------------------------------
    // SUPABASE PAYLOAD
    // -------------------------------------------------------
    const payload: any = {
      name: form.name.trim(),
      cuisine: form.cuisine.trim(),

      delivery_fee: Number(
        form.deliveryFee || 0
      ),

      delivery_time_min: deliveryMin,
      delivery_time_max: deliveryMax,

      status: "active",

      // IMPORTANT:
      // Save Cloudinary URL into Supabase
      image_url: form.imageUrl.trim(),
    };

    // -------------------------------------------------------
    // EDIT
    // -------------------------------------------------------
    if (editItem) {
      const { data, error } =
        await db.restaurants.update(
          Number(editItem.id),
          payload
        );

      if (error) {
        showToast(error.message, "error");
        return;
      }

      setRestaurants((prev) =>
        prev.map((r) =>
          r.id === editItem.id
            ? {
                ...r,

                name: form.name,
                cuisine: form.cuisine,

                deliveryFee: Number(
                  form.deliveryFee || 0
                ),

                deliveryTime: `${deliveryMin}-${deliveryMax}`,

                image:
                  form.imageUrl.trim(),

                status: r.status,
              }
            : r
        )
      );

      showToast(
        "Restaurant updated",
        "success"
      );
    }

    // -------------------------------------------------------
    // ADD
    // -------------------------------------------------------
    else {
  const { data, error } =
    await db.restaurants.insert(payload);

  if (error) {
    showToast(error.message, "error");
    return;
  }

  // Supabase may return an array or a single object
  const x: any = Array.isArray(data)
    ? data[0]
    : data;

  if (!x) {
    showToast(
      "Restaurant was saved, but no data was returned.",
      "error"
    );

    // Reload from database
    await loadRestaurants();
    setShowForm(false);
    return;
  }

  const newRestaurant = {
    id: String(x.id),
    name: x.name || form.name,
    cuisine: x.cuisine || form.cuisine,
    rating: Number(x.rating || 0),
    orders: 0,
    revenue: 0,

    deliveryFee: Number(
      x.delivery_fee ?? form.deliveryFee ?? 0
    ),

    deliveryTime: `${
      x.delivery_time_min ?? deliveryMin
    }-${
      x.delivery_time_max ?? deliveryMax
    }`,

    status:
      x.status === "active"
        ? "Active"
        : "Suspended",

    image:
      x.image_url ||
      form.imageUrl.trim() ||
      "",
  };

  setRestaurants((prev) => [
    newRestaurant,
    ...prev,
  ]);

  showToast(
    "Restaurant added successfully",
    "success"
  );
}

    setShowForm(false);
  };

  // ---------------------------------------------------------
  // IMAGE FALLBACK
  // ---------------------------------------------------------
  const handleImageError = (
    e: React.SyntheticEvent<HTMLImageElement>
  ) => {
    e.currentTarget.style.display = "none";
  };

  // ---------------------------------------------------------
  // UI
  // ---------------------------------------------------------
  return (
    <div>
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}
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
            Restaurants
          </h1>

          <p
            style={{
              color: "#6B7280",
              fontSize: 14,
              marginTop: 2,
            }}
          >
            {filtered.length} restaurants
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={openAdd}
        >
          <Plus size={15} />
          Add Restaurant
        </button>
      </div>

      {/* =====================================================
          SEARCH + FILTER
      ===================================================== */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <div className="search-bar">
          <Search
            size={15}
            color="#9CA3AF"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search restaurants..."
          />
        </div>

        <select
          className="select"
          style={{ width: 140 }}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="all">
            All Status
          </option>

          <option value="active">
            Active
          </option>

          <option value="suspended">
            Suspended
          </option>
        </select>

        <select
          className="select"
          style={{ width: 160 }}
          value={cuisineFilter}
          onChange={(e) =>
            setCuisineFilter(e.target.value)
          }
        >
          <option value="all">
            All Cuisines
          </option>

          <option value="Khmer">
            Khmer
          </option>

          <option value="BBQ & Grills">
            BBQ & Grills
          </option>

          <option value="Noodles & Soup">
            Noodles & Soup
          </option>
        </select>
      </div>

      {/* =====================================================
          RESTAURANT CARDS
      ===================================================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {filtered.map((r) => (
          <div
            key={r.id}
            className="card"
            style={{
              overflow: "hidden",
            }}
          >
            {/* IMAGE */}
            <div
              style={{
                height: 120,
                background: "#F3F4F6",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {r.image ? (
                <img
                  src={r.image}
                  alt={r.name}
                  onError={handleImageError}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#9CA3AF",
                    fontSize: 13,
                  }}
                >
                  No Image
                </div>
              )}

              {/* IMAGE OVERLAY */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to bottom, transparent, rgba(0,0,0,0.4))",
                }}
              />

              {/* STATUS */}
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                }}
              >
                <span
                  className={`badge ${
                    r.status === "Active"
                      ? "badge-success"
                      : "badge-danger"
                  }`}
                >
                  {r.status}
                </span>
              </div>
            </div>

            {/* CARD CONTENT */}
            <div style={{ padding: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <div>
                  <h3
                    style={{
                      fontFamily:
                        "'Outfit', sans-serif",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#1A1D23",
                    }}
                  >
                    {r.name}
                  </h3>

                  <span
                    style={{
                      fontSize: 13,
                      color: "#6B7280",
                    }}
                  >
                    {r.cuisine}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Star
                    size={14}
                    color="#F59E0B"
                    fill="#F59E0B"
                  />

                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1A1D23",
                    }}
                  >
                    {r.rating}
                  </span>
                </div>
              </div>

              {/* STATISTICS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr 1fr",
                  gap: 8,
                  marginBottom: 14,
                  background: "#F9FAFB",
                  borderRadius: 8,
                  padding: "10px",
                }}
              >
                <div
                  style={{
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#F05A28",
                    }}
                  >
                    {Number(
                      r.orders || 0
                    ).toLocaleString()}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#9CA3AF",
                    }}
                  >
                    Orders
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "center",
                    borderLeft:
                      "1px solid #E8EAF0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1A1D23",
                    }}
                  >
                    $
                    {Number(
                      r.deliveryFee || 0
                    ).toFixed(2)}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#9CA3AF",
                    }}
                  >
                    Del. Fee
                  </div>
                </div>

                <div
                  style={{
                    textAlign: "center",
                    borderLeft:
                      "1px solid #E8EAF0",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1A1D23",
                    }}
                  >
                    {r.deliveryTime}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "#9CA3AF",
                    }}
                  >
                    min
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <button
                  className="btn-secondary"
                  style={{
                    flex: 1,
                    justifyContent:
                      "center",
                  }}
                  onClick={() =>
                    openEdit(r)
                  }
                >
                  <Edit2 size={13} />
                  Edit
                </button>

                <button
                  onClick={() =>
                    toggleStatus(r.id)
                  }
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border:
                      "1px solid #E8EAF0",
                    background: "white",
                    cursor: "pointer",
                    color: "#6B7280",
                  }}
                >
                  {r.status === "Active" ? (
                    <ToggleRight
                      size={18}
                      color="#22C55E"
                    />
                  ) : (
                    <ToggleLeft
                      size={18}
                      color="#9CA3AF"
                    />
                  )}
                </button>

                <button
                  onClick={() =>
                    setDeleteTarget(r.id)
                  }
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border:
                      "1px solid #FECACA",
                    background: "#FEF2F2",
                    cursor: "pointer",
                    color: "#EF4444",
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* =====================================================
          ADD / EDIT RESTAURANT MODAL
      ===================================================== */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={() =>
            setShowForm(false)
          }
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h3
              style={{
                fontFamily:
                  "'Outfit', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: "#1A1D23",
                marginBottom: 20,
              }}
            >
              {editItem
                ? "Edit Restaurant"
                : "Add Restaurant"}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 14,
              }}
            >
              {/* RESTAURANT NAME */}
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
                  Restaurant Name *
                </label>

                <input
                  className="input"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Angkor Kitchen"
                />
              </div>

              {/* CUISINE */}
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
                  Cuisine Type *
                </label>

                <input
                  className="input"
                  value={form.cuisine}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      cuisine:
                        e.target.value,
                    })
                  }
                  placeholder="e.g. Khmer Food"
                />
              </div>

              {/* IMAGE URL */}
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
                  Restaurant Image URL
                </label>

                <input
                  className="input"
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      imageUrl:
                        e.target.value,
                    })
                  }
                  placeholder="https://res.cloudinary.com/..."
                />

                <p
                  style={{
                    fontSize: 11,
                    color: "#9CA3AF",
                    marginTop: 5,
                    lineHeight: 1.5,
                  }}
                >
                  Upload your image to
                  Cloudinary, then paste the
                  image URL here.
                </p>

                {/* IMAGE PREVIEW */}
                {form.imageUrl && (
                  <div
                    style={{
                      marginTop: 10,
                      height: 100,
                      borderRadius: 8,
                      overflow: "hidden",
                      background:
                        "#F3F4F6",
                      border:
                        "1px solid #E8EAF0",
                    }}
                  >
                    <img
                      src={form.imageUrl}
                      alt="Preview"
                      onError={(e) => {
                        e.currentTarget.style.display =
                          "none";
                      }}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* DELIVERY */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 12,
                }}
              >
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
                    Delivery Fee ($)
                  </label>

                  <input
                    className="input"
                    type="number"
                    value={
                      form.deliveryFee
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        deliveryFee:
                          e.target.value,
                      })
                    }
                    placeholder="1.50"
                  />
                </div>

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
                    Delivery Time
                  </label>

                  <input
                    className="input"
                    value={
                      form.deliveryTime
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        deliveryTime:
                          e.target.value,
                      })
                    }
                    placeholder="20-30"
                  />
                </div>
              </div>
            </div>

            {/* BUTTONS */}
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent:
                  "flex-end",
                marginTop: 24,
              }}
            >
              <button
                className="btn-secondary"
                onClick={() =>
                  setShowForm(false)
                }
              >
                Cancel
              </button>

              <button
                className="btn-primary"
                onClick={handleSave}
              >
                {editItem
                  ? "Save Changes"
                  : "Add Restaurant"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          DELETE MODAL
      ===================================================== */}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Restaurant"
          message="Are you sure you want to delete this restaurant? All associated data will be permanently removed."
          confirmLabel="Delete"
          danger
          onConfirm={() =>
            handleDelete(deleteTarget)
          }
          onCancel={() =>
            setDeleteTarget(null)
          }
        />
      )}
    </div>
  );
}

