import { useEffect, useState } from "react";
import { db } from "../lib/db";
import { Search, Star, Bike, Eye, Plus, Pencil, Trash2 } from "lucide-react";
import { riders as mockRiders } from "../data/mockData";

export default function Riders({ showToast }: { showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void }) {
  const [riders, setRiders] = useState<any[]>([]);
  
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const emptyForm = { name:"", phone:"", vehicle:"Motorbike", plate:"", status:"offline", email:"", password:"" };
  const [form, setForm] = useState(emptyForm);
  const loadRiders = async () => {
    const {data,error}=await db.riders.list();
    if(error){showToast(error.message,"error");return;}
    setRiders((data||[]).map((x:any)=>({id:x.id,name:x.name,phone:x.phone||"",vehicle:x.vehicle_type||"",plate:x.license_plate||"",rating:Number(x.rating||0),totalDeliveries:Number(x.total_deliveries||0),activeOrders:Number(x.active_orders||0),status:String(x.status||"offline").replace(/\b\w/g,c=>c.toUpperCase()),joined:x.joined_at||x.created_at||"",earnings:Number(x.earnings||0)})));
  };
  const openAdd = () => { setEditItem(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (r:any) => { setEditItem(r); setForm({name:r.name,phone:r.phone,vehicle:r.vehicle||"Motorbike",plate:r.plate||"",status:String(r.status||"Offline").toLowerCase(),email:"",password:""}); setShowForm(true); };
  const saveRider = async () => {
    if(!form.name.trim()){showToast("Rider name is required","error");return;}
    const payload={name:form.name.trim(),phone:form.phone.trim(),vehicle_type:form.vehicle,license_plate:form.plate.trim(),status:form.status};
    if (!editItem) {
      if (!form.email.trim() || form.password.length < 8) { showToast("Enter a delivery login email and a password of at least 8 characters.", "error"); return; }
      const { data: { session } } = await (await import("../lib/supabase")).supabase.auth.getSession();
      const apiUrl = import.meta.env.VITE_API_URL ?? "";
      const response = await fetch(`${apiUrl}/api/admin/drivers/create-account`, {
        method: "POST", headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ ...payload, vehicle: form.vehicle, plate: form.plate, email: form.email, password: form.password })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { showToast(body.message || "Could not create delivery account.", "error"); return; }
    } else {
      const result = await db.riders.update(editItem.id,payload);
      if(result.error){showToast(result.error.message,"error");return;}
    }
    await loadRiders(); setShowForm(false); setEditItem(null); showToast(editItem?"Rider updated":"Delivery account created","success");
  };
  const deleteRider = async () => {
    if(!deleteTarget)return;
    const {error}=await db.riders.remove(deleteTarget);
    if(error){showToast(error.message,"error");return;}
    setRiders(p=>p.filter(x=>String(x.id)!==String(deleteTarget))); setDeleteTarget(null); showToast("Rider deleted","success");
  };

  useEffect(()=>{loadRiders();},[]);

  const filtered = riders.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search)
  );

  const online = riders.filter((r) => r.status === "Online").length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#1A1D23" }}>Riders</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 2 }}>{riders.length} delivery riders · {online} online now</p>
          <p style={{ color: "#9CA3AF", fontSize: 12, marginTop: 4 }}>Delivery staff sign in at your customer website URL followed by /delivery.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={15}/> Add Rider</button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Total Riders", value: riders.length, color: "#F05A28" },
          { label: "Online", value: online, color: "#22C55E" },
          { label: "Total Deliveries", value: riders.reduce((a, r) => a + r.totalDeliveries, 0).toLocaleString(), color: "#3B82F6" },
          { label: "Avg Rating", value: (riders.length ? riders.reduce((a, r) => a + r.rating, 0) / riders.length : 0).toFixed(1), color: "#F59E0B" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#6B7280" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16, display: "flex", gap: 10 }}>
        <div className="search-bar">
          <Search size={15} color="#9CA3AF" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search riders..." />
        </div>
        <select className="select" style={{ width: 140 }}>
          <option>All Status</option>
          <option>Online</option>
          <option>Offline</option>
        </select>
        <select className="select" style={{ width: 140 }}>
          <option>All Vehicles</option>
          <option>Motorbike</option>
          <option>Bicycle</option>
          <option>E-Bike</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {filtered.map((r) => (
          <div key={r.id} className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #F05A28, #E03A10)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 16 }}>
                    {r.name.split(" ").map((n: string) => n[0]).join("")}
                  </div>
                  <div style={{ position: "absolute", bottom: -2, right: -2, width: 12, height: 12, borderRadius: "50%", background: r.status === "Online" ? "#22C55E" : "#9CA3AF", border: "2px solid white" }} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, color: "#1A1D23" }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>{r.phone}</div>
                </div>
              </div>
              <span className={`badge ${r.status === "Online" ? "badge-success" : "badge-muted"}`}>{r.status}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "#F9FAFB", borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Vehicle</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "flex", alignItems: "center", gap: 4 }}>
                  <Bike size={13} color="#F05A28" /> {r.vehicle}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Rating</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", display: "flex", alignItems: "center", gap: 4 }}>
                  <Star size={12} color="#F59E0B" fill="#F59E0B" /> {r.rating}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Deliveries</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{r.totalDeliveries.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>Earnings</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#F05A28" }}>${r.earnings.toFixed(0)}</div>
              </div>
            </div>

            {r.activeOrders > 0 && (
              <div style={{ background: "#FFF0EB", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: "#F05A28", fontWeight: 600, marginBottom: 12 }}>
                🛵 {r.activeOrders} active order{r.activeOrders > 1 ? "s" : ""}
              </div>
            )}

            <div style={{display:"flex",gap:6}}>
              <button className="btn-secondary" style={{flex:1,justifyContent:"center"}} onClick={() => setSelected(r)}><Eye size={13}/> View</button>
              <button className="btn-secondary" onClick={()=>openEdit(r)} title="Edit"><Pencil size={13}/></button>
              <button className="btn-secondary" onClick={()=>setDeleteTarget(String(r.id))} title="Delete" style={{color:"#EF4444"}}><Trash2 size={13}/></button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:460}}>
            <h3 style={{fontFamily:"'Outfit',sans-serif",fontSize:20,fontWeight:700,marginBottom:18}}>{editItem?"Edit Rider":"Create Delivery Account"}</h3>
            <div style={{display:"grid",gap:12}}>
              <input className="input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full name"/>
              {!editItem && <><input className="input" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Delivery login email"/><input className="input" type="password" autoComplete="new-password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Temporary password (8+ characters)"/></>}
              <input className="input" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone"/>
              <select className="select" value={form.vehicle} onChange={e=>setForm({...form,vehicle:e.target.value})}><option>Motorbike</option><option>Bicycle</option><option>E-Bike</option></select>
              <input className="input" value={form.plate} onChange={e=>setForm({...form,plate:e.target.value})} placeholder="License plate"/>
              <select className="select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="online">Online</option><option value="offline">Offline</option></select>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}><button className="btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button><button className="btn-primary" onClick={saveRider}>{editItem ? "Save Rider" : "Create Account"}</button></div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="modal-overlay" onClick={()=>setDeleteTarget(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:400}}>
            <h3 style={{fontSize:18,fontWeight:700}}>Delete Rider?</h3><p style={{color:"#6B7280",fontSize:14,margin:"8px 0 20px"}}>This action cannot be undone.</p>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}><button className="btn-secondary" onClick={()=>setDeleteTarget(null)}>Cancel</button><button className="btn-primary" style={{background:"#EF4444"}} onClick={deleteRider}>Delete</button></div>
          </div>
        </div>
      )}

      {/* Rider Profile Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg, #F05A28, #E03A10)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 22, margin: "0 auto 12px" }}>
                {selected.name.split(" ").map((n: string) => n[0]).join("")}
              </div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: "#1A1D23" }}>{selected.name}</h3>
              <p style={{ fontSize: 14, color: "#9CA3AF" }}>{selected.id} · Joined {selected.joined}</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "#F9FAFB", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              {[
                { label: "Phone", value: selected.phone },
                { label: "Vehicle", value: selected.vehicle },
                { label: "Plate", value: selected.plate || "N/A" },
                { label: "Rating", value: `${selected.rating} ★` },
                { label: "Total Deliveries", value: selected.totalDeliveries.toLocaleString() },
                { label: "Total Earnings", value: `$${selected.earnings.toFixed(2)}` },
              ].map((f) => (
                <div key={f.label}>
                  <div style={{ fontSize: 11, color: "#9CA3AF", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1A1D23", marginTop: 2 }}>{f.value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
