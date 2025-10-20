import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerProfileImageUrl?: string;
  callType: 'audio' | 'video';
}

export function useIncomingCalls() {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!user) return;

    // Listen for incoming call WebSocket events
    const handleIncomingCall = (event: CustomEvent) => {
      const { callId, callerId, callerName, callerProfileImageUrl, callType } = event.detail;
      
      setIncomingCall({
        callId,
        callerId,
        callerName,
        callerProfileImageUrl,
        callType,
      });
    };

    // Listen for call ended/declined events to clear the incoming call
    const handleCallEnded = () => {
      setIncomingCall(null);
    };

    window.addEventListener('incoming-call' as any, handleIncomingCall);
    window.addEventListener('call-ended' as any, handleCallEnded);
    window.addEventListener('call-declined' as any, handleCallEnded);
    window.addEventListener('call-accepted' as any, handleCallEnded);

    return () => {
      window.removeEventListener('incoming-call' as any, handleIncomingCall);
      window.removeEventListener('call-ended' as any, handleCallEnded);
      window.removeEventListener('call-declined' as any, handleCallEnded);
      window.removeEventListener('call-accepted' as any, handleCallEnded);
    };
  }, [user]);

  const clearIncomingCall = () => {
    setIncomingCall(null);
  };

  return {
    incomingCall,
    clearIncomingCall,
  };
}
