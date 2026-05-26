import { Router } from 'express';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roles.js';

const router = Router();

// Get all categories (public)
router.get('/', async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT * FROM categories ORDER BY sort_order, name'
    );
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Ошибка получения категорий' });
  }
});

// Get category by id or slug (public)
router.get('/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    const isNumeric = /^\d+$/.test(identifier);

    const [categories] = await pool.query(
      isNumeric
        ? 'SELECT * FROM categories WHERE id = ?'
        : 'SELECT * FROM categories WHERE slug = ?',
      [identifier]
    );

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.json(categories[0]);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Ошибка получения категории' });
  }
});

// Create category (admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, slug, sort_order = 0 } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'Название и slug обязательны' });
    }

    // Check for duplicate slug
    const [existing] = await pool.query('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Категория с таким slug уже существует' });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, slug, sort_order) VALUES (?, ?, ?)',
      [name, slug, sort_order]
    );

    const [newCategory] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    res.status(201).json(newCategory[0]);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Ошибка создания категории' });
  }
});

// Update category (admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name, slug, sort_order } = req.body;

    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    // Check for duplicate slug (excluding current category)
    if (slug) {
      const [duplicateSlug] = await pool.query(
        'SELECT id FROM categories WHERE slug = ? AND id != ?',
        [slug, req.params.id]
      );
      if (duplicateSlug.length > 0) {
        return res.status(400).json({ error: 'Категория с таким slug уже существует' });
      }
    }

    await pool.query(
      'UPDATE categories SET name = ?, slug = ?, sort_order = ? WHERE id = ?',
      [name, slug, sort_order, req.params.id]
    );

    const [updated] = await pool.query('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Ошибка обновления категории' });
  }
});

// Delete category (admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    // Check if category has products
    const [products] = await pool.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [req.params.id]);
    if (products[0].count > 0) {
      return res.status(400).json({ 
        error: 'Нельзя удалить категорию с продуктами',
        products_count: products[0].count
      });
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Категория удалена' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Ошибка удаления категории' });
  }
});

export default router;
