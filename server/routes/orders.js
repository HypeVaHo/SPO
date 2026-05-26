import { Router } from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { isBaker } from '../middleware/roles.js';
import { sendOrderNotification } from '../services/vkNotifications.js';

const router = Router();

// Status flow: new -> preparing -> ready -> completed
// Also: any status -> cancelled (by admin)
const STATUS_FLOW = {
  new: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
};

const STATUS_LABELS = {
  new: 'Новый',
  preparing: 'Готовится',
  ready: 'Готов',
  completed: 'Выдан',
  cancelled: 'Отменён'
};

// Get orders
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    let query = '';
    let params = [];

    if (req.user.role === 'customer') {
      // Customers see only their orders
      query = `
        SELECT o.*, u.first_name, u.last_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.user_id = ?
      `;
      params = [req.user.id];
    } else {
      // Bakers and admins see all orders
      query = `
        SELECT o.*, u.first_name, u.last_name, u.vk_id
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE 1=1
      `;
    }

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [orders] = await pool.query(query, params);

    // Get items for each order
    for (const order of orders) {
      const [items] = await pool.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.items = items;
    }

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Ошибка получения заказов' });
  }
});

// Get single order
router.get('/:id', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT o.*, u.first_name, u.last_name, u.vk_id
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `;
    const params = [req.params.id];

    // Customers can only see their own orders
    if (req.user.role === 'customer') {
      query += ' AND o.user_id = ?';
      params.push(req.user.id);
    }

    const [orders] = await pool.query(query, params);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    const order = orders[0];

    // Get order items
    const [items] = await pool.query(
      'SELECT * FROM order_items WHERE order_id = ?',
      [order.id]
    );
    order.items = items;

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Ошибка получения заказа' });
  }
});

// Create order
router.post('/', authenticate, async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    const { items, comment } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Заказ должен содержать хотя бы один товар' });
    }

    // Validate and get product details
    const productIds = items.map(item => item.product_id);
    const [products] = await connection.query(
      'SELECT id, name, price, is_available FROM products WHERE id IN (?)',
      [productIds]
    );

    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate all products exist and are available
    let total = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = productMap.get(item.product_id);
      
      if (!product) {
        await connection.rollback();
        return res.status(400).json({ error: `Продукт с ID ${item.product_id} не найден` });
      }

      if (!product.is_available) {
        await connection.rollback();
        return res.status(400).json({ error: `Продукт "${product.name}" недоступен` });
      }

      const quantity = parseInt(item.quantity) || 1;
      if (quantity < 1) {
        await connection.rollback();
        return res.status(400).json({ error: 'Количество должно быть больше 0' });
      }

      const itemTotal = product.price * quantity;
      total += itemTotal;

      validatedItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity,
        price: product.price
      });
    }

    // Create order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total, comment) VALUES (?, ?, ?)',
      [req.user.id, total, comment || null]
    );

    const orderId = orderResult.insertId;

    // Create order items
    for (const item of validatedItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.product_name, item.quantity, item.price]
      );
    }

    await connection.commit();

    // Fetch created order
    const [newOrders] = await pool.query(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    const order = newOrders[0];
    order.items = validatedItems;

    res.status(201).json(order);
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Ошибка создания заказа' });
  } finally {
    connection.release();
  }
});

// Update order status (baker/admin only)
router.patch('/:id/status', authenticate, isBaker, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !STATUS_LABELS[status]) {
      return res.status(400).json({ error: 'Неверный статус' });
    }

    // Get current order
    const [orders] = await pool.query(
      `SELECT o.*, u.vk_id, u.first_name
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Заказ не найден' });
    }

    const order = orders[0];
    const allowedStatuses = STATUS_FLOW[order.status];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Нельзя изменить статус с "${STATUS_LABELS[order.status]}" на "${STATUS_LABELS[status]}"`,
        allowed: allowedStatuses.map(s => ({ value: s, label: STATUS_LABELS[s] }))
      });
    }

    // Update status
    await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, req.params.id]
    );

    // Send VK notification
    try {
      await sendOrderNotification(order.vk_id, order.id, status, STATUS_LABELS[status]);
    } catch (notifError) {
      console.error('VK notification error:', notifError);
      // Don't fail the request if notification fails
    }

    const [updated] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    updated[0].status_label = STATUS_LABELS[status];

    res.json(updated[0]);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Ошибка обновления статуса' });
  }
});

// Get order statuses reference
router.get('/meta/statuses', (req, res) => {
  res.json({
    statuses: STATUS_LABELS,
    flow: STATUS_FLOW
  });
});

export default router;
