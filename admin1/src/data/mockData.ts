import { db } from '../lib/db';

export let revenueData: any[] = [];
export let categoryRevenueData: any[] = [];
export let weeklyOrders: any[] = [];
export let orders: any[] = [];
export let restaurants: any[] = [];
export let menuItems: any[] = [];
export let categories: any[] = [];
export let customers: any[] = [];
export let payments: any[] = [];
export let reviews: any[] = [];
export let promotions: any[] = [];
export let riders: any[] = [];
export let popularFoods: any[] = [];

const money = (v: any) => Number(v || 0);
const fmtStatus = (v: string) => String(v || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export async function loadLiveData() {
  const [r, m, c, cu, ri, o, p, rv, pr] = await Promise.all([
    db.restaurants.list(), db.menu.list(), db.categories.list(), db.customers.list(),
    db.riders.list(), db.orders.list(), db.payments.list(), db.reviews.list(), db.promotions.list()
  ]);
  const errors = [r,m,c,cu,ri,o,p,rv,pr].filter(x => x.error);
  if (errors.length) throw errors[0].error;

  restaurants = (r.data || []).map((x:any) => ({ id: String(x.id), name:x.name, cuisine:x.cuisine, rating:money(x.rating), orders:0, revenue:0, deliveryFee:money(x.delivery_fee), deliveryTime:`${x.delivery_time_min || 0}-${x.delivery_time_max || 0}`, status:fmtStatus(x.status), image:x.image_url || '' }));
  categories = (c.data || []).map((x:any) => ({ id:String(x.id), name:x.name, icon:x.icon || '🍽️', itemCount:0, order:x.display_order || 0, status:fmtStatus(x.status) }));
  menuItems = (m.data || []).map((x:any) => ({ id:String(x.id), name:x.name, restaurant:x.restaurants?.name || '', restaurantId:String(x.restaurant_id), category:x.categories?.name || '', categoryId:x.category_id ? String(x.category_id) : '', price:money(x.price), available:!!x.available, popular:!!x.popular, spicy:!!x.spicy, image:x.image_url || '' }));
  customers = (cu.data || []).map((x:any) => ({ id:x.id, name:x.name, email:x.email || '', phone:x.phone || '', joined:String(x.created_at || '').slice(0,10), orders:x.total_orders || 0, totalSpent:money(x.total_spent), status:fmtStatus(x.status), avatar:(x.name || 'CU').split(' ').map((s:string)=>s[0]).join('').slice(0,2).toUpperCase() }));
  riders = (ri.data || []).map((x:any) => ({ id:x.id, name:x.name, phone:x.phone || '', vehicle:x.vehicle_type || '', plate:x.license_plate, rating:money(x.rating), totalDeliveries:x.total_deliveries || 0, activeOrders:x.active_orders || 0, status:fmtStatus(x.status), joined:x.joined_at || '', earnings:money(x.earnings) }));
  orders = (o.data || []).map((x:any) => ({ id:x.id, customer:x.customers?.name || 'Unknown', restaurant:x.restaurants?.name || 'Unknown', items:(x.order_items || []).flatMap((i:any)=>Array(Math.max(1,i.quantity||1)).fill(i.name)), total:money(x.total), status:fmtStatus(x.status), date:new Date(x.created_at).toLocaleString(), payment:fmtStatus(x.payments?.[0]?.method || ''), rider:x.drivers?.name || null, address:x.delivery_address }));
  payments = (p.data || []).map((x:any) => ({ id:x.payment_code || x.id, dbId:x.id, orderId:x.order_id, customer:x.customers?.name || '', amount:money(x.amount), method:fmtStatus(x.method), status:fmtStatus(x.status), date:new Date(x.created_at).toLocaleString(), khqrRef:x.khqr_reference || null }));
  reviews = (rv.data || []).map((x:any) => ({ id:x.id, customer:x.customers?.name || '', restaurant:x.restaurants?.name || '', rating:x.rating, comment:x.comment || '', date:new Date(x.created_at).toLocaleString(), status:fmtStatus(x.status), reported:!!x.reported }));
  promotions = (pr.data || []).map((x:any) => ({ id:x.id, code:x.code, type:x.type === 'percentage' ? 'Percentage' : x.type === 'free_delivery' ? 'Free Delivery' : 'Fixed', discount:money(x.discount), minOrder:money(x.minimum_order), maxUses:x.max_uses || 0, usedCount:x.used_count || 0, startDate:String(x.start_date).slice(0,10), endDate:String(x.end_date).slice(0,10), status:fmtStatus(x.status) }));

  const byRestaurant = new Map<string, {orders:number,revenue:number}>();
  (o.data || []).forEach((x:any)=>{ const k=String(x.restaurant_id); const a=byRestaurant.get(k)||{orders:0,revenue:0}; a.orders++; a.revenue+=money(x.total); byRestaurant.set(k,a); });
  restaurants = restaurants.map((x:any)=>({...x,...(byRestaurant.get(x.id)||{})}));
  const catMap = new Map<string,number>();
  menuItems.forEach((x:any)=>catMap.set(x.category,(catMap.get(x.category)||0)+1));
  categories = categories.map((x:any)=>({...x,itemCount:catMap.get(x.name)||0}));
  const foodMap = new Map<string,{name:string,restaurant:string,orders:number,revenue:number,image:string}>();
  (o.data||[]).forEach((ord:any)=> (ord.order_items||[]).forEach((it:any)=>{ const key=it.name; const item=menuItems.find((m:any)=>m.name===key); const cur=foodMap.get(key)||{name:key,restaurant:ord.restaurants?.name||'',orders:0,revenue:0,image:item?.image||''}; cur.orders+=it.quantity||1; cur.revenue += (money(item?.price) * (it.quantity||1)); foodMap.set(key,cur); }));
  popularFoods = [...foodMap.values()].sort((a,b)=>b.orders-a.orders).slice(0,5);

  const months = new Map<string,{revenue:number,orders:number}>();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']; const week = new Map<string,number>();
  (o.data||[]).forEach((x:any)=>{ const d=new Date(x.created_at); const mk=d.toLocaleString('en-US',{month:'short'}); const cur=months.get(mk)||{revenue:0,orders:0}; cur.revenue+=money(x.total);cur.orders++;months.set(mk,cur); const dk=days[d.getDay()]; week.set(dk,(week.get(dk)||0)+1); });
  revenueData=[...months.entries()].map(([month,v])=>({month,...v}));
  weeklyOrders=days.slice(1).concat('Sun').map(day=>({day,orders:week.get(day)||0}));
  categoryRevenueData=categories.map((x:any,i:number)=>({name:x.name,value:Math.round((x.itemCount/Math.max(1,menuItems.length))*100),color:['#F05A28','#FB923C','#FCD34D','#34D399','#60A5FA'][i%5]})).filter(x=>x.value>0);
}
