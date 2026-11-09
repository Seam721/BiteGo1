
import { supabase } from './supabase';

export async function requireAdmin() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role,status')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  if (
    !['admin', 'manager', 'staff'].includes(profile.role) ||
    profile.status !== 'active'
  ) {
    throw new Error('Admin access required');
  }

  return user;
}

const withLookups = async (
  rows: any[],
  table: string,
  key: string,
  valueKey = 'name'
) => {
  if (!rows.length) return rows;

  const ids = [...new Set(rows.map((row) => row[key]).filter(Boolean))];

  if (!ids.length) return rows;

  const { data, error } = await supabase
    .from(table)
    .select(`id,${valueKey}`)
    .in('id', ids);

  if (error) {
    console.error(`Failed to load ${table} lookups:`, error.message);
    return rows.map((row) => ({
      ...row,
      [`${table}_name`]: '',
    }));
  }

  const map = new Map(
    (data || []).map((item: any) => [
      String(item.id),
      item[valueKey],
    ])
  );

  return rows.map((row) => ({
    ...row,
    [`${table}_name`]: map.get(String(row[key])) || '',
  }));
};

export const db = {
  restaurants: {
    list: () =>
      supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false }),

    insert: (row: any) =>
      supabase.from('restaurants').insert(row).select().single(),

    update: (id: number | string, row: any) =>
      supabase
        .from('restaurants')
        .update(row)
        .eq('id', id)
        .select()
        .single(),

    remove: (id: number | string) =>
      supabase.from('restaurants').delete().eq('id', id),
  },

  menu: {
    list: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { data: null, error };

      let rows = await withLookups(
        data || [],
        'restaurants',
        'restaurant_id'
      );

      rows = await withLookups(
        rows,
        'categories',
        'category_id'
      );

      return {
        data: rows.map((item: any) => ({
          ...item,
          restaurants: {
            name: item.restaurants_name || '',
          },
          categories: {
            name: item.categories_name || '',
          },
        })),
        error: null,
      };
    },

    insert: async (row: any) => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(row)
        .select()
        .single();

      if (error || !data) return { data, error };

      let rows = await withLookups(
        [data],
        'restaurants',
        'restaurant_id'
      );

      rows = await withLookups(
        rows,
        'categories',
        'category_id'
      );

      const item = rows[0];

      return {
        data: {
          ...item,
          restaurants: {
            name: item.restaurants_name || '',
          },
          categories: {
            name: item.categories_name || '',
          },
        },
        error: null,
      };
    },

    update: async (id: number | string, row: any) => {
      const { data, error } = await supabase
        .from('menu_items')
        .update(row)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) return { data, error };

      let rows = await withLookups(
        [data],
        'restaurants',
        'restaurant_id'
      );

      rows = await withLookups(
        rows,
        'categories',
        'category_id'
      );

      const item = rows[0];

      return {
        data: {
          ...item,
          restaurants: {
            name: item.restaurants_name || '',
          },
          categories: {
            name: item.categories_name || '',
          },
        },
        error: null,
      };
    },

    remove: (id: number | string) =>
      supabase.from('menu_items').delete().eq('id', id),
  },

  categories: {
    list: () =>
      supabase
        .from('categories')
        .select('*')
        .order('display_order'),

    insert: (row: any) =>
      supabase.from('categories').insert(row).select().single(),

    update: (id: number | string, row: any) =>
      supabase
        .from('categories')
        .update(row)
        .eq('id', id)
        .select()
        .single(),

    remove: (id: number | string) =>
      supabase.from('categories').delete().eq('id', id),
  },

  customers: {
    list: async () => {
      // 1. Load customers.
      const { data: customerRows, error: customersError } =
        await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

      if (customersError) {
        return { data: null, error: customersError };
      }

      const customers = customerRows || [];

      if (customers.length === 0) {
        return { data: [], error: null };
      }

      // 2. Load orders belonging to these customers.
      const customerIds = customers.map(
        (customer: any) => customer.id
      );

      const { data: orderRows, error: ordersError } =
        await supabase
          .from('orders')
          .select('id, customer_id')
          .in('customer_id', customerIds);

      if (ordersError) {
        return { data: null, error: ordersError };
      }

      const orders = orderRows || [];

      // 3. Count unique orders per customer.
      const ordersByCustomer = new Map<
        string,
        Set<string>
      >();

      const customerByOrder = new Map<string, string>();

      for (const order of orders) {
        if (
          order.id == null ||
          order.customer_id == null
        ) {
          continue;
        }

        const orderId = String(order.id);
        const customerId = String(order.customer_id);

        if (!ordersByCustomer.has(customerId)) {
          ordersByCustomer.set(
            customerId,
            new Set<string>()
          );
        }

        ordersByCustomer.get(customerId)!.add(orderId);
        customerByOrder.set(orderId, customerId);
      }

      // 4. Load payments for the retrieved orders.
      const spentByCustomer = new Map<string, number>();

      if (orders.length > 0) {
        const orderIds = [
          ...new Set(
            orders
              .map((order: any) => order.id)
              .filter((id: any) => id != null)
          ),
        ];

        if (orderIds.length > 0) {
          const { data: paymentRows, error: paymentsError } =
            await supabase
              .from('payments')
              .select('id, order_id, amount, status')
              .in('order_id', orderIds);

          if (paymentsError) {
            return { data: null, error: paymentsError };
          }

          const payments = paymentRows || [];

          // Group payment records by order.
          const paymentsByOrder = new Map<string, any[]>();

          for (const payment of payments) {
            if (payment.order_id == null) continue;

            const orderId = String(payment.order_id);
            const existing =
              paymentsByOrder.get(orderId) || [];

            existing.push(payment);
            paymentsByOrder.set(orderId, existing);
          }

          // Count one paid payment per order to avoid
          // counting multiple payment records twice.
          for (const [orderId, orderPayments] of paymentsByOrder) {
            const hasRefund = orderPayments.some(
              (payment: any) =>
                String(payment.status).toLowerCase() ===
                'refunded'
            );

            if (hasRefund) continue;

            const paidPayment = orderPayments.find(
              (payment: any) =>
                String(payment.status).toLowerCase() ===
                'paid'
            );

            if (!paidPayment) continue;

            const customerId = customerByOrder.get(orderId);

            if (!customerId) continue;

            const amount = Number(paidPayment.amount);

            if (
              !Number.isFinite(amount) ||
              amount < 0
            ) {
              continue;
            }

            spentByCustomer.set(
              customerId,
              (spentByCustomer.get(customerId) || 0) +
                amount
            );
          }
        }
      }

      // 5. Return customer details and calculated totals.
      const result = customers.map((customer: any) => {
        const customerId = String(customer.id);

        return {
          ...customer,

          total_orders:
            ordersByCustomer.get(customerId)?.size || 0,

          total_spent: Number(
            (
              spentByCustomer.get(customerId) || 0
            ).toFixed(2)
          ),
        };
      });

      return {
        data: result,
        error: null,
      };
    },

    insert: (row: any) =>
      supabase.from('customers').insert(row).select().single(),

    update: (id: string, row: any) =>
      supabase
        .from('customers')
        .update(row)
        .eq('id', id)
        .select()
        .single(),

    remove: (id: string) =>
      supabase.from('customers').delete().eq('id', id),
  },

  riders: {
    list: () =>
      supabase
        .from('drivers')
        .select('*')
        .order('created_at', { ascending: false }),

    insert: (row: any) =>
      supabase.from('drivers').insert(row).select().single(),

    update: (id: string, row: any) =>
      supabase
        .from('drivers')
        .update(row)
        .eq('id', id)
        .select()
        .single(),

    remove: (id: string) =>
      supabase.from('drivers').delete().eq('id', id),
  },

  orders: {
    list: async () => {
      const { data: orderRows, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { data: null, error };

      const rows = orderRows || [];

      if (rows.length === 0) {
        return { data: [], error: null };
      }

      const [
        customers,
        restaurants,
        drivers,
        itemsResult,
        paymentsResult,
      ] = await Promise.all([
        withLookups(rows, 'customers', 'customer_id', 'name'),
        withLookups(rows, 'restaurants', 'restaurant_id', 'name'),
        withLookups(rows, 'drivers', 'driver_id', 'name'),
        supabase
          .from('order_items')
          .select('*')
          .in('order_id', rows.map((item: any) => item.id)),
        supabase
          .from('payments')
          .select('*')
          .in('order_id', rows.map((item: any) => item.id)),
      ]);

      if (itemsResult.error) {
        return { data: null, error: itemsResult.error };
      }

      if (paymentsResult.error) {
        return { data: null, error: paymentsResult.error };
      }

      const items = itemsResult.data || [];
      const payments = paymentsResult.data || [];

      const customerMap = new Map(
        customers.map((item: any) => [
          String(item.id),
          item.name || '',
        ])
      );

      const restaurantMap = new Map(
        restaurants.map((item: any) => [
          String(item.id),
          item.name || '',
        ])
      );

      const driverMap = new Map(
        drivers.map((item: any) => [
          String(item.id),
          item.name || '',
        ])
      );

      const itemMap = new Map<string, any[]>();

      for (const item of items as any[]) {
        const key = String(item.order_id);
        itemMap.set(key, [
          ...(itemMap.get(key) || []),
          item,
        ]);
      }

      const paymentMap = new Map<string, any[]>();

      for (const payment of payments as any[]) {
        const key = String(payment.order_id);
        paymentMap.set(key, [
          ...(paymentMap.get(key) || []),
          payment,
        ]);
      }

      return {
        data: rows.map((order: any) => ({
          ...order,

          customers: {
            name:
              customerMap.get(String(order.customer_id)) || '',
          },

          restaurants: {
            name:
              restaurantMap.get(String(order.restaurant_id)) || '',
          },

          drivers: {
            name:
              driverMap.get(String(order.driver_id)) || '',
          },

          order_items: itemMap.get(String(order.id)) || [],
          payments: paymentMap.get(String(order.id)) || [],
        })),

        error: null,
      };
    },

    update: (id: string | number, row: any) =>
      supabase
        .from('orders')
        .update(row)
        .eq('id', id)
        .select()
        .single(),
  },

  payments: {
    list: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { data: null, error };

      const ids = [
        ...new Set(
          (data || [])
            .map((payment: any) => payment.customer_id)
            .filter(Boolean)
        ),
      ];

      let customers: any[] = [];

      if (ids.length > 0) {
        const result = await supabase
          .from('customers')
          .select('id,name')
          .in('id', ids);

        if (result.error) {
          return { data: null, error: result.error };
        }

        customers = result.data || [];
      }

      const customerMap = new Map(
        customers.map((customer: any) => [
          String(customer.id),
          customer.name,
        ])
      );

      return {
        data: (data || []).map((payment: any) => ({
          ...payment,
          customers: {
            name:
              customerMap.get(String(payment.customer_id)) || '',
          },
        })),
        error: null,
      };
    },

    update: (id: string | number, row: any) =>
      supabase
        .from('payments')
        .update(row)
        .eq('id', id)
        .select()
        .single(),
  },

  reviews: {
    list: async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return { data: null, error };

      const rows = data || [];

      const [customers, restaurants, menuItems] =
        await Promise.all([
          withLookups(rows, 'customers', 'customer_id'),
          withLookups(rows, 'restaurants', 'restaurant_id'),
          withLookups(rows, 'menu_items', 'menu_item_id'),
        ]);

      const customerMap = new Map(
        customers.map((item: any) => [
          String(item.id),
          item.customers_name || '',
        ])
      );

      const restaurantMap = new Map(
        restaurants.map((item: any) => [
          String(item.id),
          item.restaurants_name || '',
        ])
      );

      const menuItemMap = new Map(
        menuItems.map((item: any) => [
          String(item.id),
          item.menu_items_name || '',
        ])
      );

      return {
        data: rows.map((review: any) => ({
          ...review,

          customers: {
            name:
              customerMap.get(String(review.customer_id)) || '',
          },

          restaurants: {
            name:
              restaurantMap.get(String(review.restaurant_id)) || '',
          },

          menu_items: {
            name:
              menuItemMap.get(String(review.menu_item_id)) || '',
          },
        })),
        error: null,
      };
    },

    update: (id: string | number, row: any) =>
      supabase
        .from('reviews')
        .update(row)
        .eq('id', id)
        .select()
        .single(),

    remove: (id: string | number) =>
      supabase.from('reviews').delete().eq('id', id),
  },

  promotions: {
    list: () =>
      supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false }),

    insert: (row: any) =>
      supabase.from('promotions').insert(row).select().single(),

    update: (id: number | string, row: any) =>
      supabase
        .from('promotions')
        .update(row)
        .eq('id', id)
        .select()
        .single(),

    remove: (id: number | string) =>
      supabase.from('promotions').delete().eq('id', id),
  },

  settings: {
    platform: () =>
      supabase
        .from('platform_settings')
        .select('*')
        .eq('id', 1)
        .single(),

    savePlatform: (row: any) =>
      supabase
        .from('platform_settings')
        .upsert({ id: 1, ...row })
        .select()
        .single(),

    payment: () =>
      supabase
        .from('payment_settings')
        .select('*')
        .eq('id', 1)
        .single(),

    savePayment: (row: any) =>
      supabase
        .from('payment_settings')
        .upsert({ id: 1, ...row })
        .select()
        .single(),

    notifications: () =>
      supabase
        .from('notification_settings')
        .select('*')
        .eq('id', 1)
        .single(),

    saveNotifications: (row: any) =>
      supabase
        .from('notification_settings')
        .upsert({ id: 1, ...row })
        .select()
        .single(),
  },
};
