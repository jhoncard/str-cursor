import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { eq } from "drizzle-orm";

import { requireAdminPage } from "@/lib/auth";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";

import { EditReservationForm } from "./edit-form";

export default async function EditReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;

  const row = await db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    columns: {
      id: true,
      confirmationCode: true,
      checkIn: true,
      checkOut: true,
      checkInTimeOverride: true,
      checkOutTimeOverride: true,
      doorCode: true,
      seamAccessError: true,
    },
    with: {
      property: {
        columns: {
          name: true,
          checkInTime: true,
          checkOutTime: true,
        },
      },
      guest: {
        columns: {
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  });

  if (!row) notFound();

  return (
    <div className="max-w-2xl">
      <Link
        href="/admin/reservations"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#2b2b36] mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to reservations
      </Link>

      <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36] tracking-tight mb-2">
        Edit reservation
      </h1>
      <p className="text-gray-500 mb-6">
        {row.property.name} · {row.confirmationCode}
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Guest</span>
          <span className="font-medium">
            {row.guest.firstName} {row.guest.lastName}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Phone</span>
          <span className="font-mono">{row.guest.phone ?? "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Stay</span>
          <span className="font-medium">
            {String(row.checkIn)} → {String(row.checkOut)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Door code</span>
          <span className="font-mono font-semibold">
            {row.doorCode ?? "—"}
          </span>
        </div>
        {row.seamAccessError && (
          <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3">
            Last Seam error: {row.seamAccessError}
          </div>
        )}
      </div>

      <EditReservationForm
        bookingId={row.id}
        propertyCheckInTime={row.property.checkInTime}
        propertyCheckOutTime={row.property.checkOutTime}
        initialCheckInOverride={row.checkInTimeOverride ?? ""}
        initialCheckOutOverride={row.checkOutTimeOverride ?? ""}
      />
    </div>
  );
}
