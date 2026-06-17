import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("Admin@123", 12);

  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      name: "Demo Realty",
      slug: "demo",
      plan: "GROWTH",
    },
  });

  const role = await prisma.role.upsert({
    where: { id: "seed-super-admin-role" },
    update: {},
    create: {
      id: "seed-super-admin-role",
      tenantId: tenant.id,
      name: "Super Admin",
      description: "Full system access",
      isSystem: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "admin@demo.propos.in" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo.propos.in",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      roles: {
        create: { roleId: role.id },
      },
    },
  });

  const company = await prisma.company.upsert({
    where: { id: "seed-company-1" },
    update: {},
    create: {
      id: "seed-company-1",
      tenantId: tenant.id,
      name: "Sunrise Developers Pvt Ltd",
      gstin: "27AABCS1429B1Z5",
      pan: "AABCS1429B",
      rera: "P52100012345",
      status: "ACTIVE",
    },
  });

  const project = await prisma.project.upsert({
    where: { code: "SUNRISE-01" },
    update: {},
    create: {
      companyId: company.id,
      name: "Sunrise Heights",
      code: "SUNRISE-01",
      type: "RESIDENTIAL",
      status: "UNDER_CONSTRUCTION",
      reraNumber: "P52100012345",
      totalUnits: 120,
      totalArea: 185000,
    },
  });

  const leadData = [
    {
      firstName: "Rahul",
      lastName: "Sharma",
      phone: "9876543210",
      email: "rahul@email.com",
      source: "FACEBOOK" as const,
      status: "NEW" as const,
    },
    {
      firstName: "Priya",
      lastName: "Patel",
      phone: "9876543211",
      email: "priya@email.com",
      source: "GOOGLE" as const,
      status: "CONTACTED" as const,
    },
    {
      firstName: "Amit",
      lastName: "Kumar",
      phone: "9876543212",
      source: "WALKIN" as const,
      status: "SITE_VISIT" as const,
    },
    {
      firstName: "Sneha",
      lastName: "Reddy",
      phone: "9876543213",
      email: "sneha@email.com",
      source: "REFERRAL" as const,
      status: "NEGOTIATION" as const,
    },
    {
      firstName: "Vikram",
      lastName: "Singh",
      phone: "9876543214",
      source: "WHATSAPP" as const,
      status: "INTERESTED" as const,
    },
  ];

  for (const lead of leadData) {
    const existing = await prisma.lead.findFirst({
      where: { tenantId: tenant.id, phone: lead.phone },
    });
    if (!existing) {
      await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          projectId: project.id,
          assignedToId: user.id,
          ...lead,
        },
      });
    }
  }

  const paymentPlan = await prisma.paymentPlan.upsert({
    where: { id: "seed-payment-plan-1" },
    update: {},
    create: {
      id: "seed-payment-plan-1",
      projectId: project.id,
      name: "Standard 60:40 Plan",
      description: "60% during construction, 40% on possession",
      installments: [
        { name: "Booking Amount", percentage: 10, daysFromBooking: 0 },
        { name: "On Agreement", percentage: 15, daysFromBooking: 30 },
        { name: "Foundation Complete", percentage: 15, daysFromBooking: 90 },
        { name: "Structure Complete", percentage: 20, daysFromBooking: 180 },
        { name: "Possession", percentage: 40, daysFromBooking: 365 },
      ],
      isActive: true,
    },
  });

  const unitNumbers = ["A-101", "A-102", "A-201", "B-101", "B-102"];
  for (let i = 0; i < unitNumbers.length; i++) {
    const num = unitNumbers[i];
    const existing = await prisma.unit.findFirst({
      where: { projectId: project.id, unitNumber: num },
    });
    if (!existing) {
      await prisma.unit.create({
        data: {
          projectId: project.id,
          unitNumber: num!,
          type: "FLAT",
          floor: parseInt(num!.split("-")[1] ?? "1", 10),
          bedrooms: 2 + (i % 2),
          bathrooms: 2,
          area: 950 + i * 50,
          basePrice: 4500000 + i * 200000,
          totalPrice: 4500000 + i * 200000,
          status: "AVAILABLE",
          amenities: ["Parking", "Clubhouse"],
        },
      });
    }
  }

  await prisma.vendor.upsert({
    where: { id: "seed-vendor-1" },
    update: {},
    create: {
      id: "seed-vendor-1",
      tenantId: tenant.id,
      name: "BuildRight Contractors",
      type: "CONTRACTOR",
      phone: "9123456789",
      status: "ACTIVE",
    },
  });

  console.log("Seed complete: admin@demo.propos.in / Admin@123");
  console.log(`Tenant: ${tenant.name}, Project: ${project.name}`);
  console.log(`Payment plan: ${paymentPlan.name}, Units: ${unitNumbers.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
