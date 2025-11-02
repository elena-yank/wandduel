// Simple WebSocket test
const WebSocket = require('ws');

console.log('Testing WebSocket connection to ws://localhost:5000/ws');

const ws = new WebSocket('ws://localhost:5000/ws');

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  
  // Send a test message
  ws.send(JSON.stringify({
    type: 'join_session',
    sessionId: 'test-session-123',
    userId: 'test-user-456'
  }));
  
  console.log('📤 Sent join_session message');
});

ws.on('message', function message(data) {
  console.log('📥 Received message:', data.toString());
});

ws.on('close', function close(code, reason) {
  console.log('❌ WebSocket closed:', code, reason.toString());
});

ws.on('error', function error(err) {
  console.log('🚨 WebSocket error:', err.message);
});

// Close after 5 seconds
setTimeout(() => {
  console.log('🔚 Closing connection...');
  ws.close();
}, 5000);