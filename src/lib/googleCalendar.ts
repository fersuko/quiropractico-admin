import { google } from "googleapis";
import { db } from "./db";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google-auth/callback";

export function getGoogleOAuthClient() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.warn("Google Calendar credentials are not configured in environment variables.");
  }
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export async function getGoogleAuthToken() {
  return await db.googleAuth.findUnique({
    where: { id: "default" },
  });
}

export async function syncAppointmentToGoogleCalendar(appointmentId: string) {
  try {
    const authData = await getGoogleAuthToken();
    if (!authData || !authData.refreshToken) {
      console.log("Google Calendar is not authorized. Skipping sync.");
      return null;
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: true,
        therapy: true,
      },
    });

    if (!appointment) {
      console.error(`Appointment not found for sync: ${appointmentId}`);
      return null;
    }

    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials({
      access_token: authData.accessToken,
      refresh_token: authData.refreshToken,
      expiry_date: authData.expiryDate ? Number(authData.expiryDate) : undefined,
    });

    // Check if access token is expired and refresh it
    oauth2Client.on("tokens", async (tokens) => {
      const updateData: any = {};
      if (tokens.access_token) updateData.accessToken = tokens.access_token;
      if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token;
      if (tokens.expiry_date) updateData.expiryDate = String(tokens.expiry_date);

      await db.googleAuth.upsert({
        where: { id: "default" },
        update: updateData,
        create: { id: "default", ...updateData },
      });
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Compute ISO start/end times in Monterrey timezone (UTC-6)
    // Monterrey does not use daylight saving time, so it is permanently UTC-6.
    const startISO = `${appointment.date}T${appointment.timeSlot}:00-06:00`;
    
    // Calculate end time (+15 mins)
    const [h, m] = appointment.timeSlot.split(":").map(Number);
    let endH = h;
    let endM = m + 15;
    if (endM >= 60) {
      endM -= 60;
      endH += 1;
    }
    const endHourStr = String(endH).padStart(2, "0");
    const endMinStr = String(endM).padStart(2, "0");
    const endISO = `${appointment.date}T${endHourStr}:${endMinStr}:00-06:00`;

    const summary = `${appointment.patient.firstName} ${appointment.patient.lastName} - ${appointment.therapy.name}${appointment.therapySubcategory ? ` (${appointment.therapySubcategory})` : ""} [Consultorio ${appointment.consultorio}]`;
    const description = `Paciente: ${appointment.patient.firstName} ${appointment.patient.lastName}\nTeléfono: ${appointment.patient.phone1}\nConsultorio: ${appointment.consultorio}\nTerapia: ${appointment.therapy.name}${appointment.therapySubcategory ? ` (${appointment.therapySubcategory})` : ""}\nEstatus Cita: ${appointment.status}\nEstatus Pago: ${appointment.paymentStatus}\nNotas: ${appointment.notes || "Ninguna"}`;

    const eventBody = {
      summary,
      description,
      start: {
        dateTime: startISO,
        timeZone: "America/Monterrey",
      },
      end: {
        dateTime: endISO,
        timeZone: "America/Monterrey",
      },
      colorId: getColorIdByTherapy(appointment.therapyId),
    };

    if (appointment.googleEventId) {
      try {
        const response = await calendar.events.update({
          calendarId: "primary",
          eventId: appointment.googleEventId,
          requestBody: eventBody,
        });
        console.log(`Updated Google Calendar event: ${response.data.id}`);
        return response.data.id;
      } catch (err: any) {
        // If event was deleted in Google Calendar, recreate it
        if (err.code === 410 || err.code === 404) {
          console.warn("Event not found in Google Calendar, creating a new one...");
          const response = await calendar.events.insert({
            calendarId: "primary",
            requestBody: eventBody,
          });
          const newEventId = response.data.id || "";
          await db.appointment.update({
            where: { id: appointmentId },
            data: { googleEventId: newEventId },
          });
          return newEventId;
        }
        throw err;
      }
    } else {
      const response = await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventBody,
      });
      const newEventId = response.data.id || "";
      await db.appointment.update({
        where: { id: appointmentId },
        data: { googleEventId: newEventId },
      });
      console.log(`Created Google Calendar event: ${newEventId}`);
      return newEventId;
    }
  } catch (error) {
    console.error("Error syncing to Google Calendar:", error);
    return null;
  }
}

export async function deleteAppointmentFromGoogleCalendar(appointmentId: string) {
  try {
    const authData = await getGoogleAuthToken();
    if (!authData || !authData.refreshToken) return;

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment || !appointment.googleEventId) return;

    const oauth2Client = getGoogleOAuthClient();
    oauth2Client.setCredentials({
      access_token: authData.accessToken,
      refresh_token: authData.refreshToken,
      expiry_date: authData.expiryDate ? Number(authData.expiryDate) : undefined,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    
    try {
      await calendar.events.delete({
        calendarId: "primary",
        eventId: appointment.googleEventId,
      });
      console.log(`Deleted Google Calendar event: ${appointment.googleEventId}`);
    } catch (err: any) {
      if (err.code !== 404 && err.code !== 410) {
        throw err;
      }
      console.log("Event already deleted from Google Calendar.");
    }

    await db.appointment.update({
      where: { id: appointmentId },
      data: { googleEventId: null },
    });
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error);
  }
}

function getColorIdByTherapy(therapyId: string): string {
  switch (therapyId) {
    case "CONSULTA":
      return "7"; // Peacock (Teal-ish)
    case "1ER_VEZ_CON_RX":
      return "9"; // Blueberry (Blue)
    case "1ER_VEZ_SIN_RX":
      return "10"; // Basil (Green)
    case "COMPARATIVO":
      return "8"; // Tangerine (Orange)
    case "TD":
      return "11"; // Tomato (Red)
    case "RESET":
      return "4"; // Flamingo (Lavender)
    default:
      return "1"; // Lavender (Default Blue)
  }
}
