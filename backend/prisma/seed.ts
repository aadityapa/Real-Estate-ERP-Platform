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

  const permissionDefs = [
    { module: "admin", action: "read", resource: "companies" },
    { module: "admin", action: "write", resource: "companies" },
    { module: "admin", action: "read", resource: "users" },
    { module: "admin", action: "write", resource: "users" },
    { module: "admin", action: "read", resource: "projects" },
    { module: "admin", action: "write", resource: "projects" },
    { module: "admin", action: "write", resource: "tab-logins" },
    { module: "admin", action: "read", resource: "usage" },
    { module: "admin", action: "write", resource: "usage" },
    { module: "admin", action: "read", resource: "billing" },
    { module: "admin", action: "write", resource: "billing" },
    { module: "admin", action: "export", resource: "tenant" },
    { module: "admin", action: "delete", resource: "tenant" },
    { module: "finance", action: "read", resource: "ledger" },
    { module: "finance", action: "write", resource: "ledger" },
    { module: "finance", action: "read", resource: "budget" },
    { module: "finance", action: "write", resource: "budget" },
    { module: "finance", action: "read", resource: "gst" },
    { module: "finance", action: "write", resource: "gst" },
    { module: "finance", action: "read", resource: "tds" },
    { module: "finance", action: "write", resource: "tds" },
    { module: "hr", action: "read", resource: "employees" },
    { module: "hr", action: "write", resource: "employees" },
    { module: "hr", action: "read", resource: "attendance" },
    { module: "hr", action: "write", resource: "attendance" },
    { module: "hr", action: "read", resource: "leaves" },
    { module: "hr", action: "write", resource: "leaves" },
    { module: "crm", action: "read", resource: "leads" },
    { module: "crm", action: "write", resource: "leads" },
    { module: "crm", action: "manage", resource: "leads" },
    { module: "sales", action: "read", resource: "bookings" },
    { module: "sales", action: "write", resource: "bookings" },
    { module: "sales", action: "read", resource: "payments" },
    { module: "sales", action: "write", resource: "payments" },
    { module: "sales", action: "read", resource: "inventory" },
    { module: "sales", action: "write", resource: "inventory" },
    { module: "legal", action: "read", resource: "cases" },
    { module: "legal", action: "write", resource: "cases" },
    { module: "documents", action: "read", resource: "files" },
    { module: "documents", action: "write", resource: "files" },
    { module: "vendors", action: "read", resource: "vendors" },
    { module: "vendors", action: "write", resource: "vendors" },
    { module: "support", action: "admin", resource: "tickets" },
    { module: "support", action: "write", resource: "tickets" },
  ];

  for (const def of permissionDefs) {
    const existing = await prisma.permission.findFirst({ where: def });
    const permission =
      existing ??
      (await prisma.permission.create({ data: def }));
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }

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
      stateCode: "27",
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
          leadRat: Math.floor(Math.random() * 101),
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

  // LMS seed data
  const leads = await prisma.lead.findMany({
    where: { tenantId: tenant.id },
    take: 5,
  });

  if (leads.length >= 2) {
    await prisma.clashLead.upsert({
      where: { id: "seed-clash-1" },
      update: {},
      create: {
        id: "seed-clash-1",
        tenantId: tenant.id,
        leadAId: leads[0]!.id,
        leadBId: leads[1]!.id,
        status: "PENDING",
      },
    });
  }

  await prisma.lmsGoal.upsert({
    where: {
      tenantId_projectId_userId_month_year: {
        tenantId: tenant.id,
        projectId: project.id,
        userId: user.id,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      projectId: project.id,
      userId: user.id,
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      targetEnquiries: 200,
      targetSiteVisits: 80,
      targetBookings: 30,
      targetRevenue: 20000000,
      createdById: user.id,
    },
  });

  const unassignedLead = await prisma.lead.findFirst({
    where: { tenantId: tenant.id, assignedToId: null },
  });
  if (!unassignedLead && leads[0]) {
    await prisma.lead.update({
      where: { id: leads[0].id },
      data: { assignedToId: null, claimedById: null, leadLabel: "HOT", feedScore: 10 },
    });
  }

  for (const lead of leads.slice(0, 3)) {
    const existing = await prisma.appointment.findFirst({
      where: { leadId: lead.id },
    });
    if (!existing) {
      await prisma.appointment.create({
        data: {
          tenantId: tenant.id,
          leadId: lead.id,
          userId: user.id,
          type: "FOLLOW_UP",
          scheduledAt: new Date(Date.now() + Math.random() * 86400000 * 3),
          projectName: project.name,
          status: "PENDING",
        },
      });
    }
  }

  await prisma.helpdeskTicket.upsert({
    where: { ticketNumber: "TK-0001" },
    update: {},
    create: {
      ticketNumber: "TK-0001",
      tenantId: tenant.id,
      raisedById: user.id,
      subject: "Login issue — Sales App",
      description: "Cannot login after password reset on mobile.",
      category: "LOGIN",
      priority: "HIGH",
      module: "auth",
      status: "OPEN",
    },
  });

  await prisma.tabLoginConfig.upsert({
    where: { tabId: "SALES_EXEC_001" },
    update: {},
    create: {
      tenantId: tenant.id,
      roleId: role.id,
      tabId: "SALES_EXEC_001",
      label: "Super Admin View",
      allowedTabs: ["*"],
      defaultTab: "/lms",
      theme: "#3b82f6",
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
