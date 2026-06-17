"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/tables/filter-bar";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { formatCurrency } from "@propos/shared-utils";

interface Unit {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  totalPrice: number;
  area: number;
  project?: { name: string };
}

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
}

interface PaymentPlan {
  id: string;
  name: string;
  installments: unknown;
}

const STEPS = ["Select Unit", "Reserve", "Confirm Booking", "Agreement"];

export default function NewBookingPage(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [paymentPlanId, setPaymentPlanId] = useState("");
  const [bookingAmount, setBookingAmount] = useState(100000);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: unitsData } = useQuery({
    queryKey: ["available-units"],
    queryFn: () =>
      api.getPaginated<Unit>("/sales/inventory?status=AVAILABLE&limit=50"),
  });

  const { data: leadsData } = useQuery({
    queryKey: ["leads-for-booking"],
    queryFn: () => api.getPaginated<Lead>("/crm/leads?limit=50"),
  });

  const { data: plansData } = useQuery({
    queryKey: ["payment-plans"],
    queryFn: () => api.getPaginated<PaymentPlan>("/sales/payment-plans"),
  });

  const units = unitsData?.data ?? [];
  const leads = leadsData?.data ?? [];
  const plans = plansData?.data ?? [];

  async function handleReserve(): Promise<void> {
    if (!selectedUnit || !selectedLead) return;
    setLoading(true);
    setError("");
    try {
      await api.post("/sales/bookings/reserve", {
        unitId: selectedUnit.id,
        leadId: selectedLead.id,
      });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reserve failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(): Promise<void> {
    if (!selectedUnit || !selectedLead || !user) return;
    setLoading(true);
    setError("");
    try {
      const booking = await api.post<{ id: string }>("/sales/bookings/confirm", {
        unitId: selectedUnit.id,
        leadId: selectedLead.id,
        salesPersonId: user.id,
        paymentPlanId: paymentPlanId || undefined,
        bookingAmount,
        bookingDate: new Date().toISOString(),
      });
      setBookingId(booking.id);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateAgreement(): Promise<void> {
    if (!bookingId) return;
    setLoading(true);
    try {
      await api.post(`/sales/bookings/${bookingId}/agreement`, {
        type: "ALLOTMENT",
      });
      router.push(`/sales/bookings/${bookingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agreement failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout title="New Booking" back="/sales/bookings">
      <div className="mb-6 flex gap-2">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium ${
              i <= step
                ? "border-accent bg-amber-50 text-amber-800"
                : "border-border text-slate-400"
            }`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {step === 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Select Unit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {units.map((unit) => (
                <button
                  key={unit.id}
                  type="button"
                  onClick={() => setSelectedUnit(unit)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedUnit?.id === unit.id
                      ? "border-accent bg-amber-50"
                      : "border-border hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{unit.unitNumber}</span>
                    <StatusBadge status={unit.status} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {unit.project?.name} · {unit.type} · {unit.area} sq ft
                  </p>
                  <p className="text-sm font-medium text-accent">
                    {formatCurrency(Number(unit.totalPrice))}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Lead</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {leads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedLead?.id === lead.id
                      ? "border-accent bg-amber-50"
                      : "border-border hover:bg-slate-50"
                  }`}
                >
                  <p className="font-medium">
                    {lead.firstName} {lead.lastName ?? ""}
                  </p>
                  <p className="text-sm text-slate-500">{lead.phone}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 flex justify-end">
            <Button
              variant="accent"
              disabled={!selectedUnit || !selectedLead}
              onClick={() => setStep(1)}
            >
              Continue to Reserve
            </Button>
          </div>
        </div>
      )}

      {step === 1 && selectedUnit && selectedLead && (
        <Card>
          <CardHeader>
            <CardTitle>Reserve Unit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Reserve <strong>{selectedUnit.unitNumber}</strong> for{" "}
              <strong>
                {selectedLead.firstName} {selectedLead.lastName ?? ""}
              </strong>
              ? Unit will be held for 48 hours.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button variant="accent" onClick={handleReserve} disabled={loading}>
                {loading ? "Reserving..." : "Reserve Unit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && selectedUnit && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Booking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Booking Amount (₹)</label>
                <input
                  type="number"
                  value={bookingAmount}
                  onChange={(e) => setBookingAmount(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Plan</label>
                <select
                  value={paymentPlanId}
                  onChange={(e) => setPaymentPlanId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <option value="">No plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Total: {formatCurrency(Number(selectedUnit.totalPrice))}
            </p>
            <Button variant="accent" onClick={handleConfirm} disabled={loading}>
              {loading ? "Confirming..." : "Confirm Booking"}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 3 && bookingId && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-emerald-600 font-medium">
              Booking confirmed successfully!
            </p>
            <p className="text-sm text-slate-600">
              Generate the allotment agreement PDF to complete the process.
            </p>
            <div className="flex gap-2">
              <Button
                variant="accent"
                onClick={handleGenerateAgreement}
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Agreement PDF"}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/sales/bookings/${bookingId}`)}
              >
                View Booking
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}
