import React from 'react';

const RoomList = ({ rooms, selectedRoom, onSelectRoom, missedCalls = [] }) => (
  <ul className="space-y-2">
    {rooms.map(room => {
      const missedCount = missedCalls.filter(call => call.roomId === room._id).length;
      return (
        <li key={room._id} className="relative">
          <button
            className={`w-full text-left px-3 py-2 rounded-lg transition font-medium ${selectedRoom === room._id ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'}`}
            onClick={() => onSelectRoom(room._id)}
          >
            {room.isDirect ? `Direct: ${room.members.map(m => m.username).join(', ')}` : room.name}
            {missedCount > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5 ml-2">
                {missedCount}
              </span>
            )}
          </button>
        </li>
      );
    })}
  </ul>
);

export default RoomList; 