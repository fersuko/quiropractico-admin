const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const crypto = require("crypto");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("Seeding database...");

  // 1. Seed Therapies
  const therapies = [
    {
      id: "CONSULTA",
      name: "Consulta",
      description: "Consulta general de seguimiento quiropráctico",
      price: 800.0,
      color: "#0d9488", // Teal
    },
    {
      id: "1ER_VEZ_CON_RX",
      name: "Primera Vez con RX",
      description: "Primera consulta inicial de diagnóstico incluyendo radiografías",
      price: 1200.0,
      color: "#2563eb", // Blue
    },
    {
      id: "1ER_VEZ_SIN_RX",
      name: "Primera Vez sin RX",
      description: "Primera consulta inicial de diagnóstico sin radiografías",
      price: 1000.0,
      color: "#16a34a", // Green
    },
    {
      id: "COMPARATIVO",
      name: "Comparativo",
      description: "Sesión de reevaluación comparativa con estudios previos",
      price: 1000.0,
      color: "#7c3aed", // Purple
    },
    {
      id: "TD",
      name: "TD",
      description: "Técnica Diversificada de ajuste manual",
      price: 800.0,
      color: "#db2777", // Pink
    },
    {
      id: "RESET",
      name: "Reset",
      description: "Protocolo Reset (Tratamiento E, B o F)",
      price: 950.0,
      color: "#e11d48", // Rose
    },
  ];

  for (const therapy of therapies) {
    await prisma.therapy.upsert({
      where: { id: therapy.id },
      update: therapy,
      create: therapy,
    });
  }
  console.log(`Seeded ${therapies.length} therapies.`);

  // 2. Seed Users
  const users = [
    {
      username: "admin",
      password: hashPassword("admin123"),
      name: "Administrador Clínica",
      role: "Admin",
    },
    {
      username: "recepcion",
      password: hashPassword("recepcion123"),
      name: "Recepcionista Asistente",
      role: "Recepción",
    },
    {
      username: "doctor",
      password: hashPassword("doctor123"),
      name: "Dr. David Rodríguez Garita",
      role: "Doctor",
    },
  ];

  const dbUsers = [];
  for (const u of users) {
    const createdUser = await prisma.user.upsert({
      where: { username: u.username },
      update: u,
      create: u,
    });
    dbUsers.push(createdUser);
  }
  console.log(`Seeded ${users.length} default users.`);

  const docUser = dbUsers.find(u => u.role === "Doctor");

  // 3. Seed Patients
  const patients = [
    {
      firstName: "ALMA INES",
      lastName: "PANG GALLARDO",
      phone1: "8112904590",
      phone2: "8110000001",
      gender: "Femenino",
      status: "Activo",
      rx: true,
      therapyId: "TD",
    },
    {
      firstName: "CLAUDIA CRISTINA",
      lastName: "GONZALEZ VEGA",
      phone1: "8120407851",
      phone2: "8120000002",
      gender: "Femenino",
      status: "En tratamiento",
      rx: false,
      therapyId: "RESET",
      therapySubcategory: "Tratamiento E",
    },
    {
      firstName: "MARIANA",
      lastName: "MIGUEL HINOJOSA",
      phone1: "8115113534",
      phone2: "8119363236",
      gender: "Femenino",
      status: "Activo",
      rx: true,
      therapyId: "1ER_VEZ_CON_RX",
    },
  ];

  const dbPatients = [];
  for (const p of patients) {
    const existing = await prisma.patient.findFirst({
      where: {
        firstName: p.firstName,
        lastName: p.lastName,
      },
    });

    if (existing) {
      const updated = await prisma.patient.update({
        where: { id: existing.id },
        data: p,
      });
      dbPatients.push(updated);
    } else {
      const created = await prisma.patient.create({
        data: p,
      });
      dbPatients.push(created);
    }
  }
  console.log("Seeded default patients.");

  // 4. Seed Appointments and Payments for Today
  const todayStr = new Date().toISOString().split("T")[0];

  const apptData = [
    {
      patientId: dbPatients[0].id,
      therapyId: "TD",
      date: todayStr,
      timeSlot: "09:00",
      consultorio: "A",
      notes: "Dolor en espalda baja",
      status: "Confirmada",
      paymentStatus: "Pagado",
      pricePaid: 800.0,
      paymentMethod: "Efectivo",
      userId: docUser.id,
    },
    {
      patientId: dbPatients[1].id,
      therapyId: "RESET",
      therapySubcategory: "Tratamiento E",
      date: todayStr,
      timeSlot: "09:15",
      consultorio: "B",
      notes: "Seguimiento de ajuste de cuello",
      status: "Confirmada",
      paymentStatus: "Pendiente",
      pricePaid: 0.0,
      paymentMethod: "",
      userId: docUser.id,
    },
    {
      patientId: dbPatients[2].id,
      therapyId: "1ER_VEZ_CON_RX",
      date: todayStr,
      timeSlot: "10:30",
      consultorio: "C",
      notes: "Trae radiografías nuevas",
      status: "Confirmada",
      paymentStatus: "Parcial",
      pricePaid: 500.0,
      paymentMethod: "Tarjeta",
      userId: docUser.id,
    },
  ];

  for (const appt of apptData) {
    const existingAppt = await prisma.appointment.findFirst({
      where: {
        date: appt.date,
        timeSlot: appt.timeSlot,
        consultorio: appt.consultorio,
      },
    });

    if (!existingAppt) {
      const createdAppt = await prisma.appointment.create({
        data: {
          patientId: appt.patientId,
          therapyId: appt.therapyId,
          therapySubcategory: appt.therapySubcategory || null,
          date: appt.date,
          timeSlot: appt.timeSlot,
          consultorio: appt.consultorio,
          notes: appt.notes,
          status: appt.status,
          paymentStatus: appt.paymentStatus,
          userId: appt.userId,
        },
      });

      // Create payment
      if (appt.pricePaid > 0) {
        await prisma.payment.create({
          data: {
            appointmentId: createdAppt.id,
            amount: appt.pricePaid,
            method: appt.paymentMethod,
          },
        });
      }
    }
  }
  console.log("Seeded demo appointments and payments for today.");

  // 5. Seed AppConfig
  await prisma.appConfig.upsert({
    where: { id: "default" },
    update: {},
    create: {
      whatsappTemplate: "Hola *{paciente}*, te recordamos tu cita de *{terapia}* el día *{fecha}* a las *{hora}*. Por favor confírmanos por este medio.",
    },
  });
  console.log("Seeded default AppConfig.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
