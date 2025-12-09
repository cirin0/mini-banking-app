import { Injectable } from '@nestjs/common';

export interface OperationMetric {
  module: string;
  operation: string;
  count: number;
  totalDuration: number;
  averageDuration: number;
  errors: number;
  lastExecuted: Date;
}

export interface ModuleStats {
  module: string;
  totalOperations: number;
  totalDuration: number;
  averageDuration: number;
  errorRate: number;
  operations: Record<string, OperationMetric>;
}

@Injectable()
export class MonitoringService {
  private metrics: Map<string, OperationMetric> = new Map();
  private readonly MAX_METRICS_SIZE = 10000;

  recordOperation(
    module: string,
    operation: string,
    duration: number,
    success: boolean = true,
  ): void {
    const key = `${module}:${operation}`;
    const existing = this.metrics.get(key);

    if (existing) {
      existing.count++;
      existing.totalDuration += duration;
      existing.averageDuration = existing.totalDuration / existing.count;
      existing.lastExecuted = new Date();
      if (!success) {
        existing.errors++;
      }
    } else {
      if (this.metrics.size >= this.MAX_METRICS_SIZE) {
        this.cleanupOldMetrics();
      }

      this.metrics.set(key, {
        module,
        operation,
        count: 1,
        totalDuration: duration,
        averageDuration: duration,
        errors: success ? 0 : 1,
        lastExecuted: new Date(),
      });
    }
  }

  getOperationMetric(
    module: string,
    operation: string,
  ): OperationMetric | null {
    const key = `${module}:${operation}`;
    return this.metrics.get(key) || null;
  }

  getModuleStats(module: string): ModuleStats | null {
    const moduleMetrics = Array.from(this.metrics.values()).filter(
      (m) => m.module === module,
    );

    if (moduleMetrics.length === 0) {
      return null;
    }

    const totalOperations = moduleMetrics.reduce((sum, m) => sum + m.count, 0);
    const totalDuration = moduleMetrics.reduce(
      (sum, m) => sum + m.totalDuration,
      0,
    );
    const totalErrors = moduleMetrics.reduce((sum, m) => sum + m.errors, 0);
    const averageDuration = totalDuration / totalOperations;
    const errorRate = totalErrors / totalOperations;

    const operations: Record<string, OperationMetric> = {};
    moduleMetrics.forEach((metric) => {
      operations[metric.operation] = metric;
    });

    return {
      module,
      totalOperations,
      totalDuration,
      averageDuration,
      errorRate,
      operations,
    };
  }

  getAllStats(): ModuleStats[] {
    const modules = new Set<string>();
    this.metrics.forEach((metric) => {
      modules.add(metric.module);
    });

    return Array.from(modules)
      .map((module) => this.getModuleStats(module))
      .filter((stats): stats is ModuleStats => stats !== null);
  }

  getMetricsSummary(): {
    totalOperations: number;
    totalModules: number;
    averageDuration: number;
    totalErrors: number;
    errorRate: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const totalOperations = allMetrics.reduce((sum, m) => sum + m.count, 0);
    const totalDuration = allMetrics.reduce(
      (sum, m) => sum + m.totalDuration,
      0,
    );
    const totalErrors = allMetrics.reduce((sum, m) => sum + m.errors, 0);
    const modules = new Set(allMetrics.map((m) => m.module));

    return {
      totalOperations,
      totalModules: modules.size,
      averageDuration:
        totalOperations > 0 ? totalDuration / totalOperations : 0,
      totalErrors,
      errorRate: totalOperations > 0 ? totalErrors / totalOperations : 0,
    };
  }

  resetMetrics(): void {
    this.metrics.clear();
  }

  private cleanupOldMetrics(): void {
    const sorted = Array.from(this.metrics.entries()).sort(
      (a, b) => a[1].lastExecuted.getTime() - b[1].lastExecuted.getTime(),
    );
    const toRemove = Math.floor(this.metrics.size * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.metrics.delete(sorted[i][0]);
    }
  }
}
