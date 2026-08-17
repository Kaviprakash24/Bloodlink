import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../../services/api';

const ChatBox = ({ donationId, currentUserId, className = '' }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    let socket;
    let isMounted = true;

    const fetchMessagesAndJoin = async () => {
      try {
        // Fetch history via REST
        const { data } = await api.get(`/donations/${donationId}/messages`);
        if (isMounted) {
          setMessages(data);
          setIsLoading(false);
        }

        // Join Socket.IO Room
        socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001', {
          withCredentials: true
        });

        socket.on('connect', () => {
          socket.emit('join_donation_room', donationId, (response) => {
            if (response.status === 'success') {
              if (isMounted) setIsJoined(true);
            } else {
              if (isMounted) setError(response.message || 'Failed to join chat room securely');
            }
          });
        });

        // Listen for new messages
        socket.on('new_message', (msg) => {
          if (msg.donationId === donationId) {
            setMessages(prev => {
              // Prevent duplicate messages if we are the sender
              if (prev.find(m => m._id === msg._id)) return prev;
              return [...prev, msg];
            });
          }
        });
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to load messages');
          setIsLoading(false);
        }
      }
    };

    fetchMessagesAndJoin();

    return () => {
      isMounted = false;
      if (socket) {
        socket.disconnect();
      }
    };
  }, [donationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const textToSend = newMessage.trim();
    setNewMessage(''); // optimistic clear
    
    try {
      await api.post(`/donations/${donationId}/messages`, { text: textToSend });
      // The message will come back via the socket 'new_message' event!
    } catch (err) {
      setError('Failed to send message. Please try again.');
      setNewMessage(textToSend); // revert text
    }
  };

  if (isLoading) {
    return <div className={`flex justify-center items-center h-48 bg-slate-50 rounded-lg ${className}`}><span className="text-slate-400 font-medium">Loading chat...</span></div>;
  }

  if (error) {
    return <div className={`p-4 bg-red-50 text-red-600 rounded-lg text-sm ${className}`}>{error}</div>;
  }

  return (
    <div className={`flex flex-col h-80 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-inner ${className}`}>
      {/* Disclaimer */}
      <div className="bg-amber-50 border-b border-amber-100 px-3 py-2 text-xs text-amber-800 text-center">
        For medical questions, please contact the hospital's medical staff directly.
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.length === 0 ? (
          <p className="text-center text-slate-400 text-sm mt-4">No messages yet. Start the conversation!</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId._id === currentUserId;
            return (
              <div key={msg._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] text-slate-500 mb-1 px-1">
                  {msg.senderId.firstName} {msg.senderId.lastName} ({msg.senderId.role === 'DONOR' ? 'Donor' : 'Hospital'})
                </span>
                <div 
                  className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                    isMe 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isJoined ? "Type your message..." : "Connecting..."}
          disabled={!isJoined}
          className="flex-1 border border-slate-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-slate-100"
        />
        <button 
          type="submit" 
          disabled={!isJoined || !newMessage.trim()}
          className="bg-primary hover:bg-primary-dark text-white rounded-full p-2 w-10 h-10 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
