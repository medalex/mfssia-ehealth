import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

import { OracleBaseGateway } from './base.gateway';
import { OracleEvent } from './events/oracle.event';

@WebSocketGateway({
  path: '/ws/oracle',
  allowEIO3: true,
  cors: { origin: '*', credentials: false },
})
@Injectable()
export class OracleGateway
  extends OracleBaseGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  constructor() {
    super(OracleGateway.name);
    this.logger.log('🔥 OracleGateway initialized');
  }

  handleConnection(socket: Socket) {
    this.logger.log(`🟢 Oracle socket connected: ${socket.id}`);

    socket.emit(OracleEvent.ORACLE_CONNECTED, {
      timestamp: new Date().toISOString(),
    });
  }

  handleDisconnect(socket: Socket) {
    this.unregisterSocket(socket);
    this.logger.log(`🔴 Oracle socket disconnected: ${socket.id}`);
  }

  /**
   * Frontend subscribes to a verification instance
   */
  @SubscribeMessage('oracle.subscribe')
  handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { instanceId: string },
  ) {
    this.logger.log(`CLIENT SUBSCRIBE → ${body?.instanceId}`);

    const instanceId = body?.instanceId;

    if (!instanceId) {
      socket.emit('oracle.error', {
        message: 'Missing instanceId',
        timestamp: new Date().toISOString(),
      });
      this.logger.warn(
        `⚠️ Socket ${socket.id} tried to subscribe without instanceId`,
      );
      return;
    }

    this.registerListener(socket, instanceId);

    // Acknowledge subscription
    socket.emit('oracle.subscribed', {
      instanceId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `📡 Socket ${socket.id} subscribed to instance ${instanceId}`,
    );
  }

  // ====================================================
  // 🔹 Domain Events → Realtime Oracle Updates
  // ====================================================

  @OnEvent(OracleEvent.VERIFICATION_REQUESTED)
  onRequested(payload: any) {
    this.forward(payload, OracleEvent.VERIFICATION_REQUESTED);
  }

  @OnEvent(OracleEvent.VERIFICATION_PROCESSING)
  onProcessing(payload: any) {
    this.forward(payload, OracleEvent.VERIFICATION_PROCESSING);
  }

  @OnEvent(OracleEvent.VERIFICATION_SUCCESS)
  onSuccess(payload: any) {
    this.forward(payload, OracleEvent.VERIFICATION_SUCCESS);
  }

  @OnEvent(OracleEvent.VERIFICATION_FAILED)
  onFailed(payload: any) {
    this.forward(payload, OracleEvent.VERIFICATION_FAILED);
  }

  @OnEvent(OracleEvent.VERIFICATION_ERROR)
  onError(payload: any) {
    this.forward(payload, OracleEvent.VERIFICATION_ERROR);
  }

  /**
   * Forward event to subscribed sockets and cleanup if terminal
   */
  private forward(payload: any, event: OracleEvent) {
    const { instanceId, ...data } = payload;

    if (!instanceId) {
      this.logger.warn(`⚠️ Missing instanceId for ${event}`);
      return;
    }

    this.logger.log(`FORWARD ${event} → ${instanceId}`);

    this.emitToInstance(this.server, instanceId, event, {
      ...data,
      event,
      timestamp: new Date().toISOString(),
    });

    // 🔥 Auto-cleanup on terminal events
    if (
      event === OracleEvent.VERIFICATION_SUCCESS ||
      event === OracleEvent.VERIFICATION_FAILED ||
      event === OracleEvent.VERIFICATION_ERROR
    ) {
      this.cleanupInstance(instanceId);
    }
  }
}
