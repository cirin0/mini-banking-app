import { Controller, Get, Param } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('stats')
  getStats() {
    return this.monitoringService.getAllStats();
  }

  @Get('summary')
  getSummary() {
    return this.monitoringService.getMetricsSummary();
  }

  @Get('module/:moduleName')
  getModuleStats(@Param('moduleName') moduleName: string) {
    return this.monitoringService.getModuleStats(moduleName);
  }
}
