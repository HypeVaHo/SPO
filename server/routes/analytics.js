import { Router } from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';

const router = Router();

// Sales statistics (admin only)
router.get('/sales', authenticate, isAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    // Total sales and orders
    const [totals] = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_revenue,
        AVG(CASE WHEN status = 'completed' THEN total ELSE NULL END) as avg_order_value
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);

    // Daily sales for the period
    const [dailySales] = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as revenue
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [days]);

    // Orders by status
    const [byStatus] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY status
    `, [days]);

    res.json({
      period_days: days,
      totals: totals[0],
      daily: dailySales,
      by_status: byStatus
    });
  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({ error: 'Ошибка получения аналитики продаж' });
  }
});

// Popular products (admin only)
router.get('/popular', authenticate, isAdmin, async (req, res) => {
  try {
    const { limit = 10, period = '30' } = req.query;
    const days = parseInt(period);

    const [popular] = await pool.query(`
      SELECT 
        oi.product_id,
        oi.product_name,
        p.price as current_price,
        p.is_available,
        c.name as category_name,
        SUM(oi.quantity) as total_sold,
        SUM(oi.quantity * oi.price) as total_revenue,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE o.status = 'completed'
        AND o.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY oi.product_id, oi.product_name, p.price, p.is_available, c.name
      ORDER BY total_sold DESC
      LIMIT ?
    `, [days, parseInt(limit)]);

    res.json({
      period_days: days,
      products: popular
    });
  } catch (error) {
    console.error('Get popular products error:', error);
    res.status(500).json({ error: 'Ошибка получения популярных товаров' });
  }
});

// Orders statistics (admin only)
router.get('/orders', authenticate, isAdmin, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);

    // Orders by hour of day
    const [byHour] = await pool.query(`
      SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as orders
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY HOUR(created_at)
      ORDER BY hour
    `, [days]);

    // Orders by day of week
    const [byDayOfWeek] = await pool.query(`
      SELECT 
        DAYOFWEEK(created_at) as day_of_week,
        COUNT(*) as orders
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY DAYOFWEEK(created_at)
      ORDER BY day_of_week
    `, [days]);

    // New customers
    const [newCustomers] = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'customer'
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [days]);

    // Repeat customers
    const [repeatCustomers] = await pool.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
        AND user_id IN (
          SELECT user_id FROM orders
          WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        )
    `, [days, days]);

    res.json({
      period_days: days,
      by_hour: byHour,
      by_day_of_week: byDayOfWeek,
      new_customers: newCustomers[0].count,
      repeat_customers: repeatCustomers[0].count
    });
  } catch (error) {
    console.error('Get orders analytics error:', error);
    res.status(500).json({ error: 'Ошибка получения аналитики заказов' });
  }
});

// Dashboard summary (admin only)
router.get('/dashboard', authenticate, isAdmin, async (req, res) => {
  try {
    // Today's stats
    const [today] = await pool.query(`
      SELECT 
        COUNT(*) as orders_today,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as revenue_today,
        SUM(CASE WHEN status IN ('new', 'preparing') THEN 1 ELSE 0 END) as pending_orders
      FROM orders
      WHERE DATE(created_at) = CURDATE()
    `);

    // Active orders (need attention)
    const [activeOrders] = await pool.query(`
      SELECT COUNT(*) as count
      FROM orders
      WHERE status IN ('new', 'preparing', 'ready')
    `);

    // Total users
    const [users] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END) as customers,
        SUM(CASE WHEN role = 'baker' THEN 1 ELSE 0 END) as bakers,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `);

    // Products stats
    const [products] = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_available THEN 1 ELSE 0 END) as available
      FROM products
    `);

    res.json({
      today: today[0],
      active_orders: activeOrders[0].count,
      users: users[0],
      products: products[0]
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Ошибка получения дашборда' });
  }
});

export default router;
