import { useEffect, useState } from "react";
import { db } from "../lib/db";
import { Plus, Edit2, Trash2, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";
import { categories as mockCats } from "../data/mockData";
import ConfirmModal from "../components/ConfirmModal";

export default function Categories({ showToast }: { showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void }) {
  const [cats, setCats] = useState<any[]>([]);
  useEffect(()=>{db.categories.list().then(({data,error})=>{if(error)showToast(error.message,"error");else setCats((data||[]).map((x:any)=>({id:String(x.id),name:x.name,icon:x.icon||"🍽️",itemCount:0,order:x.display_order||0,status:x.status==="active"?"Active":"Inactive"})));});},[]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<typeof mockCats[0] | null>(null);
  const [form, setForm] = useState({ name: "", icon: "" });

  const toggleStatus = (id: string) => {
    const c=cats.find(x=>x.id===id); if(!c)return; const next=c.status==="Active"?"inactive":"active"; db.categories.update(Number(id),{status:next}).then(({error})=>{if(error){showToast(error.message,"error");return;} setCats(p=>p.map(x=>x.id===id?{...x,status:next==="active"?"Active":"Inactive"}:x)); showToast("Category status updated","success");});
  };

  const moveUp = (id: string) => {
    setCats((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === 0) return prev;
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr.map((c, i) => ({ ...c, order: i + 1 }));
    });
    showToast("Order updated", "success");
  };

  const openEdit = (c: typeof mockCats[0]) => {
    setEditItem(c);
    setForm({ name: c.name, icon: c.icon });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { showToast("Name is required", "error"); return; }
    if (editItem) { const {error}=await db.categories.update(Number(editItem.id),{name:form.name,icon:form.icon}); if(error){showToast(error.message,"error");return;} setCats(prev=>prev.map(c=>c.id===editItem.id?{...c,...form}:c)); showToast("Category updated","success"); }
    else { const {data,error}=await db.categories.insert({name:form.name,icon:form.icon,display_order:cats.length+1,status:"active"}); if(error){showToast(error.message,"error");return;} const x:any=data; setCats(prev=>[...prev,{id:String(x.id),name:x.name,icon:x.icon||form.icon,itemCount:0,order:x.display_order,status:"Active"}]); showToast("Category added","success"); }
    setShowForm(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#1A1D23" }}>Categories</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 2 }}>Manage food categories and their display order</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditItem(null); setForm({ name: "", icon: "" }); setShowForm(true); }}>
          <Plus size={15} /> Add Category
        </button>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Order</th>
                <th>Icon</th>
                <th>Category Name</th>
                <th>Items</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c, idx) => (
                <tr key={c.id}>
                  <td>
                    <button onClick={() => moveUp(c.id)} style={{ background: "none", border: "none", cursor: idx > 0 ? "pointer" : "not-allowed", color: "#D1D5DB", opacity: idx === 0 ? 0.3 : 1 }}>
                      <GripVertical size={16} />
                    </button>
                  </td>
                  <td style={{ fontWeight: 700, color: "#9CA3AF" }}>#{c.order}</td>
                  <td style={{ fontSize: 22 }}>{c.icon}</td>
                  <td style={{ fontWeight: 600, color: "#1A1D23" }}>{c.name}</td>
                  <td>
                    <span className="badge badge-muted">{c.itemCount} items</span>
                  </td>
                  <td>
                    <button onClick={() => toggleStatus(c.id)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                      {c.status === "Active" ? <ToggleRight size={24} color="#22C55E" /> : <ToggleLeft size={24} color="#9CA3AF" />}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(c)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #E8EAF0", background: "white", cursor: "pointer", fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 4 }}>
                        <Edit2 size={12} /> Edit
                      </button>
                      <button onClick={() => setDeleteTarget(c.id)} style={{ padding: "5px", borderRadius: 6, border: "1px solid #FECACA", background: "#FEF2F2", cursor: "pointer", color: "#EF4444" }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: "#1A1D23", marginBottom: 20 }}>
              {editItem ? "Edit Category" : "Add Category"}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Category Name *</label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Khmer Food" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Icon Emoji</label>
                <input className="input" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="e.g. 🍛" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editItem ? "Save" : "Add Category"}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Category"
          message="Deleting this category may affect associated menu items. Continue?"
          confirmLabel="Delete"
          danger
          onConfirm={async () => { if(!deleteTarget)return; const {error}=await db.categories.remove(Number(deleteTarget)); if(error){showToast(error.message,"error");return;} setCats(p=>p.filter(c=>c.id!==deleteTarget)); showToast("Category deleted","success"); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
