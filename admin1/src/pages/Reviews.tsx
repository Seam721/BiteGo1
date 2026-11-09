import { useEffect, useState } from "react";
import { db } from "../lib/db";
import { Search, Star, Flag, Eye, EyeOff, Trash2 } from "lucide-react";
import { reviews as mockReviews } from "../data/mockData";
import ConfirmModal from "../components/ConfirmModal";

export default function Reviews({ showToast }: { showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void }) {
  const [reviews, setReviews] = useState<any[]>([]);
  useEffect(()=>{db.reviews.list().then(({data,error})=>{if(error)showToast(error.message,"error");else setReviews((data||[]).map((x:any)=>({id:x.id,customer:x.customers?.name||"",restaurant:x.restaurants?.name||"",rating:x.rating,comment:x.comment||"",date:new Date(x.created_at).toLocaleString(),status:x.status==="hidden"?"Hidden":"Visible",reported:!!x.reported})));});},[]);
  const [search, setSearch] = useState("");
  const [filterRating, setFilterRating] = useState("All");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filtered = reviews.filter((r) => {
    const matchSearch = r.customer.toLowerCase().includes(search.toLowerCase()) ||
      r.restaurant.toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase());
    const matchRating = filterRating === "All" || String(r.rating) === filterRating;
    return matchSearch && matchRating;
  });

  const toggleVisibility = (id: string) => {
    const r=reviews.find(x=>x.id===id); if(!r)return; const next=r.status==="Visible"?"hidden":"visible"; db.reviews.update(id,{status:next}).then(({error})=>{if(error){showToast(error.message,"error");return;}setReviews(p=>p.map(x=>x.id===id?{...x,status:next==="visible"?"Visible":"Hidden"}:x));showToast("Review visibility updated","success");});
  };

  const renderStars = (rating: number) => (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={13} color={s <= rating ? "#F59E0B" : "#D1D5DB"} fill={s <= rating ? "#F59E0B" : "none"} />
      ))}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#1A1D23" }}>Reviews</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 2 }}>Manage customer reviews and ratings</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Reviews", value: reviews.length, color: "#F05A28" },
          { label: "Reported", value: reviews.filter((r) => r.reported).length, color: "#EF4444" },
          { label: "Hidden", value: reviews.filter((r) => r.status === "Hidden").length, color: "#F59E0B" },
          { label: "Avg Rating", value: (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1), color: "#22C55E" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#6B7280" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div className="search-bar">
          <Search size={15} color="#9CA3AF" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews..." />
        </div>
        <select className="select" style={{ width: 140 }} value={filterRating} onChange={(e) => setFilterRating(e.target.value)}>
          <option value="All">All Ratings</option>
          {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Stars</option>)}
        </select>
        <select className="select" style={{ width: 140 }}>
          <option>All Status</option>
          <option>Visible</option>
          <option>Hidden</option>
          <option>Reported</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((r) => (
          <div key={r.id} className="card" style={{ padding: 16, opacity: r.status === "Hidden" ? 0.7 : 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FFF0EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "#F05A28" }}>
                    {r.customer.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#1A1D23", fontSize: 14 }}>{r.customer}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>for {r.restaurant}</div>
                  </div>
                  {renderStars(r.rating)}
                  {r.reported && (
                    <span className="badge badge-danger" style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <Flag size={10} /> Reported
                    </span>
                  )}
                  {r.status === "Hidden" && <span className="badge badge-warning">Hidden</span>}
                </div>
                <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6 }}>{r.comment}</p>
                <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 6 }}>{r.date}</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => toggleVisibility(r.id)}
                  style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid #E8EAF0", background: "white", cursor: "pointer", fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 4 }}
                >
                  {r.status === "Visible" ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Restore</>}
                </button>
                <button
                  onClick={() => setDeleteTarget(r.id)}
                  style={{ padding: "6px", borderRadius: 7, border: "1px solid #FECACA", background: "#FEF2F2", cursor: "pointer", color: "#EF4444" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Review"
          message="This will permanently delete the review. This action cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={async () => { if(!deleteTarget)return; const {error}=await db.reviews.remove(deleteTarget); if(error){showToast(error.message,"error");return;} setReviews(p=>p.filter(r=>r.id!==deleteTarget)); showToast("Review deleted","success"); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
