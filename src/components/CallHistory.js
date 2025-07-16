import React, { useEffect, useState } from 'react';
import axios from 'axios';

const CallHistory = ({ token, userId, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    axios.get(`${API_BASE_URL}/calls/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => setHistory(res.data))
      .catch(err => {
        setError(err.response?.data?.message || err.message || 'Unknown error');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const getTypeLabel = (log) => {
    if (log.status === 'missed') return 'Missed';
    if (log.caller._id === userId) return 'Outgoing';
    return 'Incoming';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">Call History</h2>
        {error && (
          <div className="text-red-500 mb-2">Error: {error}</div>
        )}
        {loading ? (
          <div>Loading...</div>
        ) : history.length === 0 ? (
          <div className="text-gray-400">No call history.</div>
        ) : (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {history.map(log => (
              <li key={log._id} className="py-3 flex items-center">
                <img src={log.caller._id === userId ? log.callee.avatar : log.caller.avatar} alt="avatar" className="w-10 h-10 rounded-full mr-3 object-cover" />
                <div className="flex-1">
                  <div className="font-medium">
                    {log.caller._id === userId ? log.callee.username : log.caller.username}
                  </div>
                  <div className="text-xs text-gray-500">
                    {getTypeLabel(log)} {log.callType === 'video' ? 'Video' : 'Audio'}
                  </div>
                </div>
                <div className={`text-xs font-semibold ml-2 ${log.status === 'missed' ? 'text-red-500' : 'text-gray-500'}`}>{getTypeLabel(log)}</div>
                <div className="text-xs text-gray-400 ml-4">{new Date(log.startedAt).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CallHistory; 