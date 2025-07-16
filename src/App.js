import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Register from './pages/Register';
import RoomList from './components/RoomList';
import UserList from './components/UserList';
import MessageList from './components/MessageList';
import { io } from 'socket.io-client';
import { FaRegStar, FaStar, FaPaperclip, FaBars, FaTimes } from 'react-icons/fa';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import CallModal from './components/CallModal';
import CallHistory from './components/CallHistory';

function App() {
  const [authPage, setAuthPage] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  let typingTimeout = useRef();
  const socketRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState("messages"); // or "users"
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeout = useRef();
  const [starredMessages, setStarredMessages] = useState([]);
  const [loadingStarred, setLoadingStarred] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef();
  const [attachment, setAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Add state for call feature
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState('video');
  const [callStatus, setCallStatus] = useState('');
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [callUser, setCallUser] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(true);
  const [callRoomId, setCallRoomId] = useState(null);
  const [callFromUserId, setCallFromUserId] = useState(null);
  // Add a new state to track the peer user ID for signaling
  const [peerUserId, setPeerUserId] = useState(null);
  // Add state for mute, camera, and call timer
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callStartTime, setCallStartTime] = useState(null);
  const [missedCalls, setMissedCalls] = useState([]);
  const [showCallHistory, setShowCallHistory] = useState(false);

  // Add ringtone audio object
  const ringtoneRef = useRef(null);
  useEffect(() => {
    ringtoneRef.current = new window.Audio('/ringtone.mp3');
    ringtoneRef.current.loop = true;
  }, []);

  // Unlock audio playback on first user interaction
  useEffect(() => {
    const unlockAudio = () => {
      const audio = new window.Audio();
      audio.play().catch(() => {});
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  // Persist login
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
  }, []);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';
  const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || '';

  // Connect/disconnect socket on login/logout
  useEffect(() => {
    if (!token) return;
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
    });
    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  // Join/leave room on selection
  useEffect(() => {
    if (!socketRef.current || !selectedRoom) return;
    socketRef.current.emit('joinRoom', selectedRoom);
    return () => {
      if (selectedRoom) socketRef.current.emit('leaveRoom', selectedRoom);
    };
  }, [selectedRoom]);

  // Listen for new messages
  useEffect(() => {
    if (!socketRef.current || !selectedRoom || !user) return;
    const handler = (msg) => {
      if (msg.room === selectedRoom || msg.room?._id === selectedRoom) {
        setMessages((prev) => {
          // If deleted, remove the message
          if (msg.deleted) {
            return prev.filter(m => m._id !== msg._id);
          }
          // If editing, update the message
          const exists = prev.find(m => m._id === msg._id);
          if (exists) {
            return prev.map(m => m._id === msg._id ? { ...m, ...msg } : m);
          }
          // Otherwise, add new message
          return [...prev, msg];
        });
        // Emit delivered event for this message
        if (user && msg.sender && msg.sender._id !== (user.id || user._id)) {
          socketRef.current.emit('message:delivered', {
            messageId: msg._id,
            userId: user.id || user._id,
            roomId: selectedRoom,
          });
        }
      }
    };
    socketRef.current.on('newMessage', handler);
    return () => {
      socketRef.current.off('newMessage', handler);
    };
  }, [selectedRoom, user]);

  // Listen for delivered/read events
  useEffect(() => {
    if (!socketRef.current) return;
    const handleDelivered = ({ messageId, userId }) => {
      setMessages((prev) => prev.map(m => m._id === messageId && !m.deliveredTo.includes(userId)
        ? { ...m, deliveredTo: [...m.deliveredTo, userId] } : m));
    };
    const handleRead = ({ messageId, userId }) => {
      setMessages((prev) => prev.map(m => m._id === messageId && !m.readBy.includes(userId)
        ? { ...m, readBy: [...m.readBy, userId] } : m));
    };
    socketRef.current.on('message:delivered', handleDelivered);
    socketRef.current.on('message:read', handleRead);
    return () => {
      socketRef.current.off('message:delivered', handleDelivered);
      socketRef.current.off('message:read', handleRead);
    };
  }, []);

  // Emit read event for visible messages
  useEffect(() => {
    if (!socketRef.current || !selectedRoom || !messages.length || !user) return;
    // Find messages not yet marked as read by this user
    messages.forEach(msg => {
      if (
        msg.sender._id !== (user.id || user._id) &&
        (!msg.readBy || !msg.readBy.includes(user.id || user._id))
      ) {
        socketRef.current.emit('message:read', {
          messageId: msg._id,
          userId: user.id || user._id,
          roomId: selectedRoom,
        });
      }
    });
  }, [messages, selectedRoom, user]);

  // Listen for typing events
  useEffect(() => {
    if (!socketRef.current || !selectedRoom || !user) return;
    const handleTyping = ({ userId, roomId }) => {
      if (roomId === selectedRoom && userId !== (user.id || user._id)) {
        setTypingUsers((prev) => [...new Set([...prev, userId])]);
      }
    };
    const handleStopTyping = ({ userId, roomId }) => {
      if (roomId === selectedRoom && userId !== (user.id || user._id)) {
        setTypingUsers((prev) => prev.filter((id) => id !== userId));
      }
    };
    socketRef.current.on('typing', handleTyping);
    socketRef.current.on('stopTyping', handleStopTyping);
    return () => {
      socketRef.current.off('typing', handleTyping);
      socketRef.current.off('stopTyping', handleStopTyping);
    };
  }, [selectedRoom, user]);

  // Listen for user online/offline/last seen status updates
  useEffect(() => {
    if (!socketRef.current) return;
    const handleUserStatus = ({ userId, online, lastSeen }) => {
      setUsers(prev => prev.map(u =>
        (u._id === userId)
          ? { ...u, online, lastSeen }
          : u
      ));
    };
    socketRef.current.on('user:status', handleUserStatus);
    return () => {
      socketRef.current.off('user:status', handleUserStatus);
    };
  }, []);

  // Fetch rooms and users after login
  useEffect(() => {
    if (!token) return;
    setLoadingRooms(true);
    setLoadingUsers(true);
    axios.get(`${API_BASE_URL}/rooms`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        setRooms(res.data);
        if (res.data.length > 0) setSelectedRoom(res.data[0]._id);
      })
      .finally(() => setLoadingRooms(false));
    axios.get(`${API_BASE_URL}/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUsers(res.data))
      .finally(() => setLoadingUsers(false));
  }, [token]);

  // Fetch messages when selectedRoom changes
  useEffect(() => {
    if (!token || !selectedRoom) return;
    setLoadingMessages(true);
    axios.get(`${API_BASE_URL}/messages/${selectedRoom}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setMessages(res.data))
      .finally(() => setLoadingMessages(false));
  }, [token, selectedRoom]);

  // Fetch starred messages when selectedRoom changes
  useEffect(() => {
    if (!token || !selectedRoom) return;
    setLoadingStarred(true);
    axios.get(`${API_BASE_URL}/messages/${selectedRoom}/starred`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setStarredMessages(res.data))
      .finally(() => setLoadingStarred(false));
  }, [token, selectedRoom, messages]);

  // Star/unstar message handlers
  const handleStarMessage = async (msgId) => {
    if (!user) return;
    await axios.post(`${API_BASE_URL}/messages/${msgId}/star`, {}, { headers: { Authorization: `Bearer ${token}` } });
    // Refetch starred messages
    const res = await axios.get(`${API_BASE_URL}/messages/${selectedRoom}/starred`, { headers: { Authorization: `Bearer ${token}` } });
    setStarredMessages(res.data);
    // Optionally update messages state
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, starredBy: [...(m.starredBy || []), user.id || user._id] } : m));
  };
  const handleUnstarMessage = async (msgId) => {
    if (!user) return;
    await axios.post(`${API_BASE_URL}/messages/${msgId}/unstar`, {}, { headers: { Authorization: `Bearer ${token}` } });
    // Refetch starred messages
    const res = await axios.get(`${API_BASE_URL}/messages/${selectedRoom}/starred`, { headers: { Authorization: `Bearer ${token}` } });
    setStarredMessages(res.data);
    // Optionally update messages state
    setMessages(prev => prev.map(m => m._id === msgId ? { ...m, starredBy: (m.starredBy || []).filter(id => id !== (user.id || user._id)) } : m));
  };

  // Handle search input
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    setSearching(true);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        let res;
        if (searchMode === "messages") {
          res = await axios.get(`${API_BASE_URL}/messages/search?q=${encodeURIComponent(searchQuery)}${selectedRoom ? `&roomId=${selectedRoom}` : ''}`, { headers: { Authorization: `Bearer ${token}` } });
        } else {
          res = await axios.get(`${API_BASE_URL}/users/search?q=${encodeURIComponent(searchQuery)}`, { headers: { Authorization: `Bearer ${token}` } });
        }
        setSearchResults(res.data);
        setShowSearchResults(true);
      } catch (err) {
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery, searchMode, selectedRoom, token]);

  // Handle clicking a search result
  const handleSearchResultClick = (result) => {
    setShowSearchResults(false);
    setSearchQuery("");
    setSearchResults([]);
    if (searchMode === "messages") {
      // Jump to the room and scroll to the message
      setSelectedRoom(result.room._id || result.room);
      // Optionally, scroll to message in chat (requires ref/scroll logic)
    } else {
      // Open direct chat with user
      handleDirectChat(result._id);
    }
  };

  const handleLogin = (user, token) => {
    setUser(user);
    setToken(token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const handleSelectRoom = (roomId) => {
    setSelectedRoom(roomId);
  };

  const handleDirectChat = async (userId) => {
    // Create or get direct room
    try {
      const res = await axios.post(`${API_BASE_URL}/rooms/direct`, { userId }, { headers: { Authorization: `Bearer ${token}` } });
      if (!rooms.find(r => r._id === res.data._id)) {
        setRooms(prev => [...prev, res.data]);
      }
      setSelectedRoom(res.data._id);
    } catch (err) {
      // handle error
    }
  };

  // Handle file input change
  const handleAttachmentChange = (e) => {
    const file = e.target.files[0];
    if (file) setAttachment(file);
    // Reset input value so the same file can be selected again
    e.target.value = '';
  };

  // Send message or attachment
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!messageInput.trim() && !attachment) || !selectedRoom) return;
    setSending(true);
    try {
      if (attachment) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', attachment);
        const res = await axios.post(`${API_BASE_URL}/messages/${selectedRoom}/attachment`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        setAttachment(null);
        setUploading(false);
        // Add the new message to the chat
        setMessages((prev) => [...prev, res.data]);
        // Emit to other users via Socket.IO
        if (socketRef.current) {
          socketRef.current.emit('newMessage', res.data);
        }
      } else {
        socketRef.current.emit('sendMessage', { roomId: selectedRoom, content: messageInput });
      }
      setMessageInput('');
    } catch (err) {
      // Optionally handle error
      setUploading(false);
    }
    setSending(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const res = await axios.post(`${API_BASE_URL}/users/avatar`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setUser((prev) => ({ ...prev, avatar: res.data.avatar }));
      localStorage.setItem('user', JSON.stringify({ ...user, avatar: res.data.avatar }));
    } catch (err) {
      // Optionally handle error
    }
  };

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    if (!socketRef.current || !selectedRoom) return;
    socketRef.current.emit('typing', selectedRoom);
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socketRef.current.emit('stopTyping', selectedRoom);
    }, 1500);
  };

  // Insert emoji at cursor position
  const handleEmojiSelect = (emoji) => {
    const input = inputRef.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const newValue = messageInput.slice(0, start) + emoji.native + messageInput.slice(end);
    setMessageInput(newValue);
    setShowEmojiPicker(false);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.native.length, start + emoji.native.length);
    }, 0);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName || groupMembers.length === 0) return;
    setCreatingGroup(true);
    try {
      const res = await axios.post(
        `${API_BASE_URL}/rooms`,
        { name: groupName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Add selected members (except self)
      for (const memberId of groupMembers) {
        if (memberId !== (user.id || user._id)) {
          await axios.post(
            `${API_BASE_URL}/rooms/${res.data._id}/add-member`,
            { userId: memberId },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }
      setRooms((prev) => [...prev, { ...res.data, members: [user, ...users.filter(u => groupMembers.includes(u._id))] }]);
      setShowGroupModal(false);
      setGroupName("");
      setGroupMembers([]);
    } catch (err) {
      // Optionally handle error
    } finally {
      setCreatingGroup(false);
    }
  };

  const isGroupRoom = rooms.find(r => r._id === selectedRoom)?.isDirect === false;
  const selectedRoomObj = rooms.find(r => r._id === selectedRoom);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const handleAddMembers = async (memberIds) => {
    for (const memberId of memberIds) {
      await axios.post(`${API_BASE_URL}/rooms/${selectedRoom}/add-member`, { userId: memberId }, { headers: { Authorization: `Bearer ${token}` } });
    }
    // Refetch rooms to update members
    const res = await axios.get(`${API_BASE_URL}/rooms`, { headers: { Authorization: `Bearer ${token}` } });
    setRooms(res.data);
    setShowAddMembers(false);
  };

  const handleRemoveMember = async (memberId) => {
    await axios.post(`${API_BASE_URL}/rooms/${selectedRoom}/remove-member`, { userId: memberId }, { headers: { Authorization: `Bearer ${token}` } });
    // Refetch rooms to update members
    const res = await axios.get(`${API_BASE_URL}/rooms`, { headers: { Authorization: `Bearer ${token}` } });
    setRooms(res.data);
  };

  // Responsive sidebar toggle
  const handleSidebarToggle = () => setSidebarOpen((v) => !v);
  const handleSidebarClose = () => setSidebarOpen(false);

  // Scroll chat area to bottom on room change or new messages
  const chatAreaRef = useRef();
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [selectedRoom, messages]);

  // --- WebRTC and Socket.IO call logic ---
  useEffect(() => {
    if (!socketRef.current) return;

    // Incoming call
    socketRef.current.on('call:incoming', async ({ from, roomId, callType }) => {
      let userInfo = { username: 'Unknown', avatar: null };
      try {
        const res = await axios.get(`${SOCKET_URL}/api/users/${from}`, { headers: { Authorization: `Bearer ${token}` } });
        userInfo = res.data;
      } catch (err) {
        // fallback user info
        console.error('Failed to fetch user info for incoming call:', from, err);
      }
      setCallUser(userInfo);
      setCallType(callType);
      setIsVideoCall(callType === 'video');
      setCallRoomId(roomId);
      setCallFromUserId(from);
      setIsIncomingCall(true);
      setCallModalOpen(true);
      setCallStatus('Incoming call...');
      setPeerUserId(from);
      // Play ringtone for incoming call
      if (ringtoneRef.current) {
        ringtoneRef.current.currentTime = 0;
        ringtoneRef.current.play().catch(() => {});
      }
    });

    // Call accepted
    socketRef.current.on('call:accepted', async ({ from, roomId }) => {
      setCallStatus('Call accepted. Connecting...');
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      await startWebRTCCall(true); // true = isCaller
    });

    // Call rejected
    socketRef.current.on('call:rejected', () => {
      setCallStatus('Call rejected');
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      setTimeout(() => setCallModalOpen(false), 1500);
    });

    // Call ended
    socketRef.current.on('call:ended', () => {
      setCallStatus('Call ended');
      if (ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
      }
      cleanupCall();
      setTimeout(() => setCallModalOpen(false), 1000);
    });

    // WebRTC signaling
    socketRef.current.on('call:signal', async ({ from, data }) => {
      if (!peerConnection) return;
      if (data.type === 'offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socketRef.current.emit('call:signal', { targetUserId: from, data: answer });
      } else if (data.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.candidate) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // Missed call event
    socketRef.current.on('call:missed', ({ from, roomId, callType }) => {
      // Add missed call to state (for notification and call history)
      setMissedCalls(prev => [
        ...prev,
        {
          from,
          roomId,
          callType,
          timestamp: new Date(),
        },
      ]);
      // Optionally, show a toast or badge in chat list/window
      // TODO: Implement missed call notification UI
    });

    return () => {
      socketRef.current.off('call:incoming');
      socketRef.current.off('call:accepted');
      socketRef.current.off('call:rejected');
      socketRef.current.off('call:ended');
      socketRef.current.off('call:signal');
      socketRef.current.off('call:missed');
    };
  // eslint-disable-next-line
  }, [peerConnection, token]);

  // Start a call (audio/video)
  const startCall = async (type) => {
    if (!selectedRoomObj) return;
    const isDirect = selectedRoomObj.isDirect;
    let targetUserId = null;
    if (isDirect) {
      targetUserId = selectedRoomObj.members.find(m => (m._id || m.id) !== (user._id || user.id))._id;
    } else {
      // For group calls, you may want to call all other members
      // For now, just pick the first other member
      targetUserId = selectedRoomObj.members.find(m => (m._id || m.id) !== (user._id || user.id))._id;
    }
    setCallType(type);
    setIsVideoCall(type === 'video');
    setCallUser(selectedRoomObj.isDirect
      ? selectedRoomObj.members.find(m => (m._id || m.id) !== (user._id || user.id))
      : { username: selectedRoomObj.name });
    setCallRoomId(selectedRoom);
    setIsIncomingCall(false);
    setCallModalOpen(true);
    setCallStatus('Calling...');
    setPeerUserId(targetUserId);
    socketRef.current.emit('call:request', {
      targetUserId,
      roomId: selectedRoom,
      callType: type,
    });
  };

  // Accept call
  const handleAcceptCall = async () => {
    if (!callFromUserId || !callRoomId) return;
    setCallStatus('Connecting...');
    socketRef.current.emit('call:accept', {
      targetUserId: peerUserId,
      roomId: callRoomId,
    });
    await startWebRTCCall(false); // false = not caller
  };

  // Reject call
  const handleRejectCall = () => {
    if (callFromUserId && callRoomId) {
      socketRef.current.emit('call:reject', {
        targetUserId: peerUserId,
        roomId: callRoomId,
      });
    }
    setCallStatus('Rejected');
    setTimeout(() => setCallModalOpen(false), 1000);
    cleanupCall();
  };

  // End call
  const handleEndCall = () => {
    if (callFromUserId && callRoomId) {
      socketRef.current.emit('call:end', {
        targetUserId: peerUserId,
        roomId: callRoomId,
      });
    }
    setCallStatus('Ended');
    setTimeout(() => setCallModalOpen(false), 1000);
    cleanupCall();
  };

  // WebRTC setup
  const startWebRTCCall = async (isCaller) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });
    setPeerConnection(pc);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true,
      });
      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    } catch (err) {
      setCallStatus('Could not access media devices');
      return;
    }
    // Collect remote tracks into a MediaStream
    const remoteMediaStream = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        if (!remoteMediaStream.getTracks().includes(track)) {
          remoteMediaStream.addTrack(track);
        }
      });
      // Only set remote stream if it's not the local stream
      if (remoteMediaStream.id !== stream.id) {
        setRemoteStream(remoteMediaStream);
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate && peerUserId) {
        socketRef.current.emit('call:signal', {
          targetUserId: peerUserId,
          data: { candidate: event.candidate },
        });
      }
    };
    if (isCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('call:signal', {
        targetUserId: peerUserId,
        data: offer,
      });
    }
  };

  // Cleanup call
  const cleanupCall = () => {
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    setCallUser(null);
    setCallRoomId(null);
    setCallFromUserId(null);
    setIsIncomingCall(false);
    setPeerUserId(null); // Reset peerUserId
  };

  // Render CallModal
  const handleCallSignal = async (signal) => {
    if (!callUser || !callRoomId) return;
    try {
      await axios.post(`${API_BASE_URL}/call/signal`, {
        fromUserId: user.id || user._id,
        toUserId: callUser._id,
        roomId: callRoomId,
        signal: signal,
      }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) {
      console.error('Error sending signal:', err);
    }
  };

  // Handlers for mute/unmute and camera on/off
  const handleToggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(m => !m);
    }
  };
  const handleToggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = isCameraOff;
      });
      setIsCameraOff(c => !c);
    }
  };

  // When both localStream and remoteStream are available, set callStartTime if not already set
  useEffect(() => {
    if (localStream && remoteStream && !callStartTime) {
      setCallStartTime(Date.now());
    }
    if ((!localStream || !remoteStream) && callStartTime) {
      setCallStartTime(null);
    }
  }, [localStream, remoteStream]);

  // Play ringtone on incoming call, stop on accept/reject/end
  useEffect(() => {
    if (callModalOpen && isIncomingCall && callStatus && callStatus.toLowerCase().includes('incoming')) {
      ringtoneRef.current && ringtoneRef.current.play();
    } else {
      ringtoneRef.current && ringtoneRef.current.pause();
      ringtoneRef.current && (ringtoneRef.current.currentTime = 0);
    }
  }, [callModalOpen, isIncomingCall, callStatus]);

  // Stop ringtone when modal closes
  useEffect(() => {
    if (!callModalOpen && ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, [callModalOpen]);

  // Clear missed calls for a room when selected
  useEffect(() => {
    if (!selectedRoom) return;
    setMissedCalls(prev => prev.filter(call => call.roomId !== selectedRoom));
  }, [selectedRoom]);

  // Edit message handler
  const handleEditMessage = async (msgId, newContent) => {
    try {
      const res = await axios.put(`${API_BASE_URL}/messages/${msgId}`, { content: newContent }, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, content: res.data.message.content, editedAt: res.data.message.editedAt } : m));
      // Emit real-time update
      if (socketRef.current) {
        socketRef.current.emit('newMessage', { ...res.data.message, room: selectedRoom });
      }
    } catch (err) {
      alert('Failed to edit message');
    }
  };
  // Delete message handler
  const handleDeleteMessage = async (msgId) => {
    try {
      await axios.delete(`${API_BASE_URL}/messages/${msgId}`, { headers: { Authorization: `Bearer ${token}` } });
      setMessages(prev => prev.filter(m => m._id !== msgId));
      if (socketRef.current) {
        socketRef.current.emit('newMessage', { _id: msgId, deleted: true, room: selectedRoom });
      }
    } catch (err) {
      // Show the backend error message and stack if available
      const backendMsg = err.response?.data?.message;
      const backendStack = err.response?.data?.stack;
      alert(
        'Failed to delete message: ' +
        (backendMsg ? backendMsg : err.message) +
        (backendStack ? '\n' + backendStack : '')
      );
    }
  };

  if (!user) {
    return authPage === 'login' ? (
      <Login onSwitch={() => setAuthPage('register')} onLogin={handleLogin} />
    ) : (
      <Register onSwitch={() => setAuthPage('login')} onRegister={handleLogin} />
    );
  }

  return (
    <div className="w-screen h-screen flex bg-white">
      <div className="flex flex-row w-full h-full overflow-hidden">
        {/* Sidebar for user list and rooms */}
        <aside className={`fixed md:static top-0 left-0 h-full w-full md:w-80 md:max-w-xs bg-white md:border-r md:border-gray-200 flex-shrink-0 flex flex-col overflow-y-auto px-6 py-8 z-40 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <div className="md:hidden flex justify-end mb-4">
            <button className="text-2xl text-gray-500" onClick={handleSidebarClose}><FaTimes /></button>
          </div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-purple-700 mb-2">Chat Rooms</h2>
            <button className="mb-2 w-full bg-green-500 text-white py-2 rounded-lg font-semibold hover:bg-green-600 transition" onClick={() => setShowGroupModal(true)}>
              + Create Group
            </button>
            {/* Modern Search Bar */}
            <div className="mb-4 relative">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder={`Search ${searchMode === 'messages' ? 'messages' : 'users'}...`}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                />
              </div>
              {/* Search Results Dropdown/Modal */}
              {showSearchResults && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searching ? (
                    <div className="p-4 text-center text-gray-400">Searching...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">No results found</div>
                  ) : searchMode === 'messages' ? (
                    searchResults.map(msg => (
                      <div
                        key={msg._id}
                        className="p-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleSearchResultClick(msg)}
                      >
                        <div className="text-xs text-gray-500 mb-1">{msg.sender?.username} in Room {msg.room?.name || msg.room}</div>
                        <div className="text-sm">
                          {msg.content.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
                            part.toLowerCase() === searchQuery.toLowerCase() ? <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark> : part
                          )}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{new Date(msg.createdAt).toLocaleString()}</div>
                      </div>
                    ))
                  ) : (
                    searchResults.map(u => (
                      <div
                        key={u._id}
                        className="p-3 hover:bg-purple-50 cursor-pointer border-b last:border-b-0 flex items-center gap-2"
                        onClick={() => handleSearchResultClick(u)}
                      >
                        {u.avatar ? (
                          <img src={u.avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover border" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">{u.username[0]}</div>
                        )}
                        <div>
                          <div className="font-semibold">{u.username}</div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            {/* End Search Bar */}
            {loadingRooms ? <div className="text-gray-400">Loading...</div> :
              <RoomList
                rooms={rooms}
                selectedRoom={selectedRoom}
                onSelectRoom={handleSelectRoom}
                missedCalls={missedCalls}
              />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-blue-700 mb-2">Users</h2>
            {loadingUsers ? <div className="text-gray-400">Loading...</div> :
              <UserList users={users} onDirectChat={handleDirectChat} currentUserId={user.id || user._id} />}
          </div>
          {/* In the sidebar, below the user list, show group members if a group room is selected */}
          {isGroupRoom && selectedRoomObj && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-green-700">Group Members</h3>
                <button className="text-xs text-blue-600 hover:underline" onClick={() => setShowAddMembers(true)}>+ Add</button>
              </div>
              <ul className="space-y-2">
                {selectedRoomObj.members.map(m => (
                  <li key={m._id || m.id} className="flex items-center gap-2">
                    {m.avatar ? (
                      <img src={m.avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover border" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">{m.username[0]}</div>
                    )}
                    <span className="flex-1">{m.username}</span>
                    {(m._id || m.id) !== (user._id || user.id) && (
                      <button className="text-xs text-red-500 hover:underline" onClick={() => handleRemoveMember(m._id || m.id)}>Remove</button>
                    )}
                  </li>
                ))}
              </ul>
              {/* Add members modal */}
              {showAddMembers && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4">Add Members</h2>
                    <form onSubmit={e => { e.preventDefault(); handleAddMembers(Array.from(e.target.elements).filter(el => el.checked).map(el => el.value)); }} className="flex flex-col gap-4">
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {users.filter(u => !selectedRoomObj.members.some(m => (m._id || m.id) === u._id)).map(u => (
                          <label key={u._id} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" value={u._id} />
                            {u.avatar ? (
                              <img src={u.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover border" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">{u.username[0]}</div>
                            )}
                            <span>{u.username}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button type="button" className="px-4 py-2 rounded-lg bg-gray-200" onClick={() => setShowAddMembers(false)}>Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-lg bg-green-500 text-white font-semibold">Add</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Starred Messages Section */}
          <div className="mt-6">
            <h3 className="text-lg font-bold text-yellow-600 mb-2 flex items-center gap-2"><FaStar className="inline text-yellow-400" /> Starred Messages</h3>
            {loadingStarred ? (
              <div className="text-gray-400">Loading...</div>
            ) : starredMessages.length === 0 ? (
              <div className="text-gray-400 text-sm">No starred messages in this room.</div>
            ) : (
              <ul className="space-y-2 max-h-40 overflow-y-auto">
                {starredMessages.map(msg => (
                  <li key={msg._id} className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm flex flex-col">
                    <span className="font-semibold text-yellow-800">{msg.sender?.username}</span>
                    <span>{msg.content}</span>
                    <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            className="w-full py-2 bg-purple-600 text-white font-semibold rounded-lg mt-4 hover:bg-purple-700 transition"
            onClick={() => setShowCallHistory(true)}
          >
            View Call History
          </button>
        </aside>
        {/* Overlay for mobile sidebar */}
        {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-30 z-30 md:hidden" onClick={handleSidebarClose}></div>}
        {/* Main chat area */}
        <main className="flex-1 flex flex-col h-full min-w-0 bg-gray-50 md:relative">
          {/* Mobile header */}
          <div className="md:hidden flex flex-col px-4 py-3 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <button className="text-2xl text-purple-700" onClick={handleSidebarToggle}><FaBars /></button>
              <span className="text-lg font-bold text-purple-700">MERN Chat</span>
              <div className="w-8" />
            </div>
            {selectedRoomObj && (
              <div className="mt-2 flex items-center gap-3">
                {/* Avatar */}
                {selectedRoomObj.isDirect ? (
                  (() => {
                    const other = selectedRoomObj.members.find(m => (m._id || m.id) !== (user._id || user.id));
                    return other ? (
                      <>
                        {other.avatar ? (
                          <img src={other.avatar} alt="avatar" className="w-9 h-9 rounded-full object-cover border" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-base font-bold text-white">{other.username[0]}</div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-gray-900 text-base truncate">{other.username}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            {other.online ? (
                              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>Online</span>
                            ) : (
                              other.lastSeen ? `last seen ${new Date(other.lastSeen).toLocaleString()}` : 'offline'
                            )}
                          </span>
                        </div>
                      </>
                    ) : null;
                  })()
                ) : (
                  <>
                    {/* Group icon */}
                    <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-lg font-bold text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-7a4 4 0 11-8 0 4 4 0 018 0zm6 6a2 2 0 11-4 0 2 2 0 014 0zm-14 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-gray-900 text-base truncate">{selectedRoomObj.name}</span>
                      <span className="text-xs text-gray-500">Group chat</span>
                    </div>
                  </>
                )}
                {/* Call buttons */}
                <div className="flex gap-2 ml-2">
                  <button onClick={() => startCall('audio')} className="bg-gray-100 hover:bg-purple-100 text-purple-700 rounded-full p-2 text-lg" title="Audio Call">📞</button>
                  <button onClick={() => startCall('video')} className="bg-gray-100 hover:bg-purple-100 text-purple-700 rounded-full p-2 text-lg" title="Video Call">🎥</button>
                </div>
              </div>
            )}
          </div>
          {/* Desktop header */}
          <div className="hidden md:flex mb-6 justify-between items-center px-6 py-4 bg-white border-b border-gray-200">
            {selectedRoomObj && (
              <div className="flex items-center gap-4">
                {/* Avatar and name/status */}
                {selectedRoomObj.isDirect ? (
                  (() => {
                    const other = selectedRoomObj.members.find(m => (m._id || m.id) !== (user._id || user.id));
                    return other ? (
                      <>
                        {other.avatar ? (
                          <img src={other.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold text-white">{other.username[0]}</div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-gray-900 text-base truncate">{other.username}</span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            {other.online ? (
                              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>Online</span>
                            ) : (
                              other.lastSeen ? `last seen ${new Date(other.lastSeen).toLocaleString()}` : 'offline'
                            )}
                          </span>
                        </div>
                      </>
                    ) : null;
                  })()
                ) : (
                  <>
                    {/* Group icon */}
                    <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-lg font-bold text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m9-7a4 4 0 11-8 0 4 4 0 018 0zm6 6a2 2 0 11-4 0 2 2 0 014 0zm-14 0a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-gray-900 text-base truncate">{selectedRoomObj.name}</span>
                      <span className="text-xs text-gray-500">Group chat</span>
                    </div>
                  </>
                )}
                {/* Call buttons */}
                <div className="flex gap-2 ml-4">
                  <button onClick={() => startCall('audio')} className="bg-gray-100 hover:bg-purple-100 text-purple-700 rounded-full p-2 text-xl" title="Audio Call">📞</button>
                  <button onClick={() => startCall('video')} className="bg-gray-100 hover:bg-purple-100 text-purple-700 rounded-full p-2 text-xl" title="Video Call">🎥</button>
                </div>
              </div>
            )}
            {/* Top right logout button */}
            <button
              className="absolute top-6 right-8 bg-red-600 text-white font-semibold rounded-lg px-5 py-2 shadow-lg hover:bg-red-700 transition text-base tracking-wide z-50"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
          <div ref={chatAreaRef} className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto min-h-0">
            {loadingMessages ? (
              <div className="text-gray-400 text-center">Loading messages...</div>
            ) : (
              <MessageList
                messages={messages}
                currentUserId={user ? (user.id || user._id) : undefined}
                room={selectedRoomObj}
                users={users}
                onStar={handleStarMessage}
                onUnstar={handleUnstarMessage}
                userId={user ? (user.id || user._id) : undefined}
                onEdit={handleEditMessage}
                onDelete={handleDeleteMessage}
              />
            )}
            {typingUsers.length > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {typingUsers.length === 1 ? 'Someone is typing...' : 'Multiple people are typing...'}
              </div>
            )}
          </div>
          <form className="flex gap-3 items-center px-4 md:px-6 py-4 bg-white border-t border-gray-200" style={{ marginBottom: 0, marginTop: 0 }} onSubmit={handleSendMessage}>
            <div className="relative flex items-center w-full">
              <button
                type="button"
                className="px-2 text-2xl focus:outline-none"
                onClick={() => setShowEmojiPicker(v => !v)}
                tabIndex={-1}
              >
                😊
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-12 left-0 z-50">
                  <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" />
                </div>
              )}
              <label className="px-2 text-2xl cursor-pointer">
                <FaPaperclip />
                <input type="file" className="hidden" onChange={handleAttachmentChange} disabled={uploading || sending} />
              </label>
              {attachment && (
                <span className="ml-2 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                  {attachment.name}
                  <button type="button" className="ml-1 text-red-500" onClick={() => setAttachment(null)}>&times;</button>
                </span>
              )}
              <input
                ref={inputRef}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 md:px-4 md:py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm md:text-base"
                placeholder="Type your message..."
                value={messageInput}
                onChange={handleInputChange}
                disabled={sending || !selectedRoom || uploading}
              />
              <button
                className="bg-purple-600 text-white px-4 md:px-6 py-2 rounded-lg font-semibold hover:bg-purple-700 transition text-sm md:text-base"
                disabled={sending || !selectedRoom || (!messageInput.trim() && !attachment) || uploading}
                type="submit"
              >
                {uploading ? 'Uploading...' : sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </main>
      </div>
      {/* Group creation modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Group</h2>
            <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
              <input
                className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                placeholder="Group Name"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                required
              />
              <div>
                <div className="mb-2 font-semibold">Add Members:</div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {users.filter(u => (u._id || u.id) !== (user._id || user.id)).map(u => (
                    <label key={u._id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupMembers.includes(u._id)}
                        onChange={e => {
                          if (e.target.checked) setGroupMembers(prev => [...prev, u._id]);
                          else setGroupMembers(prev => prev.filter(id => id !== u._id));
                        }}
                      />
                      {u.avatar ? (
                        <img src={u.avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover border" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-white">{u.username[0]}</div>
                      )}
                      <span>{u.username}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" className="px-4 py-2 rounded-lg bg-gray-200" onClick={() => setShowGroupModal(false)}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-green-500 text-white font-semibold" disabled={creatingGroup}>{creatingGroup ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Render CallModal */}
      <CallModal
        open={callModalOpen}
        callType={callType}
        user={callUser}
        isIncoming={isIncomingCall}
        isVideo={isVideoCall}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        onEnd={handleEndCall}
        localStream={localStream}
        remoteStream={remoteStream}
        status={callStatus}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        callStartTime={callStartTime}
      />
      {showCallHistory && (
        <CallHistory
          token={token}
          userId={user.id || user._id}
          onClose={() => setShowCallHistory(false)}
        />
      )}
    </div>
  );
}

export default App;
