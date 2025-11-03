/**
 * 统一的日志系统
 * 支持不同级别的日志记录，生产环境自动过滤调试信息
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
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private formatMessage(level: string, message: string, context?: any): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
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
  public apiRequest(method: string, path: string, duration?: number, status?: number): void {
    const message = `${method} ${path}`;
    const context = { duration: duration ? `${duration}ms` : undefined, status };
    this.info(message, context);
  }

  // 专门用于数据库操作日志
  public database(operation: string, table?: string, duration?: number): void {
    const message = `DB ${operation}`;
    const context = { table, duration: duration ? `${duration}ms` : undefined };
    this.debug(message, context);
  }

  // 专门用于外部API调用日志
  public externalApi(service: string, operation: string, duration?: number, success?: boolean): void {
    const message = `External API: ${service} - ${operation}`;
    const context = { duration: duration ? `${duration}ms` : undefined, success };
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
  apiRequest: (method: string, path: string, duration?: number, status?: number) => 
    logger.apiRequest(method, path, duration, status),
  database: (operation: string, table?: string, duration?: number) => 
    logger.database(operation, table, duration),
  externalApi: (service: string, operation: string, duration?: number, success?: boolean) => 
    logger.externalApi(service, operation, duration, success)
};