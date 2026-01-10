import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export class SocketIoAdapter extends IoAdapter {
  private readonly path: string;

  constructor(app: INestApplication, options?: { path?: string }) {
    super(app);
    this.path = options?.path ?? '/socket.io';
  }

  createIOServer(portOrServer?: number | HttpServer, options?: any): Server {
    const server: Server = super.createIOServer(portOrServer as any, {
      cors: { origin: '*', credentials: false },
      pingInterval: 20000,
      pingTimeout: 60000,
      path: this.path,
      ...options,
    });

    return server;
  }
}
