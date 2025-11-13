// Browser push notifications utility
import { logger } from './logger';

let permissionGranted = false;

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    logger.debug('Browser does not support notifications', {}, 'Notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    permissionGranted = true;
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      permissionGranted = permission === 'granted';
      logger.debug('Notification permission requested', { permission }, 'Notifications');
      return permissionGranted;
    } catch (error) {
      logger.error('Error requesting notification permission', error, 'Notifications');
      return false;
    }
  }

  return false;
};

// Check if page is visible
const isPageVisible = (): boolean => {
  return !document.hidden;
};

interface NotificationOptions {
  icon?: string;
  badge?: string;
  body?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const showNotification = (title: string, options: NotificationOptions = {}): Notification | null => {
  // Only show notification if permission is granted
  if (Notification.permission !== 'granted') {
    logger.debug('Notification permission not granted', {}, 'Notifications');
    return null;
  }

  // Don't show notification if page is visible (user is already viewing the app)
  // You can remove this check if you want notifications even when page is visible
  // if (isPageVisible()) {
  //   return null;
  // }

  const notificationOptions: NotificationOptions = {
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    ...options,
  };

  try {
    const notification = new Notification(title, notificationOptions);
    
    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);

    // Handle click
    notification.onclick = (event: Event) => {
      event.preventDefault();
      window.focus();
      notification.close();
    };

    logger.debug('Notification shown', { title }, 'Notifications');
    return notification;
  } catch (error) {
    logger.error('Error showing notification', error, 'Notifications');
    return null;
  }
};

interface Message {
  _id?: string;
  conversationId?: string;
  text?: string;
}

export const showMessageNotification = (message: Message, senderName?: string): void => {
  // Check notification permission first
  if (Notification.permission !== 'granted') {
    logger.debug('Notification permission not granted', { permission: Notification.permission }, 'Notifications');
    return;
  }

  // Only skip notification if user is actively viewing THIS specific conversation AND page is visible
  const currentPath = window.location.pathname;
  const isOnThisConversation = message.conversationId ? currentPath.includes(`/chats/${message.conversationId}`) : false;
  const pageVisible = isPageVisible();
  
  // Show notification if:
  // 1. User is not on this conversation page, OR
  // 2. Page is not visible (tab is in background), OR
  // 3. User is on /chats page (not viewing any specific conversation)
  if (pageVisible && isOnThisConversation) {
    logger.debug('Skipping notification - user is viewing this conversation', {}, 'Notifications');
    return; // User is actively viewing this conversation, skip notification
  }

  const title = senderName || 'New Message';
  const body = message.text || 'You have a new message';
  
  logger.debug('Showing message notification', { 
    title, 
    body, 
    isPageVisible: pageVisible, 
    isOnThisConversation,
    currentPath,
    conversationId: message.conversationId
  }, 'Notifications');
  
  const notification = showNotification(title, {
    body,
    tag: `message-${message._id || message.conversationId}`,
    requireInteraction: false,
  });

  if (!notification) {
    logger.error('Failed to create notification', {}, 'Notifications');
  }
};

// Check if user is on the current conversation page
export const isCurrentConversation = (conversationId: string): boolean => {
  const currentPath = window.location.pathname;
  return currentPath.includes(`/chats/${conversationId}`);
};

