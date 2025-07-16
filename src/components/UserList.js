import React from 'react';

const formatLastSeen = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return d.toLocaleString();
};

const UserList = ({ users, onDirectChat, currentUserId }) => (
  <ul className="space-y-2">
    {users.filter(u => u._id !== currentUserId).map(user => (
      <li key={user._id} className="flex items-center gap-2">
        <span className={`h-3 w-3 rounded-full ${user.online ? 'bg-green-400' : 'bg-gray-300'}`}></span>
        {user.avatar ? (
          <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover border" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-base font-bold text-white">{user.username[0]}</div>
        )}
        <span className="flex-1">
          {user.username}
          <div className="text-xs text-gray-500">
            {user.online ? 'Online' : user.lastSeen ? `Last seen ${formatLastSeen(user.lastSeen)}` : ''}
          </div>
        </span>
        <button className="text-xs text-blue-600 hover:underline" onClick={() => onDirectChat(user._id)}>
          Direct Chat
        </button>
      </li>
    ))}
  </ul>
);

export default UserList; 