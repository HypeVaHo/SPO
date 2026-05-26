import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Generate VK OAuth URL
router.get('/vk', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.VK_APP_ID,
    redirect_uri: process.env.VK_REDIRECT_URI,
    display: 'page',
    scope: 'email',
    response_type: 'code',
    v: '5.131'
  });

  const authUrl = `https://oauth.vk.com/authorize?${params.toString()}`;
  res.json({ url: authUrl });
});

// VK OAuth callback
router.get('/vk/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.get('https://oauth.vk.com/access_token', {
      params: {
        client_id: process.env.VK_APP_ID,
        client_secret: process.env.VK_APP_SECRET,
        redirect_uri: process.env.VK_REDIRECT_URI,
        code
      }
    });

    const { access_token, user_id } = tokenResponse.data;

    // Get user info from VK
    const userResponse = await axios.get('https://api.vk.com/method/users.get', {
      params: {
        user_ids: user_id,
        fields: 'photo_200',
        access_token,
        v: '5.131'
      }
    });

    const vkUser = userResponse.data.response[0];

    // Find or create user in database
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE vk_id = ?',
      [vkUser.id]
    );

    let user;

    if (existingUsers.length > 0) {
      // Update existing user
      await pool.query(
        'UPDATE users SET first_name = ?, last_name = ?, photo_url = ? WHERE vk_id = ?',
        [vkUser.first_name, vkUser.last_name, vkUser.photo_200, vkUser.id]
      );
      user = existingUsers[0];
    } else {
      // Create new user
      const [result] = await pool.query(
        'INSERT INTO users (vk_id, first_name, last_name, photo_url) VALUES (?, ?, ?, ?)',
        [vkUser.id, vkUser.first_name, vkUser.last_name, vkUser.photo_200]
      );
      user = {
        id: result.insertId,
        vk_id: vkUser.id,
        first_name: vkUser.first_name,
        last_name: vkUser.last_name,
        photo_url: vkUser.photo_200,
        role: 'customer'
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, vkId: user.vk_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);

  } catch (error) {
    console.error('VK OAuth error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// Get current user
router.get('/me', authenticate, (req, res) => {
  res.json({
    id: req.user.id,
    vk_id: req.user.vk_id,
    first_name: req.user.first_name,
    last_name: req.user.last_name,
    photo_url: req.user.photo_url,
    role: req.user.role
  });
});

// Logout (client-side token removal, but we can add server-side blacklist if needed)
router.post('/logout', authenticate, (req, res) => {
  // In a simple JWT setup, logout is handled client-side by removing the token
  // For enhanced security, you could maintain a token blacklist
  res.json({ message: 'Выход выполнен' });
});

export default router;
