/**
 * Type declaration file for realtime.js
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

export function setupSocketIO(server: HttpServer): SocketIOServer;
export function emitOrderUpdate(orderId: number): void;
export function emitStoreStatusUpdate(status: string): void;