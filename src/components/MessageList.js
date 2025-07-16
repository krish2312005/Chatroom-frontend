import React, { useRef, useEffect, useState } from 'react';
import { FaRegStar, FaStar } from 'react-icons/fa';

const MessageList = ({ messages, currentUserId, room, users, onStar, onUnstar, userId, onEdit, onDelete }) => {
  const bottomRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper to get checkmark status for a message
  const getCheckStatus = (msg) => {
    if (!room || !msg.deliveredTo || !msg.readBy) return 'sent';
    const otherMembers = (room.members || []).filter(m => (m._id || m.id) !== currentUserId).map(m => m._id || m.id);
    const allDelivered = otherMembers.every(uid => msg.deliveredTo.includes(uid));
    const allRead = otherMembers.every(uid => msg.readBy.includes(uid));
    if (allRead) return 'read';
    if (allDelivered) return 'delivered';
    return 'sent';
  };

  return (
    <div className="space-y-3">
      {messages.map(msg => {
        const isOwn = msg.sender._id === currentUserId;
        const checkStatus = isOwn ? getCheckStatus(msg) : null;
        const isStarred = (msg.starredBy || []).includes(userId);
        const isEditing = editingId === msg._id;
        return (
          <div key={msg._id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className="flex items-end gap-2 max-w-xs">
              {!isOwn && (
                msg.sender.avatar ? (
                  <img src={msg.sender.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-base font-bold text-white">{msg.sender.username[0]}</div>
                )
              )}
              <div className={`px-6 py-3 rounded-2xl shadow-lg text-base leading-relaxed ${isOwn ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-900'} relative transition-all duration-200`}>
                <div className="font-semibold mb-1 flex items-center justify-between">
                  {/* Only show sender name in group chats */}
                  {(!room?.isDirect || room?.isDirect === false) && <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{msg.sender.username}</span>}
                  <button
                    className="ml-2 text-yellow-500 hover:text-yellow-600 focus:outline-none"
                    title={isStarred ? 'Unstar' : 'Star'}
                    onClick={() => isStarred ? onUnstar(msg._id) : onStar(msg._id)}
                  >
                    {isStarred ? <FaStar /> : <FaRegStar />}
                  </button>
                  {isOwn && !isEditing && (
                    <>
                      <button
                        className="ml-2 text-xs text-blue-200 hover:text-white"
                        onClick={() => { setEditingId(msg._id); setEditValue(msg.content); }}
                        title="Edit"
                      >Edit</button>
                      <button
                        className="ml-1 text-xs text-red-200 hover:text-white"
                        onClick={() => window.confirm('Delete this message?') && onDelete(msg._id)}
                        title="Delete"
                      >Delete</button>
                    </>
                  )}
                </div>
                <div className="mt-1 mb-2 text-lg font-medium break-words">
                  {isEditing ? (
                    <form onSubmit={e => { e.preventDefault(); onEdit(msg._id, editValue); setEditingId(null); }} className="flex gap-2">
                      <input
                        className="flex-1 px-2 py-1 rounded border text-black"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="text-xs text-green-600 font-bold">Save</button>
                      <button type="button" className="text-xs text-gray-400" onClick={() => setEditingId(null)}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      {msg.content}
                      {msg.editedAt && <span className="text-xs italic ml-1">(edited)</span>}
                      {msg.fileUrl && !isEditing && (
                        msg.fileType && msg.fileType.startsWith('image/') ? (
                          <div className="mt-2">
                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                              <img src={msg.fileUrl} alt={msg.fileName || 'attachment'} className="max-w-[200px] max-h-[200px] rounded border" />
                            </a>
                            <div className="text-xs text-gray-500 mt-1">{msg.fileName}</div>
                          </div>
                        ) : (
                          <div className="mt-2">
                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                              {msg.fileName || 'Download file'}
                            </a>
                            <div className="text-xs text-gray-500 mt-1">{msg.fileType}</div>
                          </div>
                        )
                      )}
                    </>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-xs text-gray-300">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isOwn && (
                    <span className="ml-1">
                      {checkStatus === 'sent' && (
                        <span title="Sent">✔️</span>
                      )}
                      {checkStatus === 'delivered' && (
                        <span title="Delivered">✔️✔️</span>
                      )}
                      {checkStatus === 'read' && (
                        <span title="Read" style={{ color: '#4f46e5' }}>✔️✔️</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList; 