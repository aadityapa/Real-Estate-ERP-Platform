import { ObjectType, Field, ID, Int, registerEnumType } from "@nestjs/graphql";
import { LeadStatus, LeadSource, Priority } from "@prisma/client";

registerEnumType(LeadStatus, { name: "LeadStatus" });
registerEnumType(LeadSource, { name: "LeadSource" });
registerEnumType(Priority, { name: "Priority" });

@ObjectType()
export class LeadType {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field()
  phone!: string;

  @Field({ nullable: true })
  email?: string;

  @Field(() => LeadSource)
  source!: LeadSource;

  @Field(() => LeadStatus)
  status!: LeadStatus;

  @Field(() => Priority)
  priority!: Priority;

  @Field(() => Int)
  score!: number;

  @Field(() => Int, { nullable: true })
  aiScore?: number;

  @Field()
  createdAt!: Date;
}

@ObjectType()
export class BookingType {
  @Field(() => ID)
  id!: string;

  @Field()
  bookingNumber!: string;

  @Field()
  status!: string;

  @Field()
  totalAmount!: number;

  @Field()
  bookingDate!: Date;

  @Field({ nullable: true })
  customerName?: string;
}

@ObjectType()
export class PaginatedLeads {
  @Field(() => [LeadType])
  items!: LeadType[];

  @Field(() => Int)
  total!: number;
}

@ObjectType()
export class CrmDashboardStats {
  @Field(() => Int)
  totalLeads!: number;

  @Field(() => Int)
  followUpsToday!: number;

  @Field(() => Int)
  siteVisitsToday!: number;

  @Field(() => Int)
  conversionRate!: number;
}
