import React, { useState } from 'react';
import axios from 'axios';

const Register = ({ onSwitch, onRegister }) => {
  const [username, setUsername] = useState('');
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
      await axios.post(`${API_BASE_URL}/auth/register`, { username, email, password });
      // Auto-login after register
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      onRegister(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-white rounded-xl shadow-md p-8 mt-8">
      <h2 className="text-2xl font-bold text-center mb-6 text-blue-700">Register</h2>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <input type="text" placeholder="Username" className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" value={username} onChange={e => setUsername(e.target.value)} required />
        <input type="email" placeholder="Email" className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" value={email} onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
        {error && <div className="text-red-500 text-center text-sm">{error}</div>}
      </form>
      <div className="text-center mt-4">
        <span className="text-gray-500">Already have an account? </span>
        <button className="text-purple-600 hover:underline" onClick={onSwitch}>Login</button>
      </div>
    </div>
  );
};

export default Register; 