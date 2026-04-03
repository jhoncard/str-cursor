import { requireAdminPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DollarSign, CalendarCheck, Building2, Users } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  await requireAdminPage();
  const supabase = await createClient();

  const [bookingsRes, revenueRes, propertiesRes, guestsRes] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("bookings")
        .select("total_amount")
        .eq("payment_status", "paid"),
      supabase
        .from("properties")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("guests")
        .select("id", { count: "exact", head: true }),
    ]);

  const totalBookings = bookingsRes.count ?? 0;
  const totalRevenue =
    revenueRes.data?.reduce((sum, b) => sum + (b.total_amount ?? 0), 0) ?? 0;
  const activeProperties = propertiesRes.count ?? 0;
  const totalGuests = guestsRes.count ?? 0;

  const stats = [
    {
      label: "Total Bookings",
      value: totalBookings.toLocaleString(),
      icon: CalendarCheck,
      href: "/admin/reservations",
    },
    {
      label: "Revenue",
      value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      href: "/admin/payments",
    },
    {
      label: "Active Properties",
      value: activeProperties.toLocaleString(),
      icon: Building2,
      href: "/admin/properties",
    },
    {
      label: "Total Guests",
      value: totalGuests.toLocaleString(),
      icon: Users,
      href: "#",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36] tracking-tight mb-6">
        Dashboard
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[#2b2b36]/50">
                {stat.label}
              </span>
              <div className="p-2.5 rounded-xl bg-[#2b2b36]/5 group-hover:bg-[#2b2b36]/10 transition-colors">
                <stat.icon className="w-5 h-5 text-[#2b2b36]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[#2b2b36]">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: "Reservations",
            description: "View and manage all guest bookings",
            href: "/admin/reservations",
          },
          {
            title: "Payments",
            description: "Review Stripe payment logs",
            href: "/admin/payments",
          },
          {
            title: "Properties",
            description: "Edit property listings and images",
            href: "/admin/properties",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-[#2b2b36] mb-1">
              {card.title}
            </h3>
            <p className="text-sm text-[#2b2b36]/50">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
