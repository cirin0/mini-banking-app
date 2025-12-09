import { Logger, Optional, Inject } from '@nestjs/common';
import { MonitoringService } from '../monitoring/monitoring.service';

export interface LogContext {
  userId?: string;
  operation: string;
  module: string;
  metadata?: Record<string, any>;
}

export class BaseLoggerProxy {
  protected readonly logger: Logger;
  protected monitoringService?: MonitoringService;

  constructor(
    moduleName: string,
    @Optional() @Inject(MonitoringService) monitoringService?: MonitoringService,
  ) {
    this.logger = new Logger(`Proxy:${moduleName}`);
    this.monitoringService = monitoringService;
  }

  protected logOperation(
    level: 'info' | 'warn' | 'error',
    context: LogContext,
    message?: string,
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      ...context,
      message: message || context.operation,
    };

    switch (level) {
      case 'info':
        this.logger.log(JSON.stringify(logData));
        break;
      case 'warn':
        this.logger.warn(JSON.stringify(logData));
        break;
      case 'error':
        this.logger.error(JSON.stringify(logData));
        break;
    }
  }

  protected logWithDuration(
    context: LogContext,
    startTime: number,
    success: boolean = true,
    error?: Error,
  ): void {
    const duration = Date.now() - startTime;
    const logContext: LogContext = {
      ...context,
      metadata: {
        ...context.metadata,
        duration: `${duration}ms`,
        success,
      },
    };

    if (this.monitoringService) {
      this.monitoringService.recordOperation(
        context.module,
        context.operation,
        duration,
        success,
      );
    }

    if (error) {
      logContext.metadata = {
        ...logContext.metadata,
        error: error.message,
        errorStack: error.stack,
      };
      this.logOperation('error', logContext);
    } else {
      this.logOperation('info', logContext);
    }
  }
}

