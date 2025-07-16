import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ onSwitch, onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white rounded-xl shadow-md p-8 mt-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-purple-700">Login</h2>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 transition" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        {error && <div className="text-red-500 text-center text-sm">{error}</div>}
      </form>
      <div className="text-center mt-4">
        <span className="text-gray-500">Don't have an account? </span>
        <button className="text-blue-600 hover:underline" onClick={onSwitch}>Register</button>
      </div>
    </div>
  );
};

export default Login; 