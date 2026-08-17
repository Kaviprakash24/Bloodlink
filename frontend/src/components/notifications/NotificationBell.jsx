import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '../../services/api';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const dropdownRef = useRef(null);
  const socketRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Socket.IO Connection
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected for real-time notifications');
    });

    socketRef.current.on('new_notification', (newNotification) => {
      setNotifications(prev => {
        // Prevent duplicates based on _id
        if (prev.some(n => n._id === newNotification._id)) return prev;
        return [newNotification, ...prev];
      });
      setUnreadCount(prev => prev + 1);
    });

    socketRef.current.on('connect_error', (err) => {
      // Silently handle errors, REST still works
      console.warn('Socket connection error:', err.message);
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/notifications?limit=10');
      setNotifications(res.data.notifications);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
      setError('Could not load notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (newState) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id, currentReadState) => {
    if (currentReadState) return; // Already read
    
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.abs(now - date) / 36e5;
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleToggle}
        className="relative p-2 text-slate-500 hover:text-slate-700 transition-colors rounded-full hover:bg-slate-100 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[32rem]">
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs text-primary hover:text-primary-dark font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="overflow-y-auto flex-grow">
            {loading ? (
              <div className="p-4 text-center text-sm text-slate-500">Loading notifications...</div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-500">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-500 space-y-3">
                <Bell className="w-8 h-8 text-slate-300" />
                <p className="text-sm">You have no notifications right now.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li 
                    key={notification._id} 
                    className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer group ${!notification.isRead ? 'bg-blue-50/30' : ''}`}
                    onClick={() => handleMarkAsRead(notification._id, notification.isRead)}
                  >
                    <div className="flex gap-3">
                      {!notification.isRead && (
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.isRead ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>
                          {notification.title}
                        </p>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="border-t border-slate-100 bg-slate-50 p-2 text-center">
            <button className="text-xs text-slate-500 hover:text-slate-700 font-medium w-full py-1">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
