/* eslint-disable @typescript-eslint/require-await */
import { io, Socket } from 'socket.io-client';
import chalk from 'chalk';
import { Logger } from '@nestjs/common';

/**
 * SERVER CONFIG
 */
const SERVER_URL = 'http://localhost:4000'; // must match your Nest server
const WS_PATH = '/ws/oracle'; // must match your @WebSocketGateway path
const VERIFICATION_INSTANCE_ID = 'b7a8f4c0-1c2d-4c5f-9a11-ffae12345678';

enum OracleEvent {
  ORACLE_CONNECTED = 'oracle.connected',
  VERIFICATION_REQUESTED = 'oracle.verification.requested',
  VERIFICATION_PROCESSING = 'oracle.verification.processing',
  VERIFICATION_SUCCESS = 'oracle.verification.success',
  VERIFICATION_FAILED = 'oracle.verification.failed',
  VERIFICATION_ERROR = 'oracle.verification.error',
}

/**
 * Create Socket.IO client
 */
function createOracleClient(): Socket {
  const socket = io(SERVER_URL, {
    path: WS_PATH,
    transports: ['websocket'], // force WebSocket
    timeout: 20000, // 20s timeout
    reconnectionAttempts: 3, // try 3 times before failing
    reconnectionDelay: 2000,
  });

  // Lifecycle logs
  socket.on('connect', () => {
    Logger.log(
      chalk.green(`🟢 Connected to Oracle WS (socketId: ${socket.id})`),
    );

    // Subscribe to verification instance
    socket.emit('oracle.subscribe', {
      verificationInstanceId: VERIFICATION_INSTANCE_ID,
    });
  });

  socket.on('disconnect', (reason) => {
    Logger.log(chalk.red(`🔴 Disconnected from Oracle WS: ${reason}`));
  });

  socket.on('connect_error', (err: any) => {
    Logger.error(chalk.yellow(`⚠️ Connect error:`), err.message);
  });

  socket.on('connect_timeout', () => {
    Logger.error(chalk.yellow('⚠️ Connection timed out!'));
  });

  // Subscription acknowledgement
  socket.on('oracle.subscribed', (data) => {
    Logger.log(
      chalk.cyan(
        `📡 Subscribed to verification instance: ${data.verificationInstanceId}`,
      ),
    );
  });

  socket.on('oracle.error', (err) => {
    Logger.error(chalk.red(`❌ Oracle error:`), err);
  });

  // Oracle lifecycle events
  socket.on(OracleEvent.ORACLE_CONNECTED, (payload) => {
    Logger.log(chalk.gray(`🤝 Oracle gateway ready @ ${payload.timestamp}`));
  });

  socket.on(OracleEvent.VERIFICATION_REQUESTED, (payload) => {
    Logger.log(chalk.blue.bold(`📨 Verification requested`), payload);
  });

  socket.on(OracleEvent.VERIFICATION_PROCESSING, (payload) => {
    Logger.log(
      chalk.yellow.bold(`⚙️ Oracle processing verification...`),
      payload,
    );
  });

  socket.on(OracleEvent.VERIFICATION_SUCCESS, (payload) => {
    Logger.log(chalk.green.bold(`✅ Verification SUCCESS`));
    console.dir(payload, { depth: null });
  });

  socket.on(OracleEvent.VERIFICATION_FAILED, (payload) => {
    Logger.log(chalk.red.bold(`❌ Verification FAILED`));
    console.dir(payload, { depth: null });
  });

  socket.on(OracleEvent.VERIFICATION_ERROR, (payload) => {
    Logger.log(chalk.bgRed.white.bold(`💥 Verification ERROR`));
    console.dir(payload, { depth: null });
  });

  return socket;
}

/**
 * Run simulation
 */
async function simulateOracleFlow() {
  Logger.log(chalk.magenta.bold(`🚀 Starting Oracle WS client simulation`));

  const socket = createOracleClient();

  // Keep process alive for observation
  setTimeout(() => {
    Logger.log(chalk.gray(`🧹 Closing Oracle WS client...`));
    socket.disconnect();
    process.exit(0);
  }, 60000);
}

void simulateOracleFlow();
