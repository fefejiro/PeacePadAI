import webpush from 'web-push';
import { storage } from './storage';

// VAPID keys from environment variables
// Generate keys with: npx web-push generate-vapid-keys
// Development fallback keys (REPLACE IN PRODUCTION)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFVvGPlWkZ5bvAKixGJXnRnZNfLKvShYvH9I44lBuDzKRk';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'vL7u8JXqShHEhVfuJ-TZ1JQrj1NKT65wHO4nG5fKsqM';

// Warn if using development keys in production
if (!process.env.VAPID_PUBLIC_KEY && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: Using development VAPID keys. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables for production!');
}

// Configure web-push with VAPID details
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:support@peacepad.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function sendPushNotification(userId: string, notification: {
  title: string;
  body: string;
  icon?: string;
  data?: any;
}) {
  try {
    // Get all push subscriptions for the user
    const subscriptions = await storage.getPushSubscriptionsByUser(userId);

    if (subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${userId}`);
      return;
    }

    // Send notification to all user's subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const payload = JSON.stringify({
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icon-192.png',
        badge: '/icon-192.png',
        data: notification.data || {},
      });

      try {
        await webpush.sendNotification(pushSubscription, payload);
        console.log(`Push notification sent to ${sub.endpoint}`);
      } catch (error: any) {
        // If subscription is invalid/expired, remove it
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`Removing invalid subscription: ${sub.endpoint}`);
          await storage.deletePushSubscription(sub.endpoint);
        } else {
          console.error(`Error sending push to ${sub.endpoint}:`, error);
        }
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Error sending push notifications:', error);
  }
}

export function getVapidPublicKey() {
  return VAPID_PUBLIC_KEY;
}
