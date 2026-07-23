import { Module } from "@nestjs/common";
import { BudgetModule } from "./budget/budget.module";
import { LedgerModule } from "./ledger/ledger.module";
import { GstModule } from "./gst/gst.module";
import { TdsModule } from "./tds/tds.module";

@Module({ imports: [BudgetModule, LedgerModule, GstModule, TdsModule] })
export class FinanceModule {}
