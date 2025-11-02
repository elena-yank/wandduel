import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface SessionClient {
  ws: WebSocket;
  sessionId: string;
  userId?: string;
}

class GameWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, SessionClient[]> = new Map(); // sessionId -> clients[]

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('WebSocket connection established');

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        this.removeClient(ws);
        console.log('WebSocket connection closed');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeClient(ws);
      });
    });
  }

  private handleMessage(ws: WebSocket, data: any) {
    switch (data.type) {
      case 'join_session':
        this.joinSession(ws, data.sessionId, data.userId);
        break;
      case 'leave_session':
        this.leaveSession(ws, data.sessionId);
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  }

  private joinSession(ws: WebSocket, sessionId: string, userId?: string) {
    if (!sessionId) return;

    // Remove client from any previous sessions
    this.removeClient(ws);

    // Add to new session
    if (!this.clients.has(sessionId)) {
      this.clients.set(sessionId, []);
    }

    const sessionClients = this.clients.get(sessionId)!;
    sessionClients.push({ ws, sessionId, userId });

    console.log(`Client joined session ${sessionId}, total clients: ${sessionClients.length}`);

    // Send confirmation
    ws.send(JSON.stringify({
      type: 'session_joined',
      sessionId,
      clientCount: sessionClients.length
    }));
  }

  private leaveSession(ws: WebSocket, sessionId: string) {
    const sessionClients = this.clients.get(sessionId);
    if (!sessionClients) return;

    const index = sessionClients.findIndex(client => client.ws === ws);
    if (index !== -1) {
      sessionClients.splice(index, 1);
      
      if (sessionClients.length === 0) {
        this.clients.delete(sessionId);
      }

      console.log(`Client left session ${sessionId}, remaining clients: ${sessionClients.length}`);
    }
  }

  private removeClient(ws: WebSocket) {
    for (const [sessionId, sessionClients] of this.clients.entries()) {
      const index = sessionClients.findIndex(client => client.ws === ws);
      if (index !== -1) {
        sessionClients.splice(index, 1);
        
        if (sessionClients.length === 0) {
          this.clients.delete(sessionId);
        }
        break;
      }
    }
  }

  // Public methods to broadcast updates
  public broadcastSessionUpdate(sessionId: string, updateType: string, data: any) {
    const sessionClients = this.clients.get(sessionId);
    if (!sessionClients || sessionClients.length === 0) return;

    const message = JSON.stringify({
      type: 'session_update',
      updateType,
      data,
      timestamp: Date.now()
    });

    let sentCount = 0;
    sessionClients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
        sentCount++;
      }
    });

    console.log(`Broadcasted ${updateType} to ${sentCount} clients in session ${sessionId}`);
  }

  public broadcastServerTime() {
    const message = JSON.stringify({
      type: 'server_time',
      timestamp: Date.now()
    });

    let totalSent = 0;
    for (const sessionClients of this.clients.values()) {
      sessionClients.forEach(client => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(message);
          totalSent++;
        }
      });
    }

    if (totalSent > 0) {
      console.log(`Broadcasted server time to ${totalSent} clients`);
    }
  }

  public getSessionClientCount(sessionId: string): number {
    const sessionClients = this.clients.get(sessionId);
    return sessionClients ? sessionClients.length : 0;
  }

  public getAllConnectedClients(): number {
    let total = 0;
    for (const sessionClients of this.clients.values()) {
      total += sessionClients.length;
    }
    return total;
  }
}

export { GameWebSocketServer };