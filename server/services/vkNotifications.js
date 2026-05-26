import axios from 'axios';

const VK_API_VERSION = '5.131';

/**
 * Send VK notification to user about order status change
 * Note: This requires a VK community token with messages permission
 * For production, you'll need to set up a VK community and get the proper token
 */
export async function sendOrderNotification(vkUserId, orderId, status, statusLabel) {
  // Skip if VK notifications are not configured
  if (!process.env.VK_COMMUNITY_TOKEN) {
    console.log('VK notifications not configured (VK_COMMUNITY_TOKEN missing)');
    return false;
  }

  const messages = {
    new: `Ваш заказ #${orderId} принят и ожидает обработки.`,
    preparing: `Ваш заказ #${orderId} готовится. Скоро будет готов!`,
    ready: `Ваш заказ #${orderId} готов! Можете забрать его.`,
    completed: `Ваш заказ #${orderId} выдан. Спасибо за покупку!`,
    cancelled: `Ваш заказ #${orderId} был отменён. Если у вас есть вопросы, свяжитесь с нами.`
  };

  const message = messages[status] || `Статус вашего заказа #${orderId} изменён на: ${statusLabel}`;

  try {
    const response = await axios.post('https://api.vk.com/method/messages.send', null, {
      params: {
        user_id: vkUserId,
        message,
        random_id: Date.now(),
        access_token: process.env.VK_COMMUNITY_TOKEN,
        v: VK_API_VERSION
      }
    });

    if (response.data.error) {
      console.error('VK API error:', response.data.error);
      return false;
    }

    console.log(`VK notification sent to user ${vkUserId} for order ${orderId}`);
    return true;
  } catch (error) {
    console.error('Failed to send VK notification:', error.message);
    return false;
  }
}

/**
 * Send bulk notification to multiple users
 */
export async function sendBulkNotification(vkUserIds, message) {
  if (!process.env.VK_COMMUNITY_TOKEN || !vkUserIds.length) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const vkUserId of vkUserIds) {
    try {
      await axios.post('https://api.vk.com/method/messages.send', null, {
        params: {
          user_id: vkUserId,
          message,
          random_id: Date.now() + Math.random(),
          access_token: process.env.VK_COMMUNITY_TOKEN,
          v: VK_API_VERSION
        }
      });
      sent++;
      
      // Rate limiting - VK allows ~20 messages per second
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      failed++;
    }
  }

  return { sent, failed };
}
