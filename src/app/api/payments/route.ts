import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/payments
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "summary"; // "summary" | "debts" | "history"
    const date = searchParams.get("date"); // YYYY-MM-DD for daily summary

    if (mode === "summary") {
      // 1. Daily summary (if date is provided)
      let dailyPayments: any[] = [];
      let dailyTotal = 0;

      if (date) {
        // Fetch all payments made on this day
        // Note: SQLite stores dates as strings or datetime. Since we have createdAt,
        // we can query payments created on that calendar day.
        const startOfDay = new Date(`${date}T00:00:00-06:00`);
        const endOfDay = new Date(`${date}T23:59:59-06:00`);

        dailyPayments = await db.payment.findMany({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          include: {
            appointment: {
              include: {
                patient: true,
                therapy: true,
              },
            },
          },
        });

        dailyTotal = dailyPayments.reduce((sum, p) => sum + p.amount, 0);
      }

      // 2. Global summary
      const totalOutstanding = await db.appointment.findMany({
        where: {
          paymentStatus: { in: ["Pendiente", "Parcial"] },
          status: { not: "Cancelada" },
        },
        include: {
          therapy: true,
          payments: true,
        },
      });

      let totalDebt = 0;
      totalOutstanding.forEach((app) => {
        const price = app.therapy.price;
        const paid = app.payments.reduce((sum, p) => sum + p.amount, 0);
        totalDebt += Math.max(0, price - paid);
      });

      return NextResponse.json({
        dailyTotal,
        dailyPaymentsCount: dailyPayments.length,
        dailyPayments,
        totalDebt,
      });
    }

    if (mode === "debts") {
      // Get all appointments with pending payments, grouped by patient
      const unpaidAppointments = await db.appointment.findMany({
        where: {
          paymentStatus: { in: ["Pendiente", "Parcial"] },
          status: { not: "Cancelada" },
        },
        include: {
          patient: true,
          therapy: true,
          payments: true,
        },
        orderBy: { date: "desc" },
      });

      const debts = unpaidAppointments.map((app) => {
        const price = app.therapy.price;
        const paid = app.payments.reduce((sum, p) => sum + p.amount, 0);
        return {
          id: app.id,
          date: app.date,
          timeSlot: app.timeSlot,
          patient: app.patient,
          therapy: app.therapy,
          price,
          paid,
          pending: Math.max(0, price - paid),
          paymentStatus: app.paymentStatus,
          consultorio: app.consultorio,
        };
      });

      return NextResponse.json(debts);
    }

    if (mode === "history") {
      const history = await db.payment.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          appointment: {
            include: {
              patient: true,
              therapy: true,
            },
          },
        },
        take: 100,
      });
      return NextResponse.json(history);
    }

    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in /api/payments:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/payments
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appointmentId, amount, method, notes } = body;

    if (!appointmentId || amount === undefined || !method) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Fetch the appointment to get its price
    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        therapy: true,
        payments: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    const price = appointment.therapy.price;
    const previousPaid = appointment.payments.reduce((sum, p) => sum + p.amount, 0);
    const newPaidTotal = previousPaid + parseFloat(amount);

    // 2. Create the payment
    const payment = await db.payment.create({
      data: {
        appointmentId,
        amount: parseFloat(amount),
        method,
        notes: notes || null,
      },
    });

    // 3. Update the appointment's paymentStatus
    let newPaymentStatus = "Pendiente";
    if (newPaidTotal >= price) {
      newPaymentStatus = "Pagado";
    } else if (newPaidTotal > 0) {
      newPaymentStatus = "Parcial";
    }

    await db.appointment.update({
      where: { id: appointmentId },
      data: {
        paymentStatus: newPaymentStatus,
      },
    });

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error("Error logging payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
