export const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1";

export const APP_NAME = "PropOS";

export type NavChild = { label: string; href: string };

export type NavItem = {
  label: string;
  href?: string;
  icon: string;
  children?: NavChild[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  {
    label: "LMS",
    icon: "Target",
    children: [
      { label: "LMS Dashboard", href: "/lms" },
      { label: "Goals & Targets", href: "/lms/goals" },
      { label: "All Leads", href: "/lms/leads" },
      { label: "Lead Tracking", href: "/lms/leads/tracking" },
      { label: "Appointments", href: "/lms/appointments" },
      { label: "Site Visits", href: "/lms/site-visits" },
      { label: "Data Feed", href: "/lms/data-feed" },
      {
        label: "Reports",
        href: "/lms/reports",
      },
      { label: "Call Log", href: "/lms/reports/call-log" },
      { label: "Site Visited", href: "/lms/reports/site-visits" },
      { label: "Digital Hoarding", href: "/lms/reports/digital-hoarding" },
      { label: "Digital Enquiry", href: "/lms/reports/digital-enquiry" },
      { label: "Lead Tracking Rpt", href: "/lms/reports/lead-tracking" },
      { label: "DA Report", href: "/lms/reports/da-report" },
    ],
  },
  {
    label: "CRM",
    icon: "Users",
    children: [
      { label: "Dashboard", href: "/crm" },
      { label: "Leads", href: "/crm/leads" },
      { label: "Pipeline", href: "/crm/pipeline" },
      { label: "Follow-ups", href: "/crm/follow-ups" },
      { label: "Site Visits", href: "/crm/site-visits" },
    ],
  },
  {
    label: "Sales",
    icon: "Building2",
    children: [
      { label: "Dashboard", href: "/sales" },
      { label: "Inventory", href: "/sales/inventory" },
      { label: "Bookings", href: "/sales/bookings" },
    ],
  },
  {
    label: "Construction",
    icon: "HardHat",
    children: [
      { label: "Dashboard", href: "/construction" },
      { label: "Projects", href: "/construction/projects" },
      { label: "Milestones", href: "/construction/milestones" },
      { label: "DPR", href: "/construction/dpr" },
    ],
  },
  {
    label: "Finance",
    icon: "IndianRupee",
    children: [
      { label: "Dashboard", href: "/finance" },
      { label: "Budget", href: "/finance/budget" },
      { label: "Accounts", href: "/finance/accounts" },
      { label: "GST", href: "/finance/gst" },
      { label: "Vendors", href: "/vendors" },
      { label: "Purchase Orders", href: "/procurement/purchase-orders" },
    ],
  },
  {
    label: "HR",
    icon: "UserCircle",
    children: [
      { label: "Dashboard", href: "/hr" },
      { label: "Employees", href: "/hr/employees" },
      { label: "Attendance", href: "/hr/attendance" },
      { label: "Leave", href: "/hr/leave" },
    ],
  },
  {
    label: "Documents",
    icon: "FileText",
    children: [
      { label: "Documents", href: "/documents" },
      { label: "Legal", href: "/legal" },
      { label: "Assets", href: "/assets" },
    ],
  },
  {
    label: "Marketing",
    icon: "Megaphone",
    children: [
      { label: "Campaigns", href: "/marketing" },
      { label: "Channel Partners", href: "/channel-partners" },
    ],
  },
  {
    label: "Customers",
    icon: "Handshake",
    children: [
      { label: "Customers", href: "/customers" },
      { label: "Portal", href: "/customers/portal" },
    ],
  },
  { label: "AI", href: "/ai", icon: "Sparkles" },
  { label: "Support", href: "/support", icon: "Headphones" },
  {
    label: "Admin",
    icon: "Settings",
    children: [
      { label: "Dashboard", href: "/admin" },
      { label: "Companies", href: "/admin/companies" },
      { label: "Projects", href: "/admin/projects" },
      { label: "Users", href: "/admin/users" },
      { label: "Tab Logins", href: "/admin/tab-logins" },
    ],
  },
];
