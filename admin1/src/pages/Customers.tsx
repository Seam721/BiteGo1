import { useEffect, useState } from "react";
import { db } from "../lib/db";
import { Search, Eye, Ban, CheckCircle } from "lucide-react";
import { customers as mockCustomers } from "../data/mockData";
import ConfirmModal from "../components/ConfirmModal";

export default function Customers({ showToast }: { showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  useEffect(()=>{db.customers.list().then(({data,error})=>{if(error)showToast(error.message,"error");else setCustomers((data||[]).map((x:any)=>({id:x.id,name:x.name,email:x.email||"",phone:x.phone||"",joined:String(x.created_at||"").slice(0,10),orders:x.total_orders||0,totalSpent:Number(x.total_spent||0),status:x.status==="blocked"?"Blocked":"Active",avatar:(x.name||"CU").split(" ").map((s:string)=>s[0]).join("").slice(0,2).toUpperCase()})));});},[]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof mockCustomers[0] | null>(null);
  const [blockTarget, setBlockTarget] = useState<string | null>(null);

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const toggleBlock = async (id: string) => {
    const customer=customers.find(c=>c.id===id); if(!customer)return; const next=customer.status==="Blocked"?"active":"blocked"; const {error}=await db.customers.update(id,{status:next}); if(error){showToast(error.message,"error");return;} setCustomers(prev=>prev.map(c=>c.id===id?{...c,status:next==="active"?"Active":"Blocked"}:c)); showToast(`Customer ${next==="active"?"unblocked":"blocked"}`,"success"); setBlockTarget(null);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#1A1D23" }}>Customers</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 2 }}>{customers.length} registered customers</p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Customers", value: customers.length, color: "#F05A28" },
          { label: "Active", value: customers.filter((c) => c.status === "Active").length, color: "#22C55E" },
          { label: "Blocked", value: customers.filter((c) => c.status === "Blocked").length, color: "#EF4444" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#6B7280" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="search-bar">
          <Search size={15} color="#9CA3AF" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, phone..." />
        </div>
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Joined</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FFF0EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#F05A28" }}>
                      {c.avatar}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#1A1D23" }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF" }}>{c.email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ color: "#6B7280" }}>{c.phone}</td>
                <td style={{ color: "#9CA3AF" }}>{c.joined}</td>
                <td style={{ fontWeight: 600 }}>{c.orders}</td>
                <td style={{ fontWeight: 700, color: "#F05A28" }}>${c.totalSpent.toFixed(2)}</td>
                <td>
                  <span className={`badge ${c.status === "Active" ? "badge-success" : "badge-danger"}`}>{c.status}</span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setSelected(c)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #E8EAF0", background: "white", cursor: "pointer", fontSize: 12, color: "#374151", display: "flex", alignItems: "center", gap: 4 }}>
                      <Eye size={12} /> View
                    </button>
                    <button
                      onClick={() => setBlockTarget(c.id)}
                      style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${c.status === "Blocked" ? "#BBF7D0" : "#FECACA"}`, background: c.status === "Blocked" ? "#F0FDF4" : "#FEF2F2", cursor: "pointer", fontSize: 12, color: c.status === "Blocked" ? "#15803D" : "#EF4444", display: "flex", alignItems: "center", gap: 4 }}>
                      {c.status === "Blocked" ? <><CheckCircle size={12} /> Unblock</> : <><Ban size={12} /> Block</>}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Profile Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: "#FFF0EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, color: "#F05A28", margin: "0 auto 12px" }}>
                {selected.avatar}
              </div>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 700, color: "#1A1D23" }}>{selected.name}</h3>
              <p style={{ fontSize: 14, color: "#9CA3AF" }}>{selected.email}</p>
              <span className={`badge ${selected.status === "Active" ? "badge-success" : "badge-danger"}`} style={{ marginTop: 6 }}>{selected.status}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#F9FAFB", borderRadius: 10, padding: 16, marginBottom: 16 }}>
              {[
                { label: "Phone", value: selected.phone },
                { label: "Joined", value: selected.joined },
                { label: "Total Orders", value: String(selected.orders) },
                { label: "Total Spent", value: `$${selected.totalSpent.toFixed(2)}` },
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

      {blockTarget && (
        <ConfirmModal
          title={customers.find((c) => c.id === blockTarget)?.status === "Blocked" ? "Unblock Customer" : "Block Customer"}
          message="Are you sure you want to change this customer's status?"
          confirmLabel={customers.find((c) => c.id === blockTarget)?.status === "Blocked" ? "Unblock" : "Block"}
          danger={customers.find((c) => c.id === blockTarget)?.status !== "Blocked"}
          onConfirm={() => toggleBlock(blockTarget)}
          onCancel={() => setBlockTarget(null)}
        />
      )}
    </div>
  );
}
