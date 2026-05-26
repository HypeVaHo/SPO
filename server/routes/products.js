import { Router } from 'express';
import pool from '../config/database.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';

const router = Router();

// Get all products (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { category, available } = req.query;
    
    let query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by category
    if (category) {
      query += ' AND c.slug = ?';
      params.push(category);
    }

    // Filter by availability (admin/baker can see all, customers only see available)
    if (available === 'true' || (!req.user || req.user.role === 'customer')) {
      query += ' AND p.is_available = TRUE';
    }

    query += ' ORDER BY c.sort_order, p.name';

    const [products] = await pool.query(query, params);
    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Ошибка получения продуктов' });
  }
});

// Get single product (public)
router.get('/:id', async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Продукт не найден' });
    }

    res.json(products[0]);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Ошибка получения продукта' });
  }
});

// Create product (admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { category_id, name, description, price, image_url, is_available = true } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Название и цена обязательны' });
    }

    const [result] = await pool.query(
      `INSERT INTO products (category_id, name, description, price, image_url, is_available)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [category_id || null, name, description, price, image_url, is_available]
    );

    const [newProduct] = await pool.query(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newProduct[0]);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Ошибка создания продукта' });
  }
});

// Update product (admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { category_id, name, description, price, image_url, is_available } = req.body;

    // Check if product exists
    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Продукт не найден' });
    }

    await pool.query(
      `UPDATE products 
       SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, is_available = ?
       WHERE id = ?`,
      [category_id, name, description, price, image_url, is_available, req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Ошибка обновления продукта' });
  }
});

// Delete product (admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Продукт не найден' });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Продукт удален' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Ошибка удаления продукта' });
  }
});

// Toggle product availability (admin only)
router.patch('/:id/availability', authenticate, isAdmin, async (req, res) => {
  try {
    const { is_available } = req.body;

    const [existing] = await pool.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Продукт не найден' });
    }

    await pool.query(
      'UPDATE products SET is_available = ? WHERE id = ?',
      [is_available, req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ error: 'Ошибка обновления доступности' });
  }
});

export default router;
