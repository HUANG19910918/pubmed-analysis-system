/**
 * 前端日志工具
 * 在开发环境显示详细日志，生产环境只显示错误和警告
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context, null, 2)}` : '';
    return `[${timestamp}] [${level}] ${message}${contextStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  public debug(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('DEBUG', message, context));
    }
  }

  public info(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', message, context));
    }
  }

  public warn(message: string, context?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, context));
    }
  }

  public error(message: string, error?: Error | any, context?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorInfo = error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error;
      
      const fullContext = { ...context, error: errorInfo };
      console.error(this.formatMessage('ERROR', message, fullContext));
    }
  }

  // 专门用于API请求日志
  public apiRequest(method: string, url: string, duration?: number, status?: number): void {
    const message = `API ${method} ${url}`;
    const context = { duration: duration ? `${duration}ms` : undefined, status };
    this.debug(message, context);
  }

  // 专门用于用户操作日志
  public userAction(action: string, details?: any): void {
    const message = `User Action: ${action}`;
    this.debug(message, details);
  }

  // 专门用于性能监控
  public performance(operation: string, duration: number, details?: any): void {
    const message = `Performance: ${operation}`;
    const context = { duration: `${duration}ms`, ...details };
    this.info(message, context);
  }
}

// 导出单例实例
export const logger = Logger.getInstance();

// 导出便捷方法
export const log = {
  debug: (message: string, context?: any) => logger.debug(message, context),
  info: (message: string, context?: any) => logger.info(message, context),
  warn: (message: string, context?: any) => logger.warn(message, context),
  error: (message: string, error?: Error | any, context?: any) => logger.error(message, error, context),
  apiRequest: (method: string, url: string, duration?: number, status?: number) => 
    logger.apiRequest(method, url, duration, status),
  userAction: (action: string, details?: any) => logger.userAction(action, details),
  performance: (operation: string, duration: number, details?: any) => 
    logger.performance(operation, duration, details)
};