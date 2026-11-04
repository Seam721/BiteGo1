import { useEffect, useState } from "react";
import { db } from "../lib/db";
import { supabase } from "../lib/supabase";
import { Save, Plus, Trash2, Shield, QrCode, Bell, Globe, Users } from "lucide-react";

const tabs = ["General", "Payment & KHQR", "Notifications", "Admin Users"];

export default function Settings({ showToast }: { showToast: (msg: string, type?: "success" | "error" | "warning" | "info") => void }) {
  const [tab, setTab] = useState("General");
  const [general, setGeneral] = useState({
    siteName: "BiteGo", currency: "USD", timezone: "Asia/Phnom_Penh",
    minOrder: "3", deliveryRadius: "15", supportEmail: "",
    supportPhone: "",
  });
  const [khqr, setKhqr] = useState({
    merchantId: "", merchantName: "BiteGo Cambodia",
    qrEnabled: true,
  });
  const [notifs, setNotifs] = useState({
    newOrder: true, paymentFailed: true,
    newRestaurant: false, lowRating: true,
  });
  const [users, setUsers] = useState<any[]>([]);
  useEffect(()=>{
    Promise.all([db.settings.platform(),db.settings.payment(),db.settings.notifications(),supabase.from("profiles").select("id,full_name,email,role,status").in("role",["admin","manager","staff"]).order("created_at")]).then(([platform,payment,notif,admins])=>{
      if(platform.data) setGeneral(g=>({...g,siteName:platform.data.platform_name||g.siteName,minOrder:String(platform.data.min_order||g.minOrder),deliveryRadius:String(platform.data.delivery_radius||g.deliveryRadius),timezone:platform.data.timezone||g.timezone,supportEmail:platform.data.support_email||g.supportEmail,supportPhone:platform.data.support_phone||g.supportPhone,currency:platform.data.currency||g.currency}));
      if(payment.data) setKhqr(k=>({...k,merchantId:payment.data.khqr_merchant_id||k.merchantId,merchantName:payment.data.khqr_merchant_name||k.merchantName,qrEnabled:payment.data.khqr_enabled ?? k.qrEnabled}));
      if(notif.data) setNotifs(n=>({...n,newOrder:notif.data.order_notifications??n.newOrder,paymentFailed:notif.data.payment_notifications??n.paymentFailed,lowRating:notif.data.review_notifications??n.lowRating,newRestaurant:notif.data.promotion_notifications??n.newRestaurant}));
      if(!admins.error) setUsers((admins.data||[]).map((u:any)=>({id:u.id,name:u.full_name||"Admin",email:u.email||"",role:u.role,status:u.status})));
    }).catch(e=>showToast(e.message,"error"));
  },[]);
  const save = async () => {
    const [a,b,c]=await Promise.all([
      db.settings.savePlatform({platform_name:general.siteName,support_email:general.supportEmail,support_phone:general.supportPhone,currency:general.currency,timezone:general.timezone,min_order:Number(general.minOrder||0),delivery_radius:Number(general.deliveryRadius||0)}),
      db.settings.savePayment({khqr_enabled:khqr.qrEnabled,khqr_merchant_id:khqr.merchantId,khqr_merchant_name:khqr.merchantName}),
      db.settings.saveNotifications({order_notifications:notifs.newOrder,payment_notifications:notifs.paymentFailed,review_notifications:notifs.lowRating,promotion_notifications:notifs.newRestaurant})
    ]);
    const err=a.error||b.error||c.error; if(err){showToast(err.message,"error");return;} showToast("Settings saved successfully","success");
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 24, fontWeight: 700, color: "#1A1D23" }}>Settings</h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 2 }}>Platform configuration and preferences</p>
        </div>
        <button className="btn-primary" onClick={save}><Save size={15} /> Save Changes</button>
      </div>

      <div className="tab-bar" style={{ marginBottom: 24 }}>
        {tabs.map((t) => (
          <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === "General" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Globe size={18} color="#F05A28" />
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1D23" }}>Platform Settings</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Platform Name", key: "siteName" },
                { label: "Support Email", key: "supportEmail" },
                { label: "Support Phone", key: "supportPhone" },
              ].map((f) => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{f.label}</label>
                  <input className="input" value={(general as any)[f.key]} onChange={(e) => setGeneral({ ...general, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Globe size={18} color="#F05A28" />
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1D23" }}>Localization & Delivery</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Currency</label>
                <select className="select" value={general.currency} onChange={(e) => setGeneral({ ...general, currency: e.target.value })}>
                  <option>USD</option>
                  <option>KHR</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Timezone</label>
                <select className="select" value={general.timezone} onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}>
                  <option>Asia/Phnom_Penh</option>
                  <option>Asia/Bangkok</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Minimum Order ($)</label>
                <input className="input" type="number" value={general.minOrder} onChange={(e) => setGeneral({ ...general, minOrder: e.target.value })} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Delivery Radius (km)</label>
                <input className="input" type="number" value={general.deliveryRadius} onChange={(e) => setGeneral({ ...general, deliveryRadius: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "Payment & KHQR" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <QrCode size={18} color="#F05A28" />
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1D23" }}>KHQR Configuration</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "Merchant Reference (optional)", key: "merchantId" },
                { label: "Merchant Name", key: "merchantName" },
              ].map((f) => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{f.label}</label>
                  <input className="input" value={(khqr as any)[f.key]} onChange={(e) => setKhqr({ ...khqr, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <Shield size={18} color="#F05A28" />
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1D23" }}>Payment Methods</h3>
            </div>
            <div style={{ border: "1px solid #FED7AA", background: "#FFF7ED", borderRadius: 10, padding: 14, color: "#9A3412", fontSize: 13, lineHeight: 1.6 }}>
              The customer checkout keeps the existing ABA, ACLEDA, WING and cash payment flow. The supplied QR images and five-minute payment window are managed by that flow; this settings page does not replace or simulate bank verification.
            </div>
          </div>
        </div>
      )}

      {tab === "Notifications" && (
        <div className="card" style={{ padding: 24, maxWidth: 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Bell size={18} color="#F05A28" />
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#1A1D23" }}>Notification Preferences</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "New order placed", key: "newOrder" },
              { label: "Payment failed", key: "paymentFailed" },
              { label: "New restaurant registered", key: "newRestaurant" },
              { label: "Review with low rating (≤2)", key: "lowRating" },
            ].map((n) => (
              <div key={n.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderRadius: 8, border: "1px solid #E8EAF0" }}>
                <span style={{ fontSize: 14, color: "#374151" }}>{n.label}</span>
                <label style={{ position: "relative", display: "inline-block", width: 40, height: 22, cursor: "pointer" }}>
                  <input type="checkbox" checked={(notifs as any)[n.key]} onChange={(e) => setNotifs({ ...notifs, [n.key]: e.target.checked })} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span style={{ position: "absolute", inset: 0, borderRadius: 11, background: (notifs as any)[n.key] ? "#F05A28" : "#D1D5DB", transition: "0.2s" }}>
                    <span style={{ position: "absolute", top: 3, left: (notifs as any)[n.key] ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Admin Users" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <p style={{ fontSize: 14, color: "#6B7280" }}>{users.length} admin users</p>
            <button className="btn-primary" onClick={() => showToast("Create the account in Supabase Authentication, then assign an active admin, manager, or staff role in profiles.", "info")}><Plus size={15} /> Add User</button>
          </div>
          <div className="card" style={{ overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#6B7280", fontSize: 13 }}>
                      No admin accounts found. Create an Auth user in Supabase and assign an active admin, manager, or staff role in profiles.
                    </td>
                  </tr>
                )}
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: "#FFF0EB", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "#F05A28" }}>
                          {u.name.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: "#1A1D23" }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: "#9CA3AF" }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.role === "Super Admin" ? "badge-primary" : u.role === "Manager" ? "badge-info" : "badge-muted"}`}>
                        <Shield size={10} /> {u.role}
                      </span>
                    </td>
                    <td><span className="badge badge-success">{u.status}</span></td>
                    <td>
                      {u.role !== "Super Admin" && (
                        <button onClick={async () => { const {error}=await supabase.from("profiles").update({status:"inactive"}).eq("id",u.id); if(error){showToast(error.message,"error");return;} setUsers(p=>p.filter(x=>x.id!==u.id)); showToast("User disabled","success"); }} style={{ padding: "5px", borderRadius: 6, border: "1px solid #FECACA", background: "#FEF2F2", cursor: "pointer", color: "#EF4444" }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  );
}
