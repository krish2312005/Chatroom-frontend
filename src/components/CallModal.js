import React, { useEffect, useState, useRef } from 'react';

export default function CallModal({
  open,
  callType = 'video',
  user = {},
  isIncoming = false,
  isVideo = true,
  onAccept,
  onReject,
  onEnd,
  localStream,
  remoteStream,
  status = '',
  isMuted = false,
  isCameraOff = false,
  onToggleMute,
  onToggleCamera,
  callStartTime,
}) {
  // Move hooks to the top, before any return
  const [elapsed, setElapsed] = useState(0);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!callStartTime || !(localStream && remoteStream)) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [callStartTime, localStream, remoteStream]);
  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2, '0')}:${String(s%60).padStart(2, '0')}`;

  if (!open) return null;
  const avatar = user && user.avatar;
  const username = user && user.username;
  // Only show status if remoteStream is not available (not yet connected)
  const showStatus = status && !(localStream && remoteStream);
  // Show Accept/Reject if incoming and not yet connected
  const showAcceptReject = isIncoming && !(localStream && remoteStream);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="w-full h-full flex flex-col justify-center items-center relative">
        {/* Avatar and name (overlay, top left) */}
        <div className="absolute top-6 left-6 flex items-center gap-3 bg-white bg-opacity-80 rounded-lg px-4 py-2 shadow">
          {avatar ? (
            <img src={avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover border" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-xl font-bold text-white">{username ? username[0] : '?'}</div>
          )}
          <div>
            <div className="font-semibold text-lg truncate">{username || 'Unknown'}</div>
            <div className="text-xs text-gray-500">{callType === 'video' ? 'Video Call' : 'Voice Call'}</div>
          </div>
        </div>
        {/* Call timer (top right) */}
        {callStartTime && (localStream && remoteStream) && (
          <div className="absolute top-6 right-6 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg font-mono text-lg shadow">
            {formatTime(elapsed)}
          </div>
        )}
        {/* Video streams */}
        {isVideo && (
          <div className="w-full h-full flex justify-center items-center">
            {/* Remote video fullscreen */}
            {remoteStream && (
              <video
                autoPlay
                playsInline
                ref={remoteVideoRef}
                className="w-full h-full max-w-3xl max-h-[80vh] bg-black rounded-xl border object-cover shadow-xl"
              />
            )}
            {/* Local video small overlay */}
            {localStream && (
              <video
                autoPlay
                playsInline
                muted
                ref={localVideoRef}
                className="w-32 h-24 bg-black rounded border object-cover absolute bottom-8 right-8 shadow-lg"
              />
            )}
          </div>
        )}
        {/* Status and Call buttons (overlay, bottom center) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center">
          {showStatus && <div className="text-xs text-white mb-2 bg-black bg-opacity-60 px-3 py-1 rounded">{status}</div>}
          {showAcceptReject ? (
            <div className="flex gap-4 mt-2">
              <button className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow-lg" onClick={onAccept}>Accept</button>
              <button className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow-lg" onClick={onReject}>Reject</button>
            </div>
          ) : (
            <div className="flex gap-4 mt-2 items-center">
              <button
                className={`bg-gray-700 text-white px-4 py-2 rounded-full font-semibold text-lg shadow-lg ${isMuted ? 'opacity-70' : ''}`}
                onClick={onToggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button
                className={`bg-gray-700 text-white px-4 py-2 rounded-full font-semibold text-lg shadow-lg ${isCameraOff ? 'opacity-70' : ''}`}
                onClick={onToggleCamera}
                title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isCameraOff ? 'Camera On' : 'Camera Off'}
              </button>
              <button className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold text-lg shadow-lg" onClick={onEnd}>End Call</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 