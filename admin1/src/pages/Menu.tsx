import { useEffect, useState } from "react";
import { db } from "../lib/db";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Flame,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { menuItems as mockMenu } from "../data/mockData";
import ConfirmModal from "../components/ConfirmModal";

export default function Menu({
  showToast,
}: {
  showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void;
}) {
  const [items, setItems] = useState<any[]>([]);

  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterRestaurant, setFilterRestaurant] =
    useState("All");

  const [deleteTarget, setDeleteTarget] =
    useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);

  const [editItem, setEditItem] =
    useState<typeof mockMenu[0] | null>(null);

  // ============================================================
  // FORM
  // ============================================================

  const [form, setForm] = useState({
    name: "",
    restaurant: "",
    category: "",
    price: "",
    spicy: false,
    popular: false,
    image: "",
  });

  // ============================================================
  // LOAD MENU
  // ============================================================

  const loadMenu = async () => {
    const { data, error } = await db.menu.list();

    if (error) {
      showToast(error.message, "error");
      return;
    }

    setItems(
      (data || []).map((x: any) => ({
        id: String(x.id),

        name: x.name || "",

        restaurant:
          x.restaurants?.name || "",

        restaurantId: x.restaurant_id
          ? String(x.restaurant_id)
          : "",

        category:
          x.categories?.name || "",

        categoryId: x.category_id
          ? String(x.category_id)
          : "",

        price: Number(x.price || 0),

        available: !!x.available,

        popular: !!x.popular,

        spicy: !!x.spicy,

        // Cloudinary URL
        image: x.image_url || "",
      }))
    );
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // ============================================================
  // CATEGORIES
  // ============================================================

  const categories = [
    "All",
    ...Array.from(
      new Set(
        items
          .map((i) =>
            String(i.category || "").trim()
          )
          .filter(Boolean)
      )
    ),
  ];

  // ============================================================
  // RESTAURANTS
  // ============================================================

  const restaurants = [
    "All",
    ...Array.from(
      new Set(
        items
          .map((i) =>
            String(i.restaurant || "").trim()
          )
          .filter(Boolean)
      )
    ),
  ];

  // ============================================================
  // FILTER
  // ============================================================

  const filtered = items.filter((i) => {
    const searchText =
      search.trim().toLowerCase();

    const matchSearch =
      !searchText ||
      String(i.name || "")
        .toLowerCase()
        .includes(searchText) ||
      String(i.restaurant || "")
        .toLowerCase()
        .includes(searchText);

    const matchCat =
      filterCat === "All" ||
      String(i.category || "") === filterCat;

    const matchRestaurant =
      filterRestaurant === "All" ||
      String(i.restaurant || "") ===
        filterRestaurant;

    return (
      matchSearch &&
      matchCat &&
      matchRestaurant
    );
  });

  // ============================================================
  // OPEN ADD
  // ============================================================

  const openAdd = () => {
    setEditItem(null);

    setForm({
      name: "",
      restaurant: "",
      category: "",
      price: "",
      spicy: false,
      popular: false,
      image: "",
    });

    setShowForm(true);
  };

  // ============================================================
  // OPEN EDIT
  // ============================================================

  const openEdit = (item: any) => {
    setEditItem(item);

    setForm({
      name: item.name || "",
      restaurant: item.restaurant || "",
      category: item.category || "",
      price: String(item.price ?? ""),
      spicy: !!item.spicy,
      popular: !!item.popular,

      // Existing Cloudinary URL
      image: item.image || "",
    });

    setShowForm(true);
  };

  // ============================================================
  // REMOVE IMAGE URL
  // ============================================================

  const removeImage = () => {
    setForm((prev) => ({
      ...prev,
      image: "",
    }));
  };

  // ============================================================
  // SAVE MENU ITEM
  // ============================================================

  const handleSave = async () => {
    // Validate name
    if (!form.name.trim()) {
      showToast(
        "Please enter item name",
        "error"
      );
      return;
    }

    // Validate price
    if (
      !form.price ||
      Number(form.price) <= 0
    ) {
      showToast(
        "Please enter a valid price",
        "error"
      );
      return;
    }

    // ========================================================
    // FIND RESTAURANT
    // ========================================================

    const restaurant = items.find(
      (i) =>
        String(i.restaurant || "")
          .trim()
          .toLowerCase() ===
        String(form.restaurant || "")
          .trim()
          .toLowerCase()
    );

    // ========================================================
    // FIND CATEGORY
    // ========================================================

    const category = items.find(
      (i) =>
        String(i.category || "")
          .trim()
          .toLowerCase() ===
        String(form.category || "")
          .trim()
          .toLowerCase()
    );

    // ========================================================
    // PAYLOAD
    // ========================================================

    const payload: any = {
      name: form.name.trim(),

      price: Number(form.price),

      popular: form.popular,

      spicy: form.spicy,

      // Cloudinary image URL
      image_url:
        form.image.trim() || null,
    };

    // ========================================================
    // RESTAURANT
    // ========================================================

    if (restaurant?.restaurantId) {
      payload.restaurant_id = Number(
        restaurant.restaurantId
      );
    }

    // ========================================================
    // CATEGORY
    // ========================================================

    if (category?.categoryId) {
      payload.category_id = Number(
        category.categoryId
      );
    }

    // ========================================================
    // EDIT
    // ========================================================

    if (editItem) {
      const { error } =
        await db.menu.update(
          Number(editItem.id),
          payload
        );

      if (error) {
        showToast(
          error.message,
          "error"
        );
        return;
      }

      // Update screen immediately
      setItems((prev) =>
        prev.map((i) =>
          i.id === editItem.id
            ? {
                ...i,

                name: form.name.trim(),

                restaurant:
                  form.restaurant,

                category:
                  form.category,

                price: Number(
                  form.price
                ),

                spicy: form.spicy,

                popular: form.popular,

                image:
                  form.image.trim(),
              }
            : i
        )
      );

      showToast(
        "Menu item updated",
        "success"
      );
    }

    // ========================================================
    // ADD
    // ========================================================

    else {
      // Restaurant is required
      if (!payload.restaurant_id) {
        showToast(
          "Please use an existing restaurant name",
          "error"
        );
        return;
      }

      const { error } =
        await db.menu.insert({
          ...payload,
          available: true,
        });

      if (error) {
        showToast(
          error.message,
          "error"
        );
        return;
      }

      // ======================================================
      // IMPORTANT
      // Reload from Supabase
      // ======================================================

      await loadMenu();

      showToast(
        "Menu item added successfully",
        "success"
      );
    }

    // Close form
    setShowForm(false);

    // Reset form
    setForm({
      name: "",
      restaurant: "",
      category: "",
      price: "",
      spicy: false,
      popular: false,
      image: "",
    });
  };

  // ============================================================
  // TOGGLE AVAILABILITY
  // ============================================================

  const toggleAvail = async (
    id: string
  ) => {
    const item = items.find(
      (x) => x.id === id
    );

    if (!item) return;

    const { error } =
      await db.menu.update(
        Number(id),
        {
          available:
            !item.available,
        }
      );

    if (error) {
      showToast(
        error.message,
        "error"
      );
      return;
    }

    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              available:
                !i.available,
            }
          : i
      )
    );

    showToast(
      "Availability updated",
      "success"
    );
  };

  // ============================================================
  // DELETE MENU ITEM
  // ============================================================

  const handleDelete = async () => {
    if (!deleteTarget) return;

    const { error } =
      await db.menu.remove(
        Number(deleteTarget)
      );

    if (error) {
      showToast(
        error.message,
        "error"
      );
      return;
    }

    setItems((prev) =>
      prev.filter(
        (i) =>
          i.id !== deleteTarget
      )
    );

    showToast(
      "Menu item deleted",
      "success"
    );

    setDeleteTarget(null);
  };

  // ============================================================
  // CLOSE FORM
  // ============================================================

  const closeForm = () => {
    setShowForm(false);

    setForm({
      name: "",
      restaurant: "",
      category: "",
      price: "",
      spicy: false,
      popular: false,
      image: "",
    });
  };

  // ============================================================
  // FALLBACK IMAGE
  // ============================================================

  const fallbackImage =
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80";

  // ============================================================
  // UI
  // ============================================================

  return (
    <div>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="page-header">
        <div>
          <h1
            style={{
              fontFamily:
                "'Outfit', sans-serif",
              fontSize: 24,
              fontWeight: 700,
              color: "#1A1D23",
            }}
          >
            Menu
          </h1>

          <p
            style={{
              color: "#6B7280",
              fontSize: 14,
              marginTop: 2,
            }}
          >
            {items.length} food items
            across all restaurants
          </p>
        </div>

        <button
          className="btn-primary"
          onClick={openAdd}
        >
          <Plus size={15} />
          Add Item
        </button>
      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
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
            placeholder="Search menu items..."
          />
        </div>

        <select
          className="select"
          style={{ width: 160 }}
          value={filterCat}
          onChange={(e) =>
            setFilterCat(e.target.value)
          }
        >
          {categories.map((c) => (
            <option
              key={c}
              value={c}
            >
              {c}
            </option>
          ))}
        </select>

        <select
          className="select"
          style={{ width: 160 }}
          value={filterRestaurant}
          onChange={(e) =>
            setFilterRestaurant(
              e.target.value
            )
          }
        >
          {restaurants.map(
            (restaurant) => (
              <option
                key={restaurant}
                value={restaurant}
              >
                {restaurant === "All"
                  ? "All Restaurants"
                  : restaurant}
              </option>
            )
          )}
        </select>
      </div>

      {/* ======================================================
          TABLE
      ====================================================== */}

      <div
        className="card"
        style={{
          overflow: "hidden",
        }}
      >
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Restaurant</th>
                <th>Category</th>
                <th>Price</th>
                <th>Tags</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign:
                        "center",
                      padding: 40,
                      color: "#9CA3AF",
                    }}
                  >
                    No menu items found
                  </td>
                </tr>
              ) : (
                filtered.map(
                  (item) => (
                    <tr
                      key={item.id}
                    >
                      {/* ITEM */}

                      <td>
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: 10,
                          }}
                        >
                          <img
                            src={
                              item.image ||
                              fallbackImage
                            }
                            alt={
                              item.name
                            }
                            onError={(
                              e
                            ) => {
                              e.currentTarget.src =
                                fallbackImage;
                            }}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              objectFit:
                                "cover",
                              background:
                                "#F3F4F6",
                            }}
                          />

                          <span
                            style={{
                              fontWeight:
                                600,
                              color:
                                "#1A1D23",
                            }}
                          >
                            {
                              item.name
                            }
                          </span>
                        </div>
                      </td>

                      {/* RESTAURANT */}

                      <td
                        style={{
                          color:
                            "#6B7280",
                        }}
                      >
                        {item.restaurant ||
                          "-"}
                      </td>

                      {/* CATEGORY */}

                      <td>
                        <span className="badge badge-muted">
                          {item.category ||
                            "Uncategorized"}
                        </span>
                      </td>

                      {/* PRICE */}

                      <td
                        style={{
                          fontWeight:
                            700,
                          color:
                            "#F05A28",
                        }}
                      >
                        $
                        {Number(
                          item.price ||
                            0
                        ).toFixed(
                          2
                        )}
                      </td>

                      {/* TAGS */}

                      <td>
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 4,
                            flexWrap:
                              "wrap",
                          }}
                        >
                          {item.popular && (
                            <span className="badge badge-primary">
                              <TrendingUp
                                size={
                                  10
                                }
                              />
                              Popular
                            </span>
                          )}

                          {item.spicy && (
                            <span className="badge badge-danger">
                              <Flame
                                size={
                                  10
                                }
                              />
                              Spicy
                            </span>
                          )}
                        </div>
                      </td>

                      {/* AVAILABILITY */}

                      <td>
                        <button
                          onClick={() =>
                            toggleAvail(
                              item.id
                            )
                          }
                          style={{
                            background:
                              "none",
                            border:
                              "none",
                            cursor:
                              "pointer",
                          }}
                          title={
                            item.available
                              ? "Available"
                              : "Unavailable"
                          }
                        >
                          {item.available ? (
                            <ToggleRight
                              size={
                                24
                              }
                              color="#22C55E"
                            />
                          ) : (
                            <ToggleLeft
                              size={
                                24
                              }
                              color="#9CA3AF"
                            />
                          )}
                        </button>
                      </td>

                      {/* ACTIONS */}

                      <td>
                        <div
                          style={{
                            display:
                              "flex",
                            gap: 6,
                          }}
                        >
                          <button
                            onClick={() =>
                              openEdit(
                                item
                              )
                            }
                            style={{
                              padding:
                                "5px 10px",
                              borderRadius:
                                6,
                              border:
                                "1px solid #E8EAF0",
                              background:
                                "white",
                              cursor:
                                "pointer",
                              fontSize:
                                12,
                              color:
                                "#374151",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 4,
                            }}
                          >
                            <Edit2
                              size={
                                12
                              }
                            />
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              setDeleteTarget(
                                item.id
                              )
                            }
                            style={{
                              padding:
                                "5px",
                              borderRadius:
                                6,
                              border:
                                "1px solid #FECACA",
                              background:
                                "#FEF2F2",
                              cursor:
                                "pointer",
                              color:
                                "#EF4444",
                            }}
                          >
                            <Trash2
                              size={
                                13
                              }
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showForm && (
        <div
          className="modal-overlay"
          onClick={closeForm}
        >
          <div
            className="modal"
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              maxHeight: "90vh",
              overflowY:
                "auto",
            }}
          >
            {/* TITLE */}

            <div
              style={{
                display:
                  "flex",
                justifyContent:
                  "space-between",
                alignItems:
                  "center",
                marginBottom:
                  20,
              }}
            >
              <h3
                style={{
                  fontFamily:
                    "'Outfit', sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color:
                    "#1A1D23",
                  margin: 0,
                }}
              >
                {editItem
                  ? "Edit Menu Item"
                  : "Add Menu Item"}
              </h3>

              <button
                onClick={
                  closeForm
                }
                style={{
                  border:
                    "none",
                  background:
                    "transparent",
                  cursor:
                    "pointer",
                  color:
                    "#6B7280",
                }}
              >
                <X
                  size={20}
                />
              </button>
            </div>

            <div
              style={{
                display:
                  "flex",
                flexDirection:
                  "column",
                gap: 14,
              }}
            >
              {/* =================================================
                  CLOUDINARY IMAGE URL
              ================================================== */}

              <div>
                <label
                  style={{
                    display:
                      "block",
                    fontSize: 13,
                    fontWeight:
                      600,
                    color:
                      "#374151",
                    marginBottom:
                      6,
                  }}
                >
                  Food Image URL
                </label>

                <input
                  className="input"
                  type="url"
                  value={
                    form.image
                  }
                  onChange={(
                    e
                  ) =>
                    setForm({
                      ...form,
                      image:
                        e.target
                          .value,
                    })
                  }
                  placeholder="https://res.cloudinary.com/..."
                />

                <p
                  style={{
                    fontSize: 11,
                    color:
                      "#9CA3AF",
                    marginTop:
                      5,
                    lineHeight:
                      1.5,
                  }}
                >
                  Upload the image
                  to Cloudinary,
                  then paste the
                  image URL here.
                </p>

                {/* IMAGE PREVIEW */}

                {form.image && (
                  <div
                    style={{
                      marginTop:
                        10,
                      position:
                        "relative",
                      width:
                        "100%",
                      height:
                        180,
                      borderRadius:
                        8,
                      overflow:
                        "hidden",
                      background:
                        "#F3F4F6",
                      border:
                        "1px solid #E5E7EB",
                    }}
                  >
                    <img
                      src={
                        form.image
                      }
                      alt="Food preview"
                      onError={(
                        e
                      ) => {
                        e.currentTarget.style.display =
                          "none";
                      }}
                      style={{
                        width:
                          "100%",
                        height:
                          "100%",
                        objectFit:
                          "cover",
                      }}
                    />

                    {/* REMOVE IMAGE */}

                    <button
                      type="button"
                      onClick={
                        removeImage
                      }
                      style={{
                        position:
                          "absolute",
                        top: 8,
                        right: 8,
                        width:
                          32,
                        height:
                          32,
                        borderRadius:
                          "50%",
                        border:
                          "none",
                        background:
                          "rgba(0,0,0,0.65)",
                        color:
                          "white",
                        cursor:
                          "pointer",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                      }}
                      title="Remove image"
                    >
                      <X
                        size={16}
                      />
                    </button>
                  </div>
                )}

                {/* NO IMAGE */}

                {!form.image && (
                  <div
                    style={{
                      marginTop:
                        10,
                      height:
                        120,
                      border:
                        "2px dashed #D1D5DB",
                      borderRadius:
                        8,
                      background:
                        "#F9FAFB",
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      color:
                        "#9CA3AF",
                    }}
                  >
                    <ImageIcon
                      size={28}
                    />

                    <span
                      style={{
                        fontSize:
                          12,
                        marginTop:
                          6,
                      }}
                    >
                      Paste a Cloudinary
                      image URL above
                    </span>
                  </div>
                )}
              </div>

              {/* =================================================
                  NAME
              ================================================== */}

              <div>
                <label
                  style={{
                    display:
                      "block",
                    fontSize: 13,
                    fontWeight:
                      600,
                    color:
                      "#374151",
                    marginBottom:
                      6,
                  }}
                >
                  Item Name *
                </label>

                <input
                  className="input"
                  value={
                    form.name
                  }
                  onChange={(
                    e
                  ) =>
                    setForm({
                      ...form,
                      name: e.target
                        .value,
                    })
                  }
                  placeholder="e.g. Beef Loc Lac"
                />
              </div>

              {/* =================================================
                  RESTAURANT + CATEGORY
              ================================================== */}

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      display:
                        "block",
                      fontSize:
                        13,
                      fontWeight:
                        600,
                      color:
                        "#374151",
                      marginBottom:
                        6,
                    }}
                  >
                    Restaurant *
                  </label>

                  <input
                    className="input"
                    value={
                      form.restaurant
                    }
                    onChange={(
                      e
                    ) =>
                      setForm({
                        ...form,
                        restaurant:
                          e.target
                            .value,
                      })
                    }
                    placeholder="Restaurant name"
                    list="restaurant-list"
                  />

                  <datalist id="restaurant-list">
                    {restaurants
                      .filter(
                        (r) =>
                          r !==
                          "All"
                      )
                      .map(
                        (r) => (
                          <option
                            key={
                              r
                            }
                            value={
                              r
                            }
                          />
                        )
                      )}
                  </datalist>
                </div>

                <div>
                  <label
                    style={{
                      display:
                        "block",
                      fontSize:
                        13,
                      fontWeight:
                        600,
                      color:
                        "#374151",
                      marginBottom:
                        6,
                    }}
                  >
                    Category
                  </label>

                  <input
                    className="input"
                    value={
                      form.category
                    }
                    onChange={(
                      e
                    ) =>
                      setForm({
                        ...form,
                        category:
                          e.target
                            .value,
                      })
                    }
                    placeholder="e.g. Main Dishes"
                    list="category-list"
                  />

                  <datalist id="category-list">
                    {categories
                      .filter(
                        (c) =>
                          c !==
                          "All"
                      )
                      .map(
                        (c) => (
                          <option
                            key={
                              c
                            }
                            value={
                              c
                            }
                          />
                        )
                      )}
                  </datalist>
                </div>
              </div>

              {/* =================================================
                  PRICE
              ================================================== */}

              <div>
                <label
                  style={{
                    display:
                      "block",
                    fontSize: 13,
                    fontWeight:
                      600,
                    color:
                      "#374151",
                    marginBottom:
                      6,
                  }}
                >
                  Price ($) *
                </label>

                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.price
                  }
                  onChange={(
                    e
                  ) =>
                    setForm({
                      ...form,
                      price:
                        e.target
                          .value,
                    })
                  }
                  placeholder="0.00"
                />
              </div>

              {/* =================================================
                  TAGS
              ================================================== */}

              <div
                style={{
                  display:
                    "flex",
                  gap: 20,
                  flexWrap:
                    "wrap",
                }}
              >
                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    cursor:
                      "pointer",
                    fontSize:
                      14,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      form.popular
                    }
                    onChange={(
                      e
                    ) =>
                      setForm({
                        ...form,
                        popular:
                          e.target
                            .checked,
                      })
                    }
                    style={{
                      accentColor:
                        "#F05A28",
                    }}
                  />

                  <TrendingUp
                    size={14}
                    color="#F05A28"
                  />

                  Popular item
                </label>

                <label
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    cursor:
                      "pointer",
                    fontSize:
                      14,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      form.spicy
                    }
                    onChange={(
                      e
                    ) =>
                      setForm({
                        ...form,
                        spicy:
                          e.target
                            .checked,
                      })
                    }
                    style={{
                      accentColor:
                        "#EF4444",
                    }}
                  />

                  <Flame
                    size={14}
                    color="#EF4444"
                  />

                  Spicy
                </label>
              </div>
            </div>

            {/* =================================================
                BUTTONS
            ================================================== */}

            <div
              style={{
                display:
                  "flex",
                gap: 10,
                justifyContent:
                  "flex-end",
                marginTop: 24,
              }}
            >
              <button
                className="btn-secondary"
                onClick={
                  closeForm
                }
              >
                Cancel
              </button>

              <button
                className="btn-primary"
                onClick={
                  handleSave
                }
              >
                {editItem
                  ? "Save Changes"
                  : "Add Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          DELETE CONFIRM
      ====================================================== */}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Menu Item"
          message="Are you sure you want to delete this menu item?"
          confirmLabel="Delete"
          danger
          onConfirm={
            handleDelete
          }
          onCancel={() =>
            setDeleteTarget(null)
          }
        />
      )}
    </div>
  );
}

