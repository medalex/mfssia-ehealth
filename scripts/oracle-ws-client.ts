/* eslint-disable @typescript-eslint/require-await */
import { io, Socket } from 'socket.io-client';
import chalk from 'chalk';
import { Logger } from '@nestjs/common';

const SERVER_URL = 'https://api.dymaxion-ou.co';
const WS_PATH = '/ws/oracle';
const instanceId = 'e30457e5-50cb-4f5f-9c9c-29f7ae290564';

enum OracleEvent {
  ORACLE_CONNECTED = 'oracle_connected',
  VERIFICATION_REQUESTED = 'oracle.verification.requested',
  VERIFICATION_PROCESSING = 'oracle.verification.processing',
  VERIFICATION_SUCCESS = 'oracle.verification.success',
  VERIFICATION_FAILED = 'oracle.verification.failed',
  VERIFICATION_ERROR = 'oracle.verification.error',
}

function createOracleClient(): Socket {
  const socket = io(SERVER_URL, {
    path: WS_PATH,
    transports: ['websocket'],
    timeout: 20000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    Logger.log(chalk.green(`🟢 Connected (socketId: ${socket.id})`));

    socket.emit('oracle.subscribe', {
      instanceId: instanceId,
    });
  });

  socket.on('disconnect', (reason) => {
    Logger.warn(chalk.red(`🔴 Disconnected: ${reason}`));
  });

  socket.on('connect_error', (err: any) => {
    Logger.error(chalk.yellow(`⚠️ Connect error:`), err.message);
  });

  socket.on('oracle.subscribed', (data) => {
    Logger.log(chalk.cyan(`📡 Subscribed to ${data.instanceId}`));
  });

  socket.on(OracleEvent.ORACLE_CONNECTED, (payload) => {
    Logger.log(chalk.gray(`🤝 Oracle ready @ ${payload.timestamp}`));
  });

  socket.on(OracleEvent.VERIFICATION_REQUESTED, (payload) => {
    Logger.log(chalk.blue.bold(`📨 Verification requested`), payload);
  });

  socket.on(OracleEvent.VERIFICATION_PROCESSING, (payload) => {
    Logger.log(chalk.yellow.bold(`⚙️ Processing...`), payload);
  });

  socket.on(OracleEvent.VERIFICATION_SUCCESS, (payload) => {
    Logger.log(chalk.green.bold(`✅ SUCCESS`), payload);
  });

  socket.on(OracleEvent.VERIFICATION_FAILED, (payload) => {
    Logger.log(chalk.red.bold(`❌ FAILED`), payload);
  });

  socket.on(OracleEvent.VERIFICATION_ERROR, (payload) => {
    Logger.log(chalk.bgRed.white.bold(`💥 ERROR`), payload);
  });

  return socket;
}

async function simulateOracleFlow() {
  Logger.log(chalk.magenta.bold(`🚀 Oracle WS client started`));

  const socket = createOracleClient();

  // Graceful shutdown
  process.on('SIGINT', () => {
    Logger.log(chalk.gray(`🛑 Shutting down oracle listener...`));
    socket.disconnect();
    process.exit(0);
  });
}

void simulateOracleFlow();
