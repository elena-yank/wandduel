import { useState } from 'react';

// Simple mock socket interface
interface MockSocket {
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string) => void;
  emit: (event: string, data: any) => void;
  disconnect: () => void;
}

export function useSocket() {
  // Return a mock socket object that doesn't do anything
  const [socket] = useState<MockSocket | null>({
    on: (event, callback) => {},
    off: (event) => {},
    emit: (event, data) => {},
    disconnect: () => {}
  });
  
  return { socket };
}