import { Router } from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';

const router = Router();

// Get all users (admin only)
router.get('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { role, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT id, vk_id, first_name, last_name, photo_url, role, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [users] = await pool.query(query, params);
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

// Get user profile
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Users can only see their own profile, admins can see anyone
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const [users] = await pool.query(
      'SELECT id, vk_id, first_name, last_name, photo_url, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const user = users[0];

    // Get order stats for the user
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'completed' THEN total ELSE 0 END) as total_spent,
        SUM(CASE WHEN status IN ('new', 'preparing', 'ready') THEN 1 ELSE 0 END) as active_orders
      FROM orders WHERE user_id = ?
    `, [req.params.id]);

    user.stats = stats[0];

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Ошибка получения пользователя' });
  }
});

// Update user role (admin only)
router.patch('/:id/role', authenticate, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['customer', 'baker', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Неверная роль' });
    }

    // Can't change own role
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: 'Нельзя изменить свою роль' });
    }

    const [existing] = await pool.query('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

    const [updated] = await pool.query(
      'SELECT id, vk_id, first_name, last_name, photo_url, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Ошибка обновления роли' });
  }
});

export default router;
