const { PrismaClient } = require("@prisma/client");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Seed Therapies
  const therapies = [
    {
      id: "CONS_1ER_RX",
      name: "Consulta 1er vez con Rx",
      description: "Consulta inicial de diagnóstico con revisión de radiografías",
      price: 1200.0,
      color: "#0d9488", // Teal/Teal-600
    },
    {
      id: "CONS_1ER_COMP",
      name: "1er vez comparativo",
      description: "Cita de reevaluación comparando radiografías previas",
      price: 1000.0,
      color: "#2563eb", // Blue/Blue-600
    },
    {
      id: "TD",
      name: "Técnica Diversificada (TD)",
      description: "Ajuste quiropráctico manual general",
      price: 800.0,
      color: "#16a34a", // Green/Green-600
    },
    {
      id: "TD_RESET",
      name: "TD / RESET",
      description: "Ajuste manual combinado con protocolo de reseteo neurológico",
      price: 950.0,
      color: "#7c3aed", // Purple/Purple-600
    },
    {
      id: "NAET",
      name: "NAET / Tx",
      description: "Técnica de eliminación de alergias / Terapia",
      price: 900.0,
      color: "#db2777", // Pink/Pink-600
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

  // 2. Seed Patients
  const patients = [
    {
      firstName: "ALMA INES",
      lastName: "PANG GALLARDO",
      phone1: "81 1290 4590",
      phone2: "",
      genderCode: "A02",
    },
    {
      firstName: "CLAUDIA CRISTINA",
      lastName: "GONZALEZ VEGA",
      phone1: "8120407851",
      phone2: "",
      genderCode: "A04",
    },
    {
      firstName: "MARIANA",
      lastName: "MIGUEL HINOJOSA",
      phone1: "044 811 511 3534",
      phone2: "1936 3236",
      genderCode: "A04",
    },
  ];

  for (const p of patients) {
    // Find if patient exists by first and last name
    const existing = await prisma.patient.findFirst({
      where: {
        firstName: p.firstName,
        lastName: p.lastName,
      },
    });

    if (!existing) {
      await prisma.patient.create({
        data: p,
      });
    }
  }
  console.log("Seeded default patients.");

  // 3. Seed AppConfig
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
