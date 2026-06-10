"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  Activity,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  X,
  MessageSquare,
  Search,
  CheckSquare,
  Square,
  Download,
  AlertTriangle,
  LogOut,
  CalendarCheck,
  TrendingUp,
  CreditCard,
  UserCheck,
  Lock,
  Unlock,
  FileText,
  UserPlus,
  Shield,
  BarChart3,
  Edit,
  Trash2
} from "lucide-react";

// Intercept and prefix fetch calls automatically when deployed on a subpath
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let url = "";
    if (typeof input === "string") {
      url = input;
    } else if (input instanceof URL) {
      url = input.pathname + input.search;
    } else if (input && typeof input === "object" && "url" in input) {
      url = (input as any).url;
    }

    let newInit = init || {};
    if (url.startsWith("/api/")) {
      // Automatically add active user headers for backend validation
      const userJson = localStorage.getItem("quiropractico_user");
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          newInit.headers = {
            ...newInit.headers,
            "Content-Type": "application/json",
            "x-user-id": user.id || "",
            "x-user-role": user.role || "",
          };
        } catch (e) {
          console.error("Error setting request headers", e);
        }
      }

      if (window.location.pathname.startsWith("/quiropractico")) {
        const prefixedUrl = "/quiropractico" + url;
        if (typeof input === "string") {
          return originalFetch(prefixedUrl, newInit);
        } else if (input instanceof URL) {
          return originalFetch(new URL(prefixedUrl, window.location.origin), newInit);
        } else {
          return originalFetch(new Request(prefixedUrl, newInit as any), newInit);
        }
      }
    }
    return originalFetch(input, newInit);
  };
}

// Time Slots from 06:30 to 18:45 (15-min intervals)
const generateTimeSlots = () => {
  const slots = [];
  let h = 6;
  let m = 30;
  while (h < 19) {
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    slots.push(timeStr);
    m += 15;
    if (m >= 60) {
      m = 0;
      h += 1;
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();
const CONSULTORIOS = ["A", "B", "C", "D"];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Auth state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // General navigation
  const [activeTab, setActiveTab] = useState("agenda");
  const [selectedDate, setSelectedDate] = useState("");
  
  // Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [blockouts, setBlockouts] = useState<any[]>([]);
  const [therapies, setTherapies] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [appConfig, setAppConfig] = useState<any>({});
  const [googleAuth, setGoogleAuth] = useState({ isAuthorized: false, updatedAt: null });
  
  // Finance Statistics
  const [financeSummary, setFinanceSummary] = useState<any>({ dailyTotal: 0, totalDebt: 0, dailyPayments: [], dailyPaymentsCount: 0 });

  // UI States
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [patientStatusFilter, setPatientStatusFilter] = useState("");
  const [patientTherapyFilter, setPatientTherapyFilter] = useState("");

  // Expediente / Historial Clínico state
  const [activeExpedientePatient, setActiveExpedientePatient] = useState<any>(null);
  const [expedienteHistory, setExpedienteHistory] = useState<any>({ patient: null, records: [], appointments: [] });
  const [expedienteLoading, setExpedienteLoading] = useState(false);
  const [newClinicalNote, setNewClinicalNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  
  // Modals state
  const [appointmentModal, setAppointmentModal] = useState<{
    show: boolean;
    appointment?: any;
    prefill?: { timeSlot: string; consultorio: string };
  }>({ show: false });
  const [patientModal, setPatientModal] = useState<{ show: boolean; patient?: any }>({ show: false });
  const [paymentModal, setPaymentModal] = useState<{ show: boolean; appointment?: any }>({ show: false });
  
  // Blockout schedule modal state
  const [blockoutModal, setBlockoutModal] = useState({
    show: false,
    date: "",
    type: "15_MIN",
    timeSlot: "07:00",
    halfDayType: "Mañana",
    consultorio: "TODOS",
    reason: ""
  });

  // Settings: Users management state
  const [activeSettingsSubtab, setActiveSettingsSubtab] = useState("whatsapp"); // "whatsapp" | "google" | "users" | "backup"
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userModal, setUserModal] = useState<{ show: boolean; user?: any }>({ show: false });
  const [userFormName, setUserFormName] = useState("");
  const [userFormUsername, setUserFormUsername] = useState("");
  const [userFormPassword, setUserFormPassword] = useState("");
  const [userFormRole, setUserFormRole] = useState("Doctor");

  // Initialize
  useEffect(() => {
    setMounted(true);
    
    // Set today's date
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);

    // Check logged in user
    const savedUser = localStorage.getItem("quiropractico_user");
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("quiropractico_user");
      }
    }
  }, []);

  // Fetch data
  useEffect(() => {
    if (!mounted || !selectedDate || !currentUser) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch therapies (needed globally)
        const resTherapies = await fetch("/api/therapies");
        const dataTherapies = await resTherapies.json();
        setTherapies(dataTherapies);

        // Fetch blockouts for selected date (agenda tab)
        if (activeTab === "agenda") {
          const resBlockouts = await fetch(`/api/blockouts?date=${selectedDate}`);
          const dataBlockouts = await resBlockouts.json();
          setBlockouts(Array.isArray(dataBlockouts) ? dataBlockouts : []);

          const resAppts = await fetch(`/api/appointments?date=${selectedDate}`);
          const dataAppts = await resAppts.json();
          setAppointments(Array.isArray(dataAppts) ? dataAppts : []);
        } else if (activeTab === "patients") {
          const params = new URLSearchParams();
          if (searchQuery) params.append("q", searchQuery);
          if (patientStatusFilter) params.append("status", patientStatusFilter);
          if (patientTherapyFilter) params.append("therapyId", patientTherapyFilter);

          const resPatients = await fetch(`/api/patients?${params.toString()}`);
          const dataPatients = await resPatients.json();
          setPatients(Array.isArray(dataPatients) ? dataPatients : []);
        } else if (activeTab === "payments") {
          // If Doctor, block access
          if (currentUser.role === "Doctor") {
            setActiveTab("agenda");
            return;
          }
          const resFinance = await fetch(`/api/payments?mode=summary&date=${selectedDate}`);
          const dataFinance = await resFinance.json();
          setFinanceSummary(dataFinance);
        } else if (activeTab === "settings") {
          const resConfig = await fetch("/api/config");
          const dataConfig = await resConfig.json();
          setAppConfig(dataConfig);

          const resGoogle = await fetch("/api/google-auth?action=status");
          const dataGoogle = await resGoogle.json();
          setGoogleAuth(dataGoogle);

          if (currentUser.role === "Admin") {
            const resUsers = await fetch("/api/users");
            const dataUsers = await resUsers.json();
            setUsersList(Array.isArray(dataUsers) ? dataUsers : []);
          }
        }
      } catch (err) {
        console.error("Error loading page data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [mounted, selectedDate, activeTab, searchQuery, patientStatusFilter, patientTherapyFilter, currentUser]);

  // Load patient clinical history details
  const loadPatientClinicalHistory = async (patientId: string) => {
    setExpedienteLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/history`);
      const data = await res.json();
      setExpedienteHistory(data);
    } catch (e) {
      console.error(e);
      alert("Error cargando el expediente clínico");
    } finally {
      setExpedienteLoading(false);
    }
  };

  useEffect(() => {
    if (activeExpedientePatient) {
      loadPatientClinicalHistory(activeExpedientePatient.id);
    }
  }, [activeExpedientePatient]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0e17] text-teal-500">
        <div className="text-xl font-semibold tracking-wide animate-pulse">Iniciando aplicación...</div>
      </div>
    );
  }

  // Handle login submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setAuthLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem("quiropractico_user", JSON.stringify(user));
        setCurrentUser(user);
        setActiveTab("agenda");
      } else {
        const err = await res.json();
        setLoginError(err.error || "Credenciales incorrectas");
      }
    } catch (err) {
      setLoginError("Error de comunicación con el servidor");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    if (confirm("¿Estás seguro de que deseas cerrar sesión?")) {
      localStorage.removeItem("quiropractico_user");
      setCurrentUser(null);
      setActiveTab("agenda");
      setLoginUsername("");
      setLoginPassword("");
    }
  };

  // Verify cell block status
  // Returns block detail if blocked, otherwise null
  const getCellBlockout = (slot: string, consultorio: string) => {
    return blockouts.find((b) => {
      // 1. Matches consultorio (either specific A-D or TODOS)
      const matchesConsultorio = b.consultorio === consultorio || b.consultorio === "TODOS";
      if (!matchesConsultorio) return false;

      // 2. Matches duration
      if (b.type === "FULL_DAY") return true;
      if (b.type === "HALF_DAY") {
        const [hour] = slot.split(":").map(Number);
        if (b.halfDayType === "Mañana") {
          // Morning shifts are from 06:30 to 12:45
          return hour < 13;
        } else {
          // Afternoon shifts are from 13:00 to 18:45
          return hour >= 13;
        }
      }
      if (b.type === "HOUR") {
        // Blocks 4 slots starting from timeSlot
        const slotIdx = TIME_SLOTS.indexOf(b.timeSlot);
        const currentIdx = TIME_SLOTS.indexOf(slot);
        return currentIdx >= slotIdx && currentIdx < slotIdx + 4;
      }
      if (b.type === "15_MIN") {
        return b.timeSlot === slot;
      }
      return false;
    });
  };

  const getAppointment = (timeSlot: string, consultorio: string) => {
    return appointments.find(
      (app) => app.timeSlot === timeSlot && app.consultorio === consultorio
    );
  };

  // Create blockout
  const handleSaveBlockout = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/blockouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          type: blockoutModal.type,
          timeSlot: blockoutModal.timeSlot,
          halfDayType: blockoutModal.halfDayType,
          consultorio: blockoutModal.consultorio,
          reason: blockoutModal.reason,
        }),
      });

      if (res.ok) {
        setBlockoutModal({ ...blockoutModal, show: false, reason: "" });
        // Refresh blockouts list
        const resBlockouts = await fetch(`/api/blockouts?date=${selectedDate}`);
        const dataBlockouts = await resBlockouts.json();
        setBlockouts(Array.isArray(dataBlockouts) ? dataBlockouts : []);
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear bloqueo");
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  // Delete blockout
  const handleDeleteBlockout = async (blockId: string) => {
    if (!confirm("¿Deseas quitar este bloqueo de horario?")) return;
    try {
      const res = await fetch(`/api/blockouts?id=${blockId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBlockouts(blockouts.filter((b) => b.id !== blockId));
      } else {
        alert("Error al borrar bloqueo");
      }
    } catch (e) {
      alert("Error de conexión");
    }
  };

  // WhatsApp Message Generator
  const sendWhatsApp = (appointment: any) => {
    const pName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;
    const dateFormatted = appointment.date.split("-").reverse().join("/");
    
    let text = appConfig.whatsappTemplate || "Hola {paciente}, te recordamos tu cita de {terapia} el {fecha} a las {hora}. Confírmanos por este medio.";
    text = text
      .replace(/{paciente}/g, pName)
      .replace(/{terapia}/g, appointment.therapy.name)
      .replace(/{fecha}/g, dateFormatted)
      .replace(/{hora}/g, appointment.timeSlot);

    const encodedText = encodeURIComponent(text);
    const phone = appointment.patient.phone1.replace(/\s+/g, "");
    window.open(`https://wa.me/${phone}?text=${encodedText}`, "_blank");
  };

  // Toggle Rx status directly
  const toggleRx = async (appointment: any) => {
    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointment.id, rx: !appointment.rx }),
      });
      if (res.ok) {
        const updatedAppt = await res.json();
        setAppointments(appointments.map(a => a.id === updatedAppt.id ? { ...a, rx: updatedAppt.rx } : a));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Quick cycle appointment status
  const cycleStatus = async (appointment: any) => {
    const statuses = ["Agendada", "Confirmada", "Cancelada"];
    const currentIndex = statuses.indexOf(appointment.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    try {
      const res = await fetch("/api/appointments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: appointment.id, status: nextStatus }),
      });
      if (res.ok) {
        const updatedAppt = await res.json();
        setAppointments(appointments.map(a => a.id === updatedAppt.id ? { ...a, status: updatedAppt.status } : a));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async (apptId: string) => {
    if (!confirm("¿Deseas eliminar esta cita permanentemente?")) return;
    try {
      const res = await fetch(`/api/appointments?id=${apptId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAppointments(appointments.filter((a) => a.id !== apptId));
        setAppointmentModal({ show: false });
      } else {
        const err = await res.json();
        alert(err.error || "No tienes permiso para eliminar esta cita.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Google Calendar Auth URL
  const connectGoogleCalendar = async () => {
    try {
      const res = await fetch("/api/google-auth?action=auth-url");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert("Error al obtener la URL de Google Auth");
    }
  };

  // Google Calendar Disconnect
  const disconnectGoogleCalendar = async () => {
    if (!confirm("¿Seguro que deseas desconectar la sincronización de Google Calendar?")) return;
    try {
      const res = await fetch("/api/google-auth?action=disconnect");
      const data = await res.json();
      if (data.success) {
        setGoogleAuth({ isAuthorized: false, updatedAt: null });
        alert("Desconectado de Google Calendar");
      }
    } catch (err) {
      alert("Error al desconectar");
    }
  };

  // Save new clinical history note
  const handleAddClinicalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClinicalNote.trim()) return;

    setSavingNote(true);
    try {
      const res = await fetch(`/api/patients/${activeExpedientePatient.id}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: newClinicalNote,
          userId: currentUser.id,
          date: new Date().toISOString().split("T")[0],
        }),
      });

      if (res.ok) {
        setNewClinicalNote("");
        // Reload history
        loadPatientClinicalHistory(activeExpedientePatient.id);
      } else {
        alert("Error al guardar la nota clínica");
      }
    } catch (e) {
      alert("Error de red al guardar nota");
    } finally {
      setSavingNote(false);
    }
  };

  // Users Tab management
  const handleOpenUserCreate = () => {
    setUserModal({ show: true });
    setUserFormName("");
    setUserFormUsername("");
    setUserFormPassword("");
    setUserFormRole("Doctor");
  };

  const handleOpenUserEdit = (user: any) => {
    setUserModal({ show: true, user });
    setUserFormName(user.name);
    setUserFormUsername(user.username);
    setUserFormPassword(""); // Leave empty if not changing
    setUserFormRole(user.role);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = userModal.user ? "PUT" : "POST";
      const payload: any = {
        id: userModal.user?.id,
        username: userFormUsername,
        name: userFormName,
        role: userFormRole,
      };
      if (userFormPassword || !userModal.user) {
        payload.password = userFormPassword;
      }

      const res = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setUserModal({ show: false });
        // Refresh users
        const resUsers = await fetch("/api/users");
        const dataUsers = await resUsers.json();
        setUsersList(Array.isArray(dataUsers) ? dataUsers : []);
      } else {
        const err = await res.json();
        alert(err.error || "Ocurrió un error");
      }
    } catch (e) {
      alert("Error al guardar usuario");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Deseas eliminar este usuario?")) return;
    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsersList(usersList.filter((u) => u.id !== userId));
      } else {
        alert("Error al borrar usuario");
      }
    } catch (e) {
      alert("Error de red");
    }
  };

  // RENDER: LOGIN OVERLAY
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0e17] px-4 relative overflow-hidden">
        {/* Dynamic Glowing Background Orbs */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-5000"></div>

        <form
          onSubmit={handleLogin}
          className="glass p-8 w-full max-w-md bg-[#121826]/80 flex flex-col gap-6 text-left glow-teal border border-white/5 relative z-10"
        >
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-teal-950/50 border border-teal-500/30 rounded-xl flex items-center justify-center text-teal-400 mb-4">
              <Activity size={28} />
            </div>
            <h2 className="font-extrabold text-lg text-white leading-tight uppercase tracking-wider">Centro Quiropráctico de Monterrey</h2>
            <p className="text-xs text-slate-400 mt-1.5 font-medium">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold tracking-wide">Nombre de Usuario</label>
            <input
              type="text"
              required
              placeholder="Ej. admin, recepcion, doctor"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              className="bg-[#1b2336] focus:border-teal-500 focus:ring-0 text-sm py-2.5"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold tracking-wide">Contraseña</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="bg-[#1b2336] focus:border-teal-500 focus:ring-0 text-sm py-2.5"
            />
          </div>

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-3 mt-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm tracking-wide rounded-xl border border-teal-500/20 transition flex items-center justify-center gap-2"
          >
            {authLoading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>Entrar al Sistema</span>
            )}
          </button>
        </form>
      </div>
    );
  }

  // RENDER: MAIN APPLICATION SYSTEM
  return (
    <div className="flex h-screen bg-[#0a0e17] text-white">
      {/* Sidebar Layout */}
      <aside className="w-[260px] bg-[#121826] border-r border-white/5 flex flex-col justify-between p-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-teal-950/50 border border-teal-500/20 rounded-xl text-teal-400">
              <Activity size={24} />
            </div>
            <div>
              <h2 className="font-bold text-[11px] tracking-wider leading-tight uppercase text-slate-300">Centro Quiropráctico de Monterrey</h2>
              <span className="text-[11px] text-teal-400 font-semibold block mt-0.5">Dr. David Rodríguez Garita</span>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => {
                setActiveTab("agenda");
                setActiveExpedientePatient(null);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                activeTab === "agenda"
                  ? "bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <CalendarIcon size={18} />
              <span>Agenda Diaria</span>
            </button>
            
            <button
              onClick={() => {
                setActiveTab("patients");
                setActiveExpedientePatient(null);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                activeTab === "patients"
                  ? "bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users size={18} />
              <span>Pacientes</span>
            </button>

            {currentUser.role !== "Doctor" && (
              <button
                onClick={() => {
                  setActiveTab("payments");
                  setActiveExpedientePatient(null);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                  activeTab === "payments"
                    ? "bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <DollarSign size={18} />
                <span>Caja e Ingresos</span>
              </button>
            )}

            {currentUser.role === "Admin" && (
              <button
                onClick={() => {
                  setActiveTab("reportes");
                  setActiveExpedientePatient(null);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                  activeTab === "reportes"
                    ? "bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <BarChart3 size={18} />
                <span>Reportes</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveTab("therapies");
                setActiveExpedientePatient(null);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                activeTab === "therapies"
                  ? "bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Activity size={18} />
              <span>Terapias</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("settings");
                setActiveExpedientePatient(null);
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                activeTab === "settings"
                  ? "bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <SettingsIcon size={18} />
              <span>Configuración</span>
            </button>
          </nav>
        </div>

        {/* User Account Session Info */}
        <div className="flex flex-col gap-3 p-4 bg-slate-900/60 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Sesión Activa</p>
              <h4 className="text-xs text-slate-200 font-bold truncate mt-0.5">{currentUser.name}</h4>
              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-[8px] font-black uppercase text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-md">
                <Shield size={8} /> {currentUser.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              title="Cerrar Sesión"
              className="p-2 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent rounded-lg text-slate-400 hover:text-rose-400 transition"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0e17] overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-[70px] bg-[#121826]/40 border-b border-white/5 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight">
              {activeExpedientePatient ? `Expediente Clínico: ${activeExpedientePatient.lastName}, ${activeExpedientePatient.firstName}` : (
                <>
                  {activeTab === "agenda" && "Agenda de Consultas"}
                  {activeTab === "patients" && "Registro de Pacientes"}
                  {activeTab === "payments" && "Gestión Financiera"}
                  {activeTab === "reportes" && "Reportes y Estadísticas Administrativas"}
                  {activeTab === "therapies" && "Catálogo de Servicios y Terapias"}
                  {activeTab === "settings" && "Configuración del Sistema"}
                </>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {activeTab === "agenda" && !activeExpedientePatient && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBlockoutModal({ ...blockoutModal, show: true, date: selectedDate })}
                  className="px-3.5 py-1.5 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                >
                  <Lock size={13} />
                  <span>Bloquear Horario</span>
                </button>

                <div className="flex items-center gap-2 bg-[#121826] border border-white/5 p-1 rounded-xl">
                  <button
                    onClick={() => {
                      const prev = new Date(selectedDate);
                      prev.setDate(prev.getDate() - 1);
                      setSelectedDate(prev.toISOString().split("T")[0]);
                    }}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-0 py-1 px-2 text-sm font-semibold text-teal-400 cursor-pointer outline-none focus:ring-0"
                  />
                  <button
                    onClick={() => {
                      const next = new Date(selectedDate);
                      next.setDate(next.getDate() + 1);
                      setSelectedDate(next.toISOString().split("T")[0]);
                    }}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                    className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 rounded-lg transition"
                  >
                    Hoy
                  </button>
                </div>
              </div>
            )}
            
            <div className="text-xs font-semibold px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg select-none">
              Online VPS
            </div>
          </div>
        </header>

        {/* Tab View Container */}
        <section className="flex-1 overflow-auto p-8">
          {loading && !activeExpedientePatient ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* VISTA: EXPEDIENTE CLÍNICO */}
              {activeExpedientePatient ? (
                <div className="flex flex-col gap-6 text-left">
                  {/* Header & Back Button */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <button
                      onClick={() => setActiveExpedientePatient(null)}
                      className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                    >
                      <ChevronLeft size={16} />
                      <span>Volver al Listado</span>
                    </button>
                    <span className="text-xs text-slate-400 font-semibold">Expediente ID: {activeExpedientePatient.id}</span>
                  </div>

                  {expedienteLoading ? (
                    <div className="flex justify-center py-20">
                      <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: General Info & Clinical Timeline */}
                      <div className="lg:col-span-2 flex flex-col gap-6">
                        {/* Summary Info */}
                        <div className="glass p-6 bg-[#121826]/30 flex flex-col gap-4">
                          <h3 className="font-extrabold text-sm text-teal-400 border-b border-white/5 pb-2 uppercase tracking-wider">Detalles Generales del Paciente</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                            <div>
                              <p className="text-slate-500 font-medium">Nombre completo</p>
                              <p className="text-sm font-bold text-white mt-0.5">{expedienteHistory.patient?.firstName} {expedienteHistory.patient?.lastName}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-medium">Teléfono Principal</p>
                              <p className="text-sm font-bold text-white mt-0.5">{expedienteHistory.patient?.phone1}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-medium">Teléfono Secundario</p>
                              <p className="text-sm font-bold text-white mt-0.5">{expedienteHistory.patient?.phone2 || "—"}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-medium">Género</p>
                              <p className="text-sm font-bold text-white mt-0.5">{expedienteHistory.patient?.gender}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-medium">Estatus</p>
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-md border mt-1 ${
                                expedienteHistory.patient?.status === "Activo"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : expedienteHistory.patient?.status === "En tratamiento"
                                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                  : "bg-slate-800 text-slate-400 border-white/5"
                              }`}>
                                {expedienteHistory.patient?.status}
                              </span>
                            </div>
                            <div>
                              <p className="text-slate-500 font-medium">Terapia Habitual</p>
                              <p className="text-sm font-bold text-white mt-0.5">{expedienteHistory.patient?.therapy?.name || "No asignada"}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-medium">¿Estudios de RX (Radiografías)?</p>
                              <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-md border mt-1 ${
                                expedienteHistory.patient?.rx
                                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              }`}>
                                {expedienteHistory.patient?.rx ? "Sí" : "No"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Add Clinical Note Form */}
                        <form onSubmit={handleAddClinicalNote} className="glass p-6 bg-[#121826]/30 flex flex-col gap-4">
                          <h3 className="font-extrabold text-sm text-teal-400 border-b border-white/5 pb-2 uppercase tracking-wider">Registrar Nueva Nota Clínica</h3>
                          <div className="flex flex-col gap-2">
                            <textarea
                              rows={3}
                              placeholder="Introduce detalles médicos, dolores, ajustes realizados, evolución..."
                              value={newClinicalNote}
                              onChange={(e) => setNewClinicalNote(e.target.value)}
                              className="w-full bg-[#1b2336] border-white/5 text-xs p-3 leading-relaxed"
                              required
                            />
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={savingNote}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-white font-bold text-xs rounded-xl border border-teal-500/20 transition"
                            >
                              {savingNote ? "Guardando Nota..." : "Guardar Nota Clínica"}
                            </button>
                          </div>
                        </form>

                        {/* Clinical Note History */}
                        <div className="glass p-6 bg-[#121826]/30 flex flex-col gap-4">
                          <h3 className="font-extrabold text-sm text-teal-400 border-b border-white/5 pb-2 uppercase tracking-wider">Historial Clínico (Notas Médicas)</h3>
                          <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto pr-2">
                            {expedienteHistory.records.length > 0 ? (
                              expedienteHistory.records.map((r: any) => (
                                <div key={r.id} className="p-3.5 bg-slate-900/40 border border-white/5 rounded-xl flex flex-col gap-1.5">
                                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                                    <span className="font-bold">{r.date.split("-").reverse().join("/")}</span>
                                    <span className="font-semibold text-teal-400 bg-teal-500/5 px-2 py-0.5 border border-teal-500/10 rounded-md">Atendido por: {r.user.name} ({r.user.role})</span>
                                  </div>
                                  <p className="text-xs text-slate-200 mt-1 leading-relaxed whitespace-pre-line">{r.notes}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-xs text-slate-500 py-6">El expediente no registra notas clínicas previas.</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Appointments History */}
                      <div className="lg:col-span-1 flex flex-col gap-6">
                        <div className="glass p-6 bg-[#121826]/30 flex flex-col gap-4 h-full">
                          <h3 className="font-extrabold text-sm text-teal-400 border-b border-white/5 pb-2 uppercase tracking-wider">Historial de Citas</h3>
                          <div className="flex flex-col gap-4 overflow-y-auto max-h-[80vh] pr-1">
                            {expedienteHistory.appointments.length > 0 ? (
                              expedienteHistory.appointments.map((a: any) => (
                                <div
                                  key={a.id}
                                  className={`p-3.5 border rounded-xl text-xs flex flex-col gap-1 hover:bg-white/[0.01] transition ${
                                    a.status === "Cancelada"
                                      ? "bg-slate-900/30 border-white/5 opacity-40 line-through"
                                      : "bg-slate-900/50 border-white/5"
                                  }`}
                                >
                                  <div className="flex items-center justify-between font-bold">
                                    <span className="text-white">{a.date.split("-").reverse().join("/")}</span>
                                    <span className="text-teal-400">{a.timeSlot} hs</span>
                                  </div>
                                  <div className="mt-1 flex flex-col gap-1 text-slate-300">
                                    <p><strong className="text-slate-400">Consultorio:</strong> {a.consultorio}</p>
                                    <p><strong className="text-slate-400">Terapia:</strong> {a.therapy.name} {a.therapySubcategory ? `(${a.therapySubcategory})` : ""}</p>
                                    <p><strong className="text-slate-400">Estatus:</strong> {a.status} • {a.paymentStatus}</p>
                                    {a.user && <p><strong className="text-slate-400">Doctor/a:</strong> {a.user.name}</p>}
                                    {a.notes && (
                                      <p className="italic text-slate-400 border-l-2 border-white/10 pl-2 mt-1">
                                        "{a.notes}"
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-xs text-slate-500 py-6">El paciente no registra citas previas en la agenda.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* TAB 1: AGENDA DE CITAS */}
                  {activeTab === "agenda" && (
                    <div className="flex flex-col gap-6 text-left">
                      {/* Daily Metric Grid */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="glass p-5 flex items-center gap-4 bg-[#121826]/30">
                          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                            <CalendarCheck size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Citas Programadas</p>
                            <h4 className="text-xl font-bold">{appointments.filter(a => a.status !== "Cancelada").length}</h4>
                          </div>
                        </div>
                        <div className="glass p-5 flex items-center gap-4 bg-[#121826]/30">
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                            <UserCheck size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Citas Confirmadas</p>
                            <h4 className="text-xl font-bold">{appointments.filter(a => a.status === "Confirmada").length}</h4>
                          </div>
                        </div>
                        <div className="glass p-5 flex items-center gap-4 bg-[#121826]/30">
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                            <AlertTriangle size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Pagos Pendientes</p>
                            <h4 className="text-xl font-bold">{appointments.filter(a => a.paymentStatus === "Pendiente" && a.status !== "Cancelada").length}</h4>
                          </div>
                        </div>
                        <div className="glass p-5 flex items-center gap-4 bg-[#121826]/30">
                          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                            <X size={20} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Citas Canceladas</p>
                            <h4 className="text-xl font-bold">{appointments.filter(a => a.status === "Cancelada").length}</h4>
                          </div>
                        </div>
                      </div>

                      {/* Main Agenda Grid Matrix */}
                      <div className="glass overflow-hidden border border-white/5">
                        {/* sticky table header */}
                        <div className="grid grid-cols-[100px_repeat(4,1fr)] bg-[#121826] border-b border-white/5 font-semibold text-xs tracking-wider text-slate-400 uppercase py-4 text-center sticky top-0 z-10 select-none">
                          <div>Hora</div>
                          {CONSULTORIOS.map(c => <div key={c}>Consultorio {c}</div>)}
                        </div>

                        {/* Timeline Rows */}
                        <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
                          {TIME_SLOTS.map((slot) => (
                            <div key={slot} className="grid grid-cols-[100px_repeat(4,1fr)] min-h-[75px] items-stretch">
                              {/* Time Column */}
                              <div className="flex items-center justify-center font-bold text-sm bg-slate-900/10 text-slate-400 border-r border-white/5 select-none">
                                {slot}
                              </div>

                              {/* Consultorio Columns */}
                              {CONSULTORIOS.map((consultorio) => {
                                const app = getAppointment(slot, consultorio);
                                const block = getCellBlockout(slot, consultorio);

                                return (
                                  <div
                                    key={consultorio}
                                    className="p-2 border-r border-white/5 last:border-0 flex items-stretch relative group hover:bg-white/[0.01] transition"
                                  >
                                    {block ? (
                                      /* BLOCKED SLOT CARD */
                                      <div className="w-full rounded-lg p-2.5 bg-rose-950/20 border border-rose-500/20 flex flex-col justify-between text-left select-none relative group">
                                        <div className="flex items-start justify-between gap-1">
                                          <div>
                                            <h5 className="font-extrabold text-[10px] uppercase text-rose-400 tracking-wider flex items-center gap-1.5">
                                              <Lock size={10} /> No Disponible
                                            </h5>
                                            <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[140px] font-medium italic">
                                              {block.reason || "Horario bloqueado"}
                                            </p>
                                          </div>
                                          
                                          {/* Delete blockout button */}
                                          <button
                                            onClick={() => handleDeleteBlockout(block.id)}
                                            title="Desbloquear horario"
                                            className="p-1 hover:bg-rose-500/10 hover:border-rose-500/20 border border-transparent rounded text-rose-400 opacity-0 group-hover:opacity-100 transition duration-150"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                        <span className="text-[8px] text-slate-500 uppercase font-semibold mt-2.5">
                                          Bloqueo {block.type.replace("_", " ")}
                                        </span>
                                      </div>
                                    ) : app ? (
                                      /* BOOKED SLOT CARD */
                                      <div
                                        className={`w-full rounded-lg p-2.5 flex flex-col justify-between text-left transition select-none ${
                                          app.status === "Cancelada"
                                            ? "bg-slate-900/50 border border-white/5 opacity-40 line-through"
                                            : "bg-[#182235]/60 hover:bg-[#1f2d47]/60 border border-white/10"
                                        }`}
                                        style={{
                                          borderLeft: app.status !== "Cancelada" ? `4px solid ${app.therapy.color}` : undefined
                                        }}
                                      >
                                        <div className="flex items-start justify-between gap-1">
                                          <div>
                                            <h5 className="font-bold text-xs truncate max-w-[140px] text-white">
                                              {app.patient.firstName} {app.patient.lastName}
                                            </h5>
                                            <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                              {app.therapy.name} {app.therapySubcategory ? `(${app.therapySubcategory})` : ""}
                                            </span>
                                          </div>
                                          
                                          <button
                                            onClick={() => toggleRx(app)}
                                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition ${
                                              app.rx
                                                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                                                : "bg-slate-800 text-slate-500 hover:text-slate-300"
                                            }`}
                                          >
                                            Rx
                                          </button>
                                        </div>

                                        <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-white/5">
                                          <div className="flex items-center gap-1.5">
                                            {/* Status Badge */}
                                            <button
                                              onClick={() => cycleStatus(app)}
                                              className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wider ${
                                                app.status === "Confirmada"
                                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                  : app.status === "Cancelada"
                                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                              }`}
                                            >
                                              {app.status}
                                            </button>
                                            
                                            {/* Payment Badge */}
                                            {currentUser.role !== "Doctor" && (
                                              <button
                                                onClick={() => setPaymentModal({ show: true, appointment: app })}
                                                className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wider ${
                                                  app.paymentStatus === "Pagado"
                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                    : app.paymentStatus === "Parcial"
                                                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                }`}
                                              >
                                                ${app.therapy.price} ({app.paymentStatus})
                                              </button>
                                            )}
                                          </div>

                                          {/* Quick Actions */}
                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                                            {currentUser.role !== "Doctor" && (
                                              <button
                                                onClick={() => sendWhatsApp(app)}
                                                title="WhatsApp Recordatorio"
                                                className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-md transition animate-fadeIn"
                                              >
                                                <MessageSquare size={11} />
                                              </button>
                                            )}
                                            <button
                                              onClick={() => setAppointmentModal({ show: true, appointment: app })}
                                              title="Ver/Editar Cita"
                                              className="p-1 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 rounded-md transition"
                                            >
                                              <SettingsIcon size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      /* EMPTY CELL PLACEHOLDER */
                                      currentUser.role !== "Doctor" ? (
                                        <button
                                          onClick={() =>
                                            setAppointmentModal({
                                              show: true,
                                              prefill: { timeSlot: slot, consultorio },
                                            })
                                          }
                                          className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 border border-dashed border-teal-500/20 bg-teal-500/[0.02] hover:bg-teal-500/[0.05] rounded-lg transition py-3"
                                        >
                                          <Plus className="text-teal-400" size={16} />
                                        </button>
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 select-none">
                                          <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Cerrado</span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: REGISTRO DE PACIENTES */}
                  {activeTab === "patients" && (
                    <div className="flex flex-col gap-6 text-left">
                      {/* Action & Filter Bar */}
                      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-3 flex-1">
                          <div className="relative flex-1 max-w-xs">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              type="text"
                              placeholder="Buscar paciente o teléfono..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 bg-[#121826] border-white/5"
                            />
                          </div>

                          {/* Filter by status */}
                          <select
                            value={patientStatusFilter}
                            onChange={(e) => setPatientStatusFilter(e.target.value)}
                            className="bg-[#121826] text-xs py-2 px-3 focus:ring-0 outline-none"
                          >
                            <option value="">-- Todos los Estatus --</option>
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                            <option value="En tratamiento">En tratamiento</option>
                          </select>

                          {/* Filter by therapy type */}
                          <select
                            value={patientTherapyFilter}
                            onChange={(e) => setPatientTherapyFilter(e.target.value)}
                            className="bg-[#121826] text-xs py-2 px-3 focus:ring-0 outline-none max-w-[150px]"
                          >
                            <option value="">-- Todas las Terapias --</option>
                            {therapies.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        {currentUser.role !== "Doctor" && (
                          <button
                            onClick={() => setPatientModal({ show: true })}
                            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition"
                          >
                            <Plus size={16} />
                            <span>Nuevo Paciente</span>
                          </button>
                        )}
                      </div>

                      {/* Patients Table */}
                      <div className="glass overflow-hidden border border-white/5">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-[#121826] border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider select-none">
                              <th className="p-4">Paciente</th>
                              <th className="p-4">Teléfono Principal (1)</th>
                              <th className="p-4">Teléfono Opcional (2)</th>
                              <th className="p-4">Género</th>
                              <th className="p-4">Estatus</th>
                              <th className="p-4">Terapia Inicial / Actual</th>
                              <th className="p-4 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-sm">
                            {patients.length > 0 ? (
                              patients.map((p) => (
                                <tr key={p.id} className="hover:bg-white/[0.01] transition">
                                  <td className="p-4 font-bold text-white uppercase">
                                    {p.lastName}, {p.firstName}
                                  </td>
                                  <td className="p-4 text-slate-300">{p.phone1}</td>
                                  <td className="p-4 text-slate-400">{p.phone2 || "—"}</td>
                                  <td className="p-4 text-slate-300">{p.gender}</td>
                                  <td className="p-4">
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${
                                      p.status === "Activo"
                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                        : p.status === "En tratamiento"
                                        ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                        : "bg-slate-800 text-slate-400 border-white/5"
                                    }`}>
                                      {p.status}
                                    </span>
                                  </td>
                                  <td className="p-4 text-slate-300 font-medium">
                                    {p.therapy?.name || "No asignada"} {p.therapySubcategory ? `(${p.therapySubcategory})` : ""}
                                  </td>
                                  <td className="p-4 text-right flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => setActiveExpedientePatient(p)}
                                      className="text-teal-400 hover:text-teal-300 font-semibold text-xs bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg border border-teal-500/20 transition flex items-center gap-1.5"
                                    >
                                      <FileText size={12} />
                                      <span>Expediente</span>
                                    </button>
                                    <button
                                      onClick={() => setPatientModal({ show: true, patient: p })}
                                      className="text-slate-300 hover:text-white font-semibold text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 transition flex items-center gap-1.5"
                                    >
                                      <Edit size={12} />
                                      <span>Editar</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="p-8 text-center text-slate-500">
                                  No se encontraron pacientes registrados con los filtros activos.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: CAJA E INGRESOS (EXCLUDES DOCTORS) */}
                  {activeTab === "payments" && currentUser.role !== "Doctor" && (
                    <div className="flex flex-col gap-6 text-left">
                      {/* Overview Metrics */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="glass p-6 flex items-center gap-5 bg-[#121826]/30">
                          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
                            <TrendingUp size={28} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Recaudación Diaria ({selectedDate.split("-").reverse().join("/")})</p>
                            <h3 className="text-2xl font-black text-emerald-400 mt-1">${financeSummary.dailyTotal}</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">{financeSummary.dailyPaymentsCount} pagos registrados hoy</p>
                          </div>
                        </div>
                        
                        <div className="glass p-6 flex items-center gap-5 bg-[#121826]/30">
                          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
                            <CreditCard size={28} />
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 font-medium">Adeudos Totales por Cobrar</p>
                            <h3 className="text-2xl font-black text-rose-400 mt-1">${financeSummary.totalDebt}</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">Control manual interno de adeudos de terapias</p>
                          </div>
                        </div>
                      </div>

                      {/* Lists Container */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Payments of the day */}
                        <div className="glass p-6 flex flex-col gap-4">
                          <h3 className="font-bold text-sm text-slate-300 border-b border-white/5 pb-3">Cortes de Caja de Hoy</h3>
                          <div className="overflow-y-auto max-h-[40vh] divide-y divide-white/5">
                            {financeSummary.dailyPayments && financeSummary.dailyPayments.length > 0 ? (
                              financeSummary.dailyPayments.map((p: any) => (
                                <div key={p.id} className="py-3 flex items-center justify-between text-xs hover:bg-white/[0.01] px-1 rounded transition">
                                  <div>
                                    <h5 className="font-bold text-white">
                                      {p.appointment.patient.firstName} {p.appointment.patient.lastName}
                                    </h5>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      {p.appointment.therapy.name} • {p.method} • {p.appointment.timeSlot} hs
                                    </p>
                                  </div>
                                  <span className="font-extrabold text-sm text-emerald-400">${p.amount}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-slate-500 text-xs py-8 text-center">No se han registrado pagos hoy.</p>
                            )}
                          </div>
                        </div>

                        {/* Outstanding Debts */}
                        <div className="glass p-6 flex flex-col gap-4">
                          <h3 className="font-bold text-sm text-slate-300 border-b border-white/5 pb-3">Pacientes con Adeudos</h3>
                          <div className="overflow-y-auto max-h-[40vh]">
                            <DebtList />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: REPORTES Y ESTADÍSTICAS (ADMIN ONLY) */}
                  {activeTab === "reportes" && currentUser.role === "Admin" && (
                    <div className="flex flex-col gap-6 text-left animate-fadeIn">
                      <ReportesDashboard appointments={appointments} therapies={therapies} date={selectedDate} />
                    </div>
                  )}

                  {/* TAB 5: TERAPIAS */}
                  {activeTab === "therapies" && (
                    <div className="flex flex-col gap-6 text-left">
                      {/* Therapies Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {therapies.map((t) => (
                          <div
                            key={t.id}
                            className="glass p-6 bg-[#121826]/30 border-white/10 hover:border-white/20 transition flex flex-col justify-between min-h-[160px]"
                            style={{ borderTop: `4px solid ${t.color}` }}
                          >
                            <div>
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="px-2 py-0.5 bg-slate-800 border border-white/5 text-[10px] font-bold rounded text-slate-400">
                                    {t.id}
                                  </span>
                                  <h4 className="font-bold text-sm text-white mt-1.5">{t.name}</h4>
                                </div>
                                <span className="font-extrabold text-base text-teal-400">${t.price}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                                {t.description || "Sin descripción proporcionada."}
                              </p>
                            </div>

                            <div className="flex justify-end mt-4 pt-3 border-t border-white/5">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: t.color }}
                              ></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 6: CONFIGURACIÓN */}
                  {activeTab === "settings" && (
                    <div className="flex flex-col gap-6 text-left">
                      {/* Sub-navigation bar inside settings */}
                      <div className="flex items-center gap-2 border-b border-white/5 pb-1 select-none">
                        <button
                          onClick={() => setActiveSettingsSubtab("whatsapp")}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                            activeSettingsSubtab === "whatsapp"
                              ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          WhatsApp Template
                        </button>
                        <button
                          onClick={() => setActiveSettingsSubtab("google")}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                            activeSettingsSubtab === "google"
                              ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Google Calendar Sincro
                        </button>
                        {currentUser.role === "Admin" && (
                          <button
                            onClick={() => setActiveSettingsSubtab("users")}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                              activeSettingsSubtab === "users"
                                ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                                : "text-slate-400 hover:text-white"
                            }`}
                          >
                            Gestión de Usuarios
                          </button>
                        )}
                        <button
                          onClick={() => setActiveSettingsSubtab("backup")}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                            activeSettingsSubtab === "backup"
                              ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          Respaldos & DB
                        </button>
                      </div>

                      {/* SUBTAB CONTENT */}
                      <div className="mt-2">
                        {activeSettingsSubtab === "whatsapp" && (
                          <div className="glass p-6 max-w-lg bg-[#121826]/30 flex flex-col gap-5">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                              <MessageSquare className="text-teal-400" size={20} />
                              <h3 className="font-bold text-sm">Recordatorio de WhatsApp</h3>
                            </div>

                            <div className="flex flex-col gap-2">
                              <label className="text-xs text-slate-400 font-medium">Plantilla de Mensaje</label>
                              <textarea
                                rows={5}
                                className="w-full bg-[#1b2336] border-white/5 resize-none text-xs leading-relaxed"
                                value={appConfig.whatsappTemplate || ""}
                                onChange={(e) => setAppConfig({ ...appConfig, whatsappTemplate: e.target.value })}
                                placeholder="Escribe el formato del mensaje..."
                              />
                              <p className="text-[10px] text-slate-500 leading-normal">
                                Reemplaza automáticamente las variables entre llaves:
                                <br />
                                <strong className="text-slate-400">{`{paciente}`}</strong>: Nombre completo,
                                <strong className="text-slate-400">{` {terapia}`}</strong>: Nombre de terapia,
                                <strong className="text-slate-400">{` {fecha}`}</strong>: DD/MM/AAAA,
                                <strong className="text-slate-400">{` {hora}`}</strong>: HH:MM.
                              </p>
                            </div>

                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch("/api/config", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ whatsappTemplate: appConfig.whatsappTemplate }),
                                  });
                                  if (res.ok) alert("Plantilla de WhatsApp guardada con éxito.");
                                } catch (e) {
                                  alert("Error guardando plantilla");
                                }
                              }}
                              className="self-end px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl border border-teal-500/20 transition"
                            >
                              Guardar Plantilla
                            </button>
                          </div>
                        )}

                        {activeSettingsSubtab === "google" && (
                          <div className="glass p-6 max-w-lg bg-[#121826]/30 flex flex-col gap-5">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                              <CalendarIcon className="text-teal-400" size={20} />
                              <h3 className="font-bold text-sm">Google Calendar Link</h3>
                            </div>
                            
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Sincroniza en tiempo real las citas registradas en el consultorio quiropráctico con la agenda de Google del Doctor.
                            </p>

                            <div className="flex items-center gap-3 p-4 bg-slate-900/40 border border-white/5 rounded-2xl">
                              <div className={`w-3.5 h-3.5 rounded-full ${googleAuth.isAuthorized ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`}></div>
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-200">
                                  {googleAuth.isAuthorized ? "Google Calendar Sincronizado" : "Google Calendar Desconectado"}
                                </p>
                                {googleAuth.updatedAt && (
                                  <p className="text-[9px] text-slate-500 mt-0.5">Última actualización: {new Date(googleAuth.updatedAt).toLocaleString()}</p>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-3">
                              {!googleAuth.isAuthorized ? (
                                <button
                                  onClick={connectGoogleCalendar}
                                  className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl border border-teal-500/20 transition"
                                >
                                  Vincular Cuenta de Google del Dr.
                                </button>
                              ) : (
                                <button
                                  onClick={disconnectGoogleCalendar}
                                  className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold text-xs rounded-xl transition"
                                >
                                  Desconectar Calendario
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {activeSettingsSubtab === "users" && currentUser.role === "Admin" && (
                          <div className="flex flex-col gap-4 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-sm text-slate-300">Usuarios Registrados en el Sistema</h3>
                              <button
                                onClick={handleOpenUserCreate}
                                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                              >
                                <UserPlus size={14} />
                                <span>Nuevo Usuario</span>
                              </button>
                            </div>

                            <div className="glass overflow-hidden border border-white/5">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-[#121826] border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    <th className="p-3">Nombre</th>
                                    <th className="p-3">Nombre de Usuario</th>
                                    <th className="p-3">Rol</th>
                                    <th className="p-3 text-right">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-xs text-slate-200">
                                  {usersList.length > 0 ? (
                                    usersList.map((u) => (
                                      <tr key={u.id} className="hover:bg-white/[0.01] transition">
                                        <td className="p-3 font-semibold text-white">{u.name}</td>
                                        <td className="p-3">{u.username}</td>
                                        <td className="p-3">
                                          <span className="px-2 py-0.5 font-bold uppercase tracking-wider text-[8px] bg-slate-800 rounded border border-white/5">
                                            {u.role}
                                          </span>
                                        </td>
                                        <td className="p-3 text-right flex justify-end gap-2">
                                          <button
                                            onClick={() => handleOpenUserEdit(u)}
                                            className="text-teal-400 hover:text-teal-300 font-bold hover:bg-teal-500/10 px-2.5 py-1 rounded-md transition"
                                          >
                                            Editar
                                          </button>
                                          <button
                                            onClick={() => handleDeleteUser(u.id)}
                                            className="text-rose-400 hover:text-rose-300 font-bold hover:bg-rose-500/10 px-2.5 py-1 rounded-md transition"
                                          >
                                            Borrar
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan={4} className="p-4 text-center text-slate-500">
                                        No hay usuarios disponibles.
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {activeSettingsSubtab === "backup" && (
                          <div className="glass p-6 max-w-lg bg-[#121826]/30 flex flex-col gap-5">
                            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                              <Download className="text-teal-400" size={20} />
                              <h3 className="font-bold text-sm">Soporte y Respaldos</h3>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed">
                              Descarga una copia completa de seguridad del archivo de la base de datos local de SQLite (`dev.db`). Recomendamos realizar esto de manera periódica.
                            </p>

                            <a
                              href="/api/config?action=backup"
                              download="quiropractico_respaldo.db"
                              className="self-start px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl border border-teal-500/20 transition flex items-center gap-1.5"
                            >
                              <Download size={14} />
                              <span>Descargar Base de Datos Completa (.db)</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </section>
      </main>

      {/* ==========================================================================
         MODAL OVERLAYS
         ========================================================================== */}

      {/* 1. SCHEDULE BLOCKOUT CREATION MODAL */}
      {blockoutModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveBlockout}
            className="glass p-6 w-full max-w-md bg-[#121826]/95 flex flex-col gap-4 text-left border border-white/10 glow-teal animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                <Lock size={15} /> Bloquear Disponibilidad en Agenda
              </h3>
              <button
                type="button"
                onClick={() => setBlockoutModal({ ...blockoutModal, show: false })}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Fecha *</label>
              <input
                type="date"
                required
                value={blockoutModal.date}
                onChange={(e) => setBlockoutModal({ ...blockoutModal, date: e.target.value })}
                className="w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Tipo de Bloqueo *</label>
                <select
                  value={blockoutModal.type}
                  onChange={(e) => setBlockoutModal({ ...blockoutModal, type: e.target.value })}
                  className="bg-[#1b2336] text-xs py-2 px-3 focus:ring-0 outline-none"
                  required
                >
                  <option value="15_MIN">15 Minutos</option>
                  <option value="HOUR">1 Hora</option>
                  <option value="HALF_DAY">Medio Día</option>
                  <option value="FULL_DAY">Día Completo</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Consultorio *</label>
                <select
                  value={blockoutModal.consultorio}
                  onChange={(e) => setBlockoutModal({ ...blockoutModal, consultorio: e.target.value })}
                  className="bg-[#1b2336] text-xs py-2 px-3 focus:ring-0 outline-none"
                  required
                >
                  <option value="TODOS">Todos los Consultorios</option>
                  <option value="A">Consultorio A</option>
                  <option value="B">Consultorio B</option>
                  <option value="C">Consultorio C</option>
                  <option value="D">Consultorio D</option>
                </select>
              </div>
            </div>

            {/* Conditionally render slot time inputs */}
            {(blockoutModal.type === "15_MIN" || blockoutModal.type === "HOUR") && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Hora de Inicio *</label>
                <select
                  value={blockoutModal.timeSlot}
                  onChange={(e) => setBlockoutModal({ ...blockoutModal, timeSlot: e.target.value })}
                  className="bg-[#1b2336] text-xs py-2 px-3"
                  required
                >
                  {TIME_SLOTS.map((slot) => (
                    <option key={slot} value={slot}>{slot} hs</option>
                  ))}
                </select>
              </div>
            )}

            {blockoutModal.type === "HALF_DAY" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-slate-400 font-medium">Turno de Medio Día *</label>
                <select
                  value={blockoutModal.halfDayType}
                  onChange={(e) => setBlockoutModal({ ...blockoutModal, halfDayType: e.target.value })}
                  className="bg-[#1b2336] text-xs py-2 px-3"
                  required
                >
                  <option value="Mañana">Mañana (06:30 hs a 12:45 hs)</option>
                  <option value="Tarde">Tarde (13:00 hs a 18:45 hs)</option>
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Motivo (Opcional)</label>
              <input
                type="text"
                placeholder="Ej. Descanso, reunión médica, mantenimiento, etc."
                value={blockoutModal.reason}
                onChange={(e) => setBlockoutModal({ ...blockoutModal, reason: e.target.value })}
                className="w-full text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setBlockoutModal({ ...blockoutModal, show: false })}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition"
              >
                Bloquear Horario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. CREATE / EDIT APPOINTMENT MODAL */}
      {appointmentModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <AppointmentForm
            prefill={appointmentModal.prefill}
            appointment={appointmentModal.appointment}
            therapies={therapies}
            currentUser={currentUser}
            onClose={() => setAppointmentModal({ show: false })}
            onSave={async () => {
              setAppointmentModal({ show: false });
              // Refresh appointments
              const resAppts = await fetch(`/api/appointments?date=${selectedDate}`);
              const dataAppts = await resAppts.json();
              setAppointments(Array.isArray(dataAppts) ? dataAppts : []);
            }}
            onDelete={handleDeleteAppointment}
          />
        </div>
      )}

      {/* 3. CREATE / EDIT PATIENT MODAL */}
      {patientModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <PatientForm
            patient={patientModal.patient}
            therapies={therapies}
            onClose={() => setPatientModal({ show: false })}
            onSave={async () => {
              setPatientModal({ show: false });
              // Refresh patients list
              const params = new URLSearchParams();
              if (searchQuery) params.append("q", searchQuery);
              if (patientStatusFilter) params.append("status", patientStatusFilter);
              if (patientTherapyFilter) params.append("therapyId", patientTherapyFilter);
              const resPatients = await fetch(`/api/patients?${params.toString()}`);
              const dataPatients = await resPatients.json();
              setPatients(Array.isArray(dataPatients) ? dataPatients : []);
            }}
          />
        </div>
      )}

      {/* 4. PAYMENT PROCESSOR MODAL */}
      {paymentModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <PaymentForm
            appointment={paymentModal.appointment}
            onClose={() => setPaymentModal({ show: false })}
            onSave={async () => {
              setPaymentModal({ show: false });
              // Refresh agenda and metrics
              const resAppts = await fetch(`/api/appointments?date=${selectedDate}`);
              const dataAppts = await resAppts.json();
              setAppointments(Array.isArray(dataAppts) ? dataAppts : []);
            }}
          />
        </div>
      )}

      {/* 5. USER CREATION / EDITING MODAL (ADMIN ONLY) */}
      {userModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUser}
            className="glass p-6 w-full max-w-sm bg-[#121826]/95 flex flex-col gap-4 text-left border border-white/10 glow-teal animate-fadeIn"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-sm text-white">
                {userModal.user ? "Editar Usuario" : "Registrar Nuevo Usuario"}
              </h3>
              <button
                type="button"
                onClick={() => setUserModal({ show: false })}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Nombre completo *</label>
              <input
                type="text"
                required
                value={userFormName}
                onChange={(e) => setUserFormName(e.target.value)}
                placeholder="Ej. Dr. David Rodríguez Garita, Recepcionista Ana"
                className="w-full text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Nombre de Usuario (Login) *</label>
              <input
                type="text"
                required
                value={userFormUsername}
                onChange={(e) => setUserFormUsername(e.target.value)}
                placeholder="Ej. david, ana_recepcion"
                className="w-full text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">
                Contraseña {userModal.user && "(deja vacío para no cambiar)"} *
              </label>
              <input
                type="password"
                required={!userModal.user}
                value={userFormPassword}
                onChange={(e) => setUserFormPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Rol del Usuario *</label>
              <select
                value={userFormRole}
                onChange={(e) => setUserFormRole(e.target.value)}
                className="bg-[#1b2336] text-xs py-2 px-3 focus:ring-0 outline-none"
                required
              >
                <option value="Admin">Administrador (Admin)</option>
                <option value="Recepción">Recepcionista (Recepción)</option>
                <option value="Doctor">Médico / Doctor (Doctor)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setUserModal({ show: false })}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition"
              >
                Guardar Usuario
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   SUB-COMPONENT: DEBT LIST IN CASH & INCOMES TAB
   ========================================================================== */
function DebtList() {
  const [debts, setDebts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState<{ show: boolean; appointment?: any }>({ show: false });

  const loadDebts = async () => {
    try {
      const res = await fetch("/api/payments?mode=debts");
      const data = await res.json();
      setDebts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebts();
  }, []);

  if (loading) {
    return <div className="text-center text-xs text-slate-500 py-6">Cargando cuentas...</div>;
  }

  return (
    <div className="divide-y divide-white/5 max-h-[40vh] overflow-y-auto pr-1">
      {debts.length > 0 ? (
        debts.map((d) => (
          <div key={d.id} className="py-3 flex items-center justify-between text-xs hover:bg-white/[0.01] rounded transition">
            <div>
              <h5 className="font-bold text-white">
                {d.patient.firstName} {d.patient.lastName}
              </h5>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {d.date.split("-").reverse().join("/")} • {d.therapy.name} (Consultorio {d.consultorio || "A"})
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                Costo: ${d.price} | Abonado: ${d.paid}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="font-extrabold text-sm text-rose-400 block">${d.pending}</span>
                <span className="text-[8px] text-slate-500 tracking-wide uppercase font-semibold">{d.paymentStatus}</span>
              </div>
              
              <button
                onClick={() => setPayModal({ show: true, appointment: d })}
                className="px-2.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 font-bold text-[10px] rounded-lg border border-teal-500/20 transition"
              >
                Cobrar
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="text-slate-500 text-xs py-8 text-center">Felicidades, no hay adeudos pendientes.</p>
      )}

      {payModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <PaymentForm
            appointment={payModal.appointment}
            onClose={() => setPayModal({ show: false })}
            onSave={() => {
              setPayModal({ show: false });
              loadDebts();
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   FORM COMPONENT: CREATE / EDIT PATIENT
   ========================================================================== */
function PatientForm({
  patient,
  therapies,
  onClose,
  onSave,
}: {
  patient?: any;
  therapies: any[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [firstName, setFirstName] = useState(patient?.firstName || "");
  const [lastName, setLastName] = useState(patient?.lastName || "");
  const [phone1, setPhone1] = useState(patient?.phone1 || "");
  const [phone2, setPhone2] = useState(patient?.phone2 || "");
  const [gender, setGender] = useState(patient?.gender || "Femenino");
  const [status, setStatus] = useState(patient?.status || "Activo");
  const [therapyId, setTherapyId] = useState(patient?.therapyId || therapies[0]?.id || "");
  const [therapySubcategory, setTherapySubcategory] = useState(patient?.therapySubcategory || "Tratamiento E");
  const [rx, setRx] = useState(patient?.rx || false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone1 || !phone2 || !status || !gender || !therapyId) {
      alert("Por favor rellena todos los campos obligatorios");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: patient?.id,
          firstName,
          lastName,
          phone1,
          phone2,
          gender,
          status,
          rx,
          therapyId,
          therapySubcategory: therapyId === "RESET" ? therapySubcategory : null,
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        alert(data.error || "Ocurrió un error");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass p-6 w-full max-w-lg bg-[#121826]/95 flex flex-col gap-4 text-left glow-teal border border-teal-500/10 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="font-bold text-sm tracking-tight text-white">
          {patient ? "Editar Expediente Paciente" : "Registrar Nuevo Paciente"}
        </h3>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Nombre(s) *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="E.g. ALMA INES"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Apellidos *</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="E.g. PANG GALLARDO"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Teléfono Principal (1) *</label>
          <input
            type="text"
            value={phone1}
            onChange={(e) => setPhone1(e.target.value)}
            placeholder="E.g. 528112345678"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Teléfono Opcional (2) *</label>
          <input
            type="text"
            value={phone2}
            onChange={(e) => setPhone2(e.target.value)}
            placeholder="E.g. 8119876543"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Género *</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="bg-[#1b2336] text-xs focus:ring-0 outline-none"
            required
          >
            <option value="Femenino">Femenino</option>
            <option value="Masculino">Masculino</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Estatus *</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-[#1b2336] text-xs focus:ring-0 outline-none"
            required
          >
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="En tratamiento">En tratamiento</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Tipo de Terapia *</label>
          <select
            value={therapyId}
            onChange={(e) => setTherapyId(e.target.value)}
            className="bg-[#1b2336] text-xs focus:ring-0 outline-none"
            required
          >
            {therapies.map((t) => (
              <option key={t.id} value={t.id}>{t.name} (${t.price})</option>
            ))}
          </select>
        </div>

        {therapyId === "RESET" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">Subcategoría Reset *</label>
            <select
              value={therapySubcategory}
              onChange={(e) => setTherapySubcategory(e.target.value)}
              className="bg-[#1b2336] text-xs focus:ring-0 outline-none"
              required
            >
              <option value="Tratamiento E">Tratamiento E</option>
              <option value="Tratamiento B">Tratamiento B</option>
              <option value="Tratamiento F">Tratamiento F</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={() => setRx(!rx)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-300 focus:outline-none"
        >
          {rx ? (
            <CheckSquare size={18} className="text-cyan-400" />
          ) : (
            <Square size={18} className="text-slate-600" />
          )}
          <span>¿Tiene Radiografías (RX)?</span>
        </button>
      </div>

      <div className="flex items-center justify-end gap-3 mt-4 border-t border-white/5 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-850 text-white text-xs font-semibold rounded-lg transition"
        >
          {submitting ? "Guardando..." : "Guardar Paciente"}
        </button>
      </div>
    </form>
  );
}

/* ==========================================================================
   FORM COMPONENT: CREATE / EDIT APPOINTMENT
   ========================================================================== */
function AppointmentForm({
  prefill,
  appointment,
  therapies,
  currentUser,
  onClose,
  onSave,
  onDelete,
}: {
  prefill?: { timeSlot: string; consultorio: string };
  appointment?: any;
  therapies: any[];
  currentUser: any;
  onClose: () => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(appointment?.patientId || "");
  const [selectedTherapyId, setSelectedTherapyId] = useState(appointment?.therapyId || therapies[0]?.id || "");
  const [selectedTherapySubcategory, setSelectedTherapySubcategory] = useState(appointment?.therapySubcategory || "Tratamiento E");
  const [date, setDate] = useState(appointment?.date || new Date().toISOString().split("T")[0]);
  const [timeSlot, setTimeSlot] = useState(appointment?.timeSlot || prefill?.timeSlot || "07:00");
  const [consultorio, setConsultorio] = useState(appointment?.consultorio || prefill?.consultorio || "A");
  const [status, setStatus] = useState(appointment?.status || "Agendada");
  const [tipo, setTipo] = useState(appointment?.tipo || "COT");
  const [rx, setRx] = useState(appointment?.rx || false);
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [submitting, setSubmitting] = useState(false);

  // Validate read-only for Doctor role on rescheduling
  const isDoctor = currentUser.role === "Doctor";
  const disableFields = isDoctor && appointment !== undefined; // Doctors can view but not reschedule existing appts

  // Search patients
  useEffect(() => {
    const searchPatients = async () => {
      try {
        const res = await fetch(`/api/patients?q=${searchQuery}`);
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      }
    };
    searchPatients();
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !selectedTherapyId || !date || !timeSlot || !consultorio) {
      alert("Por favor rellene los campos obligatorios");
      return;
    }

    setSubmitting(true);
    try {
      const url = "/api/appointments";
      const method = appointment ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: appointment?.id,
          patientId: selectedPatientId,
          therapyId: selectedTherapyId,
          therapySubcategory: selectedTherapyId === "RESET" ? selectedTherapySubcategory : null,
          date,
          timeSlot,
          consultorio,
          status,
          tipo,
          rx,
          notes,
          userId: currentUser.id,
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        alert(data.error || "Ocurrió un error al agendar la cita.");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass p-6 w-full max-w-lg bg-[#121826]/95 flex flex-col gap-4 text-left border border-white/10 glow-teal max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="font-bold text-sm text-white">
          {appointment ? "Ver/Editar Cita Quiropráctica" : "Agendar Consulta de Terapia"}
        </h3>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
          <X size={16} />
        </button>
      </div>

      {isDoctor && appointment && (
        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg flex items-center gap-1.5">
          <AlertTriangle size={12} className="shrink-0" />
          <span>Como Médico solo puedes modificar Notas Clínicas/Observaciones y Estatus de Cita.</span>
        </div>
      )}

      {/* Patient Search and Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400 font-medium">1. Seleccionar Paciente *</label>
        
        {appointment ? (
          <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5 text-sm font-semibold text-teal-400 uppercase">
            {appointment.patient.lastName}, {appointment.patient.firstName}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                disabled={disableFields}
                placeholder="Escribe para buscar paciente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 py-2 text-xs"
              />
            </div>
            
            <select
              value={selectedPatientId}
              disabled={disableFields}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full bg-[#1b2336] text-xs py-2 px-3"
              required
            >
              <option value="">-- Seleccionar Paciente --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName} ({p.phone1})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Row: Date, Time & Office */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Fecha *</label>
          <input
            type="date"
            disabled={disableFields}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full text-xs"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Horario *</label>
          <select
            value={timeSlot}
            disabled={disableFields}
            onChange={(e) => setTimeSlot(e.target.value)}
            className="w-full bg-[#1b2336] text-xs py-2 px-3"
            required
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot} hs
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Consultorio *</label>
          <select
            value={consultorio}
            disabled={disableFields}
            onChange={(e) => setConsultorio(e.target.value)}
            className="w-full bg-[#1b2336] text-xs py-2 px-3"
            required
          >
            {CONSULTORIOS.map((c) => (
              <option key={c} value={c}>
                Consultorio {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row: Therapy & Estatus */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Terapia *</label>
          <select
            value={selectedTherapyId}
            disabled={disableFields}
            onChange={(e) => setSelectedTherapyId(e.target.value)}
            className="w-full bg-[#1b2336] text-xs py-2 px-3"
            required
          >
            {therapies.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (${t.price})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Estatus Cita *</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full bg-[#1b2336] text-xs py-2 px-3"
            required
          >
            <option value="Agendada">Agendada</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Conditional Subcategory & Tipo */}
      <div className="grid grid-cols-2 gap-4 items-center">
        {selectedTherapyId === "RESET" ? (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">Subcategoría Reset *</label>
            <select
              value={selectedTherapySubcategory}
              disabled={disableFields}
              onChange={(e) => setSelectedTherapySubcategory(e.target.value)}
              className="bg-[#1b2336] text-xs py-2 px-3"
              required
            >
              <option value="Tratamiento E">Tratamiento E</option>
              <option value="Tratamiento B">Tratamiento B</option>
              <option value="Tratamiento F">Tratamiento F</option>
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-medium">Tipo</label>
            <input
              type="text"
              disabled={disableFields}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="COT, etc."
              className="w-full text-xs"
            />
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => setRx(!rx)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 focus:outline-none"
          >
            {rx ? (
              <CheckSquare size={18} className="text-cyan-400" />
            ) : (
              <Square size={18} className="text-slate-600" />
            )}
            <span>¿Requiere Rx (Estudios)?</span>
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium">Observaciones del Doctor</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anotar detalles clínicos..."
          className="w-full bg-[#1b2336] text-xs leading-normal resize-none p-3"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-4">
        <div>
          {appointment && !isDoctor && (
            <button
              type="button"
              onClick={() => onDelete(appointment.id)}
              className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-lg transition"
            >
              Eliminar Cita
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-850 text-white text-xs font-semibold rounded-lg transition"
          >
            {submitting ? "Guardando..." : "Guardar Cita"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ==========================================================================
   FORM COMPONENT: RECORD PAYMENT (BILLING LOGGER)
   ========================================================================== */
function PaymentForm({ appointment, onClose, onSave }: { appointment: any; onClose: () => void; onSave: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Efectivo");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const price = appointment.therapy.price;
  const previousPaid = appointment.payments ? appointment.payments.reduce((sum: number, p: any) => sum + p.amount, 0) : appointment.paid || 0;
  const pending = Math.max(0, price - previousPaid);

  useEffect(() => {
    setAmount(pending.toString());
  }, [pending]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert("Por favor introduce una cantidad válida");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: appointment.id,
          amount: parseFloat(amount),
          method,
          notes,
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        alert(data.error || "Ocurrió un error");
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass p-6 w-full max-w-sm bg-[#121826]/95 flex flex-col gap-4 text-left border border-white/10 glow-teal animate-fadeIn">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="font-bold text-sm text-white">Registrar Cobro de Cita</h3>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
          <X size={16} />
        </button>
      </div>

      <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl text-xs flex flex-col gap-1 text-slate-300">
        <p>
          <strong className="text-white">Paciente:</strong> {appointment.patient.firstName} {appointment.patient.lastName}
        </p>
        <p>
          <strong className="text-white">Terapia:</strong> {appointment.therapy.name}
        </p>
        <p>
          <strong className="text-white">Costo Total:</strong> ${price}
        </p>
        <p>
          <strong className="text-white">Monto Ya Abonado:</strong> ${previousPaid}
        </p>
        <p className="border-t border-white/5 pt-1.5 mt-1 font-bold text-amber-400">
          Adeudo Pendiente: ${pending}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium">Monto a Cobrar ($) *</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Monto de pago"
          className="font-extrabold text-teal-400 focus:ring-0"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium">Método de Pago *</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-[#1b2336] text-xs py-2 px-3 focus:ring-0 outline-none"
          required
        >
          <option value="Efectivo">Efectivo</option>
          <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
          <option value="Transferencia">Transferencia Bancaria</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium">Notas de Transacción</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Folio, banco, referencia..."
          className="w-full text-xs"
        />
      </div>

      <div className="flex items-center justify-end gap-3 mt-4 border-t border-white/5 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-850 text-white text-xs font-semibold rounded-lg transition"
        >
          {submitting ? "Procesando..." : "Confirmar Pago"}
        </button>
      </div>
    </form>
  );
}

/* ==========================================================================
   SUB-COMPONENT: STATISTICS REPORTS DASHBOARD
   ========================================================================== */
function ReportesDashboard({ appointments, therapies, date }: { appointments: any[]; therapies: any[]; date: string }) {
  // 1. Compute stats
  const activeAppts = appointments.filter(a => a.status !== "Cancelada");
  const totalPatients = activeAppts.length;
  
  // Occupancy rate per consultorio
  const consultorioStats = CONSULTORIOS.map((c) => {
    const scheduledInOffice = activeAppts.filter((a) => a.consultorio === c).length;
    // Capacity is number of slots in the day (TIME_SLOTS length)
    const capacity = TIME_SLOTS.length;
    const occupancyRate = capacity > 0 ? Math.round((scheduledInOffice / capacity) * 100) : 0;
    return {
      name: c,
      scheduled: scheduledInOffice,
      occupancy: occupancyRate,
    };
  });

  // Top Therapies used
  const therapyStats = therapies.map((t) => {
    const count = activeAppts.filter((a) => a.therapyId === t.id).length;
    return {
      name: t.name,
      color: t.color,
      count,
    };
  }).sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 bg-[#121826]/30">
          <p className="text-xs text-slate-400 font-medium">Pacientes Totales Citados Hoy</p>
          <h3 className="text-3xl font-extrabold text-teal-400 mt-2">{totalPatients}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Excluye citas marcadas como "Cancelada"</p>
        </div>
        <div className="glass p-6 bg-[#121826]/30">
          <p className="text-xs text-slate-400 font-medium">Promedio Ocupación General</p>
          <h3 className="text-3xl font-extrabold text-blue-400 mt-2">
            {Math.round(consultorioStats.reduce((sum, item) => sum + item.occupancy, 0) / 4)}%
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Suma de ocupación de Consultorios A-D</p>
        </div>
        <div className="glass p-6 bg-[#121826]/30">
          <p className="text-xs text-slate-400 font-medium">Terapia más Solicitada</p>
          <h3 className="text-xl font-extrabold text-purple-400 mt-3 truncate">
            {therapyStats[0]?.count > 0 ? `${therapyStats[0].name} (${therapyStats[0].count} citas)` : "Ninguna registrada"}
          </h3>
          <p className="text-[10px] text-slate-500 mt-1.5">Servicio líder del día seleccionado</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Office occupancy */}
        <div className="glass p-6 bg-[#121826]/30 flex flex-col gap-4">
          <h4 className="font-bold text-sm text-slate-300 border-b border-white/5 pb-2">Ocupación por Consultorio</h4>
          <div className="flex flex-col gap-4 mt-2">
            {consultorioStats.map((item) => (
              <div key={item.name} className="flex flex-col gap-1 text-xs">
                <div className="flex justify-between items-center text-slate-200">
                  <span className="font-bold">Consultorio {item.name}</span>
                  <span className="font-semibold">{item.scheduled} citas ({item.occupancy}%)</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-900/80 rounded-full h-2 border border-white/5 overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.occupancy}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top therapies */}
        <div className="glass p-6 bg-[#121826]/30 flex flex-col gap-4">
          <h4 className="font-bold text-sm text-slate-300 border-b border-white/5 pb-2">Distribución de Terapias</h4>
          <div className="overflow-y-auto max-h-[35vh] flex flex-col gap-3 mt-1">
            {therapyStats.map((t) => (
              <div key={t.name} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }}></span>
                  <span className="font-bold text-white">{t.name}</span>
                </div>
                <span className="font-extrabold text-sm text-slate-300">{t.count} citas</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
