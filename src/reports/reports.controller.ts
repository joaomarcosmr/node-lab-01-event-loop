import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // Used by the back-office dashboard. Several managers open it at the same time every morning.
  @Get('sales')
  sales() {
    return this.reports.buildSalesReport();
  }
}
