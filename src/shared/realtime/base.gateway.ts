import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * MFSSIA Oracle Base Gateway
 * - No authentication
 * - No user identity
 * - Correlates purely by verificationInstanceId
 */
export abstract class OracleBaseGateway {
  protected readonly logger: Logger;

  /**
   * verificationInstanceId -> socketIds[]
   */
  protected listeners = new Map<string, Set<string>>();

  constructor(gatewayName: string) {
    this.logger = new Logger(gatewayName);
  }

  /**
   * Register a socket for a specific verification instance
   */
  protected registerListener(socket: Socket, verificationInstanceId: string) {
    if (!this.listeners.has(verificationInstanceId)) {
      this.listeners.set(verificationInstanceId, new Set());
    }
    this.listeners.get(verificationInstanceId)?.add(socket.id);

    this.logger.debug(
      `📡 Socket ${socket.id} subscribed to ${verificationInstanceId}`,
    );
  }

  /**
   * Remove socket from all listeners (called on disconnect)
   */
  protected unregisterSocket(socket: Socket) {
    for (const [, sockets] of this.listeners) {
      sockets.delete(socket.id);
    }
  }

  /**
   * Emit to all sockets subscribed to a verificationInstanceId
   */
  protected emitToInstance(
    server: Server,
    verificationInstanceId: string,
    event: string,
    payload: any,
  ) {
    const sockets = this.listeners.get(verificationInstanceId);
    if (!sockets) return;

    for (const socketId of sockets) {
      server.to(socketId).emit(event, payload);
    }
  }

  /**
   * Cleanup listeners for a verificationInstanceId
   */
  protected cleanupInstance(verificationInstanceId: string) {
    if (this.listeners.has(verificationInstanceId)) {
      this.listeners.delete(verificationInstanceId);
      this.logger.debug(
        `🧹 Cleaned up listeners for ${verificationInstanceId}`,
      );
    }
  }
}
