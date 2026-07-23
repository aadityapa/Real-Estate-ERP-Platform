import {
  IsEnum,
  IsIn,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { PlanType } from "@prisma/client";

export class StartSubscriptionDto {
  @IsEnum(PlanType)
  plan!: PlanType;

  @IsIn(["MONTHLY", "YEARLY"])
  billingCycle!: "MONTHLY" | "YEARLY";

  /** Start with trial (default true when catalog has trialDays > 0). */
  @IsOptional()
  @IsBoolean()
  startTrial?: boolean;
}

export class ChangePlanDto {
  @IsEnum(PlanType)
  plan!: PlanType;

  @IsOptional()
  @IsIn(["MONTHLY", "YEARLY"])
  billingCycle?: "MONTHLY" | "YEARLY";

  /** Prorate immediately (default) or at cycle end. */
  @IsOptional()
  @IsIn(["now", "cycle_end"])
  scheduleChangeAt?: "now" | "cycle_end";
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;
}
