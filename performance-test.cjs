const WebSocket = require('ws');

// Конфигурация теста
const SERVER_URL = 'ws://localhost:5000/ws'; // Исправлен путь для WebSocket
const NUM_CONNECTIONS = 10; // Количество одновременных подключений
const TEST_DURATION = 30000; // 30 секунд
const MESSAGE_INTERVAL = 2000; // Отправлять сообщения каждые 2 секунды

class PerformanceTest {
  constructor() {
    this.connections = [];
    this.stats = {
      connected: 0,
      disconnected: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errors: 0,
      startTime: null,
      endTime: null
    };
  }

  async createConnection(id) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(SERVER_URL);
      
      ws.on('open', () => {
        console.log(`Connection ${id} opened`);
        this.stats.connected++;
        
        // Присоединяемся к тестовой сессии
        const joinMessage = {
          type: 'join_session',
          sessionId: 'test-session-' + Math.floor(id / 2), // 2 подключения на сессию
          userId: `test-user-${id}`
        };
        
        ws.send(JSON.stringify(joinMessage));
        this.stats.messagesSent++;
        
        resolve(ws);
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.stats.messagesReceived++;
          console.log(`Connection ${id} received:`, message.type);
        } catch (error) {
          console.error(`Connection ${id} message parse error:`, error);
          this.stats.errors++;
        }
      });

      ws.on('error', (error) => {
        console.error(`Connection ${id} error:`, error.message);
        this.stats.errors++;
        reject(error);
      });

      ws.on('close', () => {
        console.log(`Connection ${id} closed`);
        this.stats.disconnected++;
      });

      // Таймаут для подключения
      setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.terminate();
          reject(new Error(`Connection ${id} timeout`));
        }
      }, 5000);
    });
  }

  async startTest() {
    console.log(`Starting performance test with ${NUM_CONNECTIONS} connections...`);
    this.stats.startTime = Date.now();

    try {
      // Создаем все подключения
      const connectionPromises = [];
      for (let i = 0; i < NUM_CONNECTIONS; i++) {
        connectionPromises.push(this.createConnection(i));
      }

      this.connections = await Promise.all(connectionPromises);
      console.log(`All ${NUM_CONNECTIONS} connections established`);

      // Запускаем периодическую отправку сообщений
      const messageInterval = setInterval(() => {
        this.connections.forEach((ws, index) => {
          if (ws.readyState === WebSocket.OPEN) {
            const testMessage = {
              type: 'test_message',
              timestamp: Date.now(),
              connectionId: index
            };
            ws.send(JSON.stringify(testMessage));
            this.stats.messagesSent++;
          }
        });
      }, MESSAGE_INTERVAL);

      // Завершаем тест через указанное время
      setTimeout(() => {
        clearInterval(messageInterval);
        this.endTest();
      }, TEST_DURATION);

    } catch (error) {
      console.error('Test setup failed:', error);
      this.endTest();
    }
  }

  endTest() {
    this.stats.endTime = Date.now();
    const duration = this.stats.endTime - this.stats.startTime;

    console.log('\n=== Performance Test Results ===');
    console.log(`Test Duration: ${duration}ms (${duration / 1000}s)`);
    console.log(`Connections Created: ${this.stats.connected}`);
    console.log(`Connections Closed: ${this.stats.disconnected}`);
    console.log(`Messages Sent: ${this.stats.messagesSent}`);
    console.log(`Messages Received: ${this.stats.messagesReceived}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Message Rate: ${(this.stats.messagesSent / (duration / 1000)).toFixed(2)} msg/s`);
    console.log(`Success Rate: ${((this.stats.messagesReceived / this.stats.messagesSent) * 100).toFixed(2)}%`);

    // Закрываем все подключения
    this.connections.forEach((ws, index) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });

    process.exit(0);
  }
}

// Запускаем тест
const test = new PerformanceTest();
test.startTest().catch(console.error);