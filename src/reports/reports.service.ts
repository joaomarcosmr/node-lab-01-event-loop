import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SalesReport {
  orders: number;
  revenueCents: number;
  byCountry: Record<string, number>;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ⚠️ Loads the ENTIRE orders table (300k rows) into Node and aggregates it in JavaScript.
  // The query itself is async, but materializing 300k objects and looping over them is
  // synchronous CPU work on the main thread: while it runs, /health and everything else waits.
  async buildSalesReport(): Promise<SalesReport> {
    const orders = await this.prisma.order.findMany();
    const report: SalesReport = { orders: 0, revenueCents: 0, byCountry: {} };
    for (const order of orders) {
      const total = order.items * order.unitCents;
      report.orders++;
      report.revenueCents += total;
      report.byCountry[order.country] = (report.byCountry[order.country] ?? 0) + total;
    }
    return report;
  }
}
