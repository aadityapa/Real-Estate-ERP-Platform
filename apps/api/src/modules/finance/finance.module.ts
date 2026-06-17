import { Module } from "@nestjs/common";
import { BudgetModule } from "./budget/budget.module";
import { LedgerModule } from "./ledger/ledger.module";

@Module({ imports: [BudgetModule, LedgerModule] })
export class FinanceModule {}
