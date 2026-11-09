import { useEffect, useState } from "react";
import { db } from "../lib/db";
import { Plus, Edit2, Trash2, Tag, Calendar } from "lucide-react";
import ConfirmModal from "../components/ConfirmModal";

const statusColor: Record<string, string> = {
  Active: "badge-success",
  Expired: "badge-muted",
  Scheduled: "badge-info",
  Paused: "badge-warning",
};

export default function Promotions({ showToast }: { showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void }) {
  const [promos, setPromos] = useState<any[]>([]);
  useEffect(()=>{db.promotions.list().then(({data,error})=>{if(error)showToast(error.message,"error");else setPromos((data||[]).map((x:any)=>({id:x.id,code:x.code,type:x.type==="percentage"?"Percentage":x.type==="free_delivery"?"Free Delivery":"Fixed",discount:Number(x.discount||0),minOrder:Number(x.minimum_order||0),maxUses:x.max_uses||0,usedCount:x.used_count||0,startDate:String(x.start_date).slice(0,10),endDate:String(x.end_date).slice(0,10),status:String(x.status||"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())})));});},[]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [form, setForm] = useState({
    code: "",
    type: "Percentage",
    discount: "",
    minOrder: "",
    maxUses: "",
    startDate: "",
    endDate: "",
  });

const [imageFile, setImageFile] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState("");
const [uploadingImage, setUploadingImage] = useState(false);

  const openEdit = (p: any) => {
    setEditItem(p);
    setForm({ code: p.code, type: p.type, discount: String(p.discount), minOrder: String(p.minOrder), maxUses: String(p.maxUses), startDate: p.startDate, endDate: p.endDate });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code) { showToast("Promo code is required", "error"); return; }
    const type=form.type==="Percentage"?"percentage":form.type==="Free Delivery"?"free_delivery":"fixed";
    const payload:any={code:form.code,type,discount:Number(form.discount||0),minimum_order:Number(form.minOrder||0),max_uses:Number(form.maxUses||0),start_date:form.startDate,end_date:form.endDate,status:"scheduled"};
    if(editItem){const {error}=await db.promotions.update(editItem.id,payload);if(error){showToast(error.message,"error");return;}setPromos(p=>p.map(x=>x.id===editItem.id?{...x,...form,discount:Number(form.discount),minOrder:Number(form.minOrder),maxUses:Number(form.maxUses)}:x));showToast("Promotion updated","success");}
    else {const {data,error}=await db.promotions.insert({...payload,used_count:0});if(error){showToast(error.message,"error");return;}const x:any=data;setPromos(p=>[{id:x.id,code:x.code,type:form.type,discount:Number(x.discount),minOrder:Number(x.minimum_order),maxUses:x.max_uses||0,usedCount:0,startDate:String(x.start_date).slice(0,10),endDate:String(x.end_date).slice(0,10),status:"Scheduled"},...p]);showToast("Promotion created","success");}
    setShowForm(false);
  };

  const usagePercent = (used: number, max: number) => Math.min(100, Math.round((used / max) * 100));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#1A1D23" }}>Promotions</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 2 }}>Promo codes and discount management</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditItem(null); setForm({ code: "", type: "Percentage", discount: "", minOrder: "", maxUses: "", startDate: "", endDate: "" }); setShowForm(true); }}>
          <Plus size={15} /> Create Promo
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {promos.map((p) => {
          const pct = usagePercent(p.usedCount, p.maxUses);
          return (
            <div key={p.id} className="card" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FFF0EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Tag size={18} color="#F05A28" />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1D23", letterSpacing: "0.5px" }}>{p.code}</div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>{p.type}</div>
                  </div>
                </div>
                <span className={`badge ${statusColor[p.status]}`}>{p.status}</span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: "#6B7280" }}>
                    {p.type === "Percentage" ? `${p.discount}% off` : p.type === "Free Delivery" ? "Free delivery" : `$${p.discount} off`}
                    {" · "}Min ${p.minOrder}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{p.usedCount}/{p.maxUses}</span>
                </div>
                <div style={{ height: 4, background: "#F3F4F6", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", background: pct >= 100 ? "#EF4444" : "#F05A28", width: `${pct}%`, borderRadius: 2, transition: "width 0.3s" }} />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#9CA3AF", marginBottom: 14 }}>
                <Calendar size={12} />
                {p.startDate} → {p.endDate}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => openEdit(p)}>
                  <Edit2 size={13} /> Edit
                </button>
                <button onClick={() => setDeleteTarget(p.id)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", cursor: "pointer", color: "#EF4444" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: "#1A1D23", marginBottom: 20 }}>
              {editItem ? "Edit Promotion" : "Create Promotion"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Promo Code *</label>
                <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="e.g. WELCOME20" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Type</label>
                  <select className="select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option>Percentage</option>
                    <option>Fixed</option>
                    <option>Free Delivery</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Discount Value</label>
                  <input className="input" type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="e.g. 20" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Min Order ($)</label>
                  <input className="input" type="number" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} placeholder="10" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Max Uses</label>
                  <input className="input" type="number" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} placeholder="500" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Start Date</label>
                  <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>End Date</label>
                  <input className="input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editItem ? "Save Changes" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Promotion"
          message="This will permanently delete the promo code."
          confirmLabel="Delete"
          danger
          onConfirm={async () => { if(!deleteTarget)return; const {error}=await db.promotions.remove(deleteTarget); if(error){showToast(error.message,"error");return;} setPromos(p=>p.filter(pr=>pr.id!==deleteTarget)); showToast("Promotion deleted","success"); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
