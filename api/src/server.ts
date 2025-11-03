/**
 * local server entry file, for local development
 */
import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { log } from './utils/logger.js';

/**
 * start server with port
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  log.info(`服务器启动在端口 ${PORT}`);
});

/**
 * close server
 */
process.on('SIGTERM', () => {
  log.info('收到 SIGTERM 信号');
  server.close(() => {
    log.info('服务器已关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log.info('收到 SIGINT 信号');
  server.close(() => {
    log.info('服务器已关闭');
    process.exit(0);
  });
});

export default app;