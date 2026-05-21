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
  UserCheck
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

    if (url.startsWith("/api/")) {
      if (window.location.pathname.startsWith("/quiropractico")) {
        const prefixedUrl = "/quiropractico" + url;
        if (typeof input === "string") {
          return originalFetch(prefixedUrl, init);
        } else if (input instanceof URL) {
          return originalFetch(new URL(prefixedUrl, window.location.origin), init);
        } else {
          return originalFetch(new Request(prefixedUrl, input as any), init);
        }
      }
    }
    return originalFetch(input, init);
  };
}

// Generate Time Slots from 06:30 to 18:45 (last session ends at 19:00)
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
const BEDS = [1, 2, 3, 4];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState("agenda");
  const [selectedDate, setSelectedDate] = useState("");
  
  // Data States
  const [appointments, setAppointments] = useState<any[]>([]);
  const [therapies, setTherapies] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [appConfig, setAppConfig] = useState<any>({});
  const [googleAuth, setGoogleAuth] = useState({ isAuthorized: false, updatedAt: null });
  
  // Finance Statistics
  const [financeSummary, setFinanceSummary] = useState<any>({ dailyTotal: 0, totalDebt: 0, dailyPayments: [], dailyPaymentsCount: 0 });

  // UI States
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modals
  const [appointmentModal, setAppointmentModal] = useState<{
    show: boolean;
    appointment?: any;
    prefill?: { timeSlot: string; bedNumber: number };
  }>({ show: false });
  const [patientModal, setPatientModal] = useState<{ show: boolean; patient?: any }>({ show: false });
  const [paymentModal, setPaymentModal] = useState<{ show: boolean; appointment?: any }>({ show: false });

  // Initialize and mount
  useEffect(() => {
    setMounted(true);
    const today = new Date();
    // Convert to YYYY-MM-DD local
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Fetch Data when selectedDate or activeTab changes
  useEffect(() => {
    if (!mounted || !selectedDate) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch therapies (always needed)
        const resTherapies = await fetch("/api/therapies");
        const dataTherapies = await resTherapies.json();
        setTherapies(dataTherapies);

        // Load active tab specifics
        if (activeTab === "agenda") {
          const resAppts = await fetch(`/api/appointments?date=${selectedDate}`);
          const dataAppts = await resAppts.json();
          setAppointments(Array.isArray(dataAppts) ? dataAppts : []);
        } else if (activeTab === "patients") {
          const resPatients = await fetch(`/api/patients?q=${searchQuery}`);
          const dataPatients = await resPatients.json();
          setPatients(Array.isArray(dataPatients) ? dataPatients : []);
        } else if (activeTab === "payments") {
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
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [mounted, selectedDate, activeTab, searchQuery]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0e17] text-teal-500">
        <div className="text-xl font-semibold tracking-wide animate-pulse">Cargando Sistema Quiropráctico...</div>
      </div>
    );
  }

  // Helper to find appointment by slot and bed
  const getAppointment = (timeSlot: string, bedNumber: number) => {
    return appointments.find(
      (app) => app.timeSlot === timeSlot && app.bedNumber === bedNumber
    );
  };

  // Google Calendar Connection Redirect
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
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0e17] text-white">
      {/* Sidebar Layout */}
      <aside className="w-[260px] bg-[#121826] border-r border-white/5 flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 bg-teal-950/50 border border-teal-500/20 rounded-xl text-teal-400">
              <Activity size={24} />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-wide leading-tight">Centro Quiropráctico</h2>
              <span className="text-xs text-teal-400 font-medium">Dr. Rodríguez Garita</span>
            </div>
          </div>

          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("agenda")}
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
              onClick={() => setActiveTab("patients")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                activeTab === "patients"
                  ? "bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Users size={18} />
              <span>Pacientes</span>
            </button>
            <button
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm font-medium ${
                activeTab === "payments"
                  ? "bg-teal-500/10 border border-teal-500/20 text-teal-400 font-semibold"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <DollarSign size={18} />
              <span>Caja e Ingresos</span>
            </button>
            <button
              onClick={() => setActiveTab("therapies")}
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
              onClick={() => setActiveTab("settings")}
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

        <div className="text-center p-3.5 bg-slate-900/40 rounded-xl border border-white/5">
          <p className="text-[11px] text-slate-500">Único Operador</p>
          <p className="text-xs text-slate-300 font-semibold mt-0.5">Asistente Clínica</p>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0e17] overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-[70px] bg-[#121826]/40 border-b border-white/5 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold tracking-tight">
              {activeTab === "agenda" && "Agenda de Consultas"}
              {activeTab === "patients" && "Registro de Pacientes"}
              {activeTab === "payments" && "Gestión Financiera"}
              {activeTab === "therapies" && "Catálogo de Servicios y Terapias"}
              {activeTab === "settings" && "Configuración del Sistema"}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {activeTab === "agenda" && (
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
            )}
            
            <div className="text-xs font-semibold px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg">
              Online VPS
            </div>
          </div>
        </header>

        {/* Tab View Container */}
        <section className="flex-1 overflow-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {activeTab === "agenda" && (
                <div className="flex flex-col gap-6">
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

                  {/* Súper Agenda Matrix Grid */}
                  <div className="glass overflow-hidden border border-white/5">
                    {/* sticky table header */}
                    <div className="grid grid-cols-[100px_repeat(4,1fr)] bg-[#121826] border-b border-white/5 font-semibold text-xs tracking-wider text-slate-400 uppercase py-4 text-center sticky top-0 z-10">
                      <div>Hora</div>
                      <div>Cama 1</div>
                      <div>Cama 2</div>
                      <div>Cama 3</div>
                      <div>Cama 4</div>
                    </div>

                    {/* Timeline Rows */}
                    <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
                      {TIME_SLOTS.map((slot) => (
                        <div key={slot} className="grid grid-cols-[100px_repeat(4,1fr)] min-h-[75px] items-stretch">
                          {/* Time Column */}
                          <div className="flex items-center justify-center font-bold text-sm bg-slate-900/10 text-slate-400 border-r border-white/5 select-none">
                            {slot}
                          </div>

                          {/* Bed Columns */}
                          {BEDS.map((bed) => {
                            const app = getAppointment(slot, bed);
                            return (
                              <div
                                key={bed}
                                className="p-2 border-r border-white/5 last:border-0 flex items-stretch relative group hover:bg-white/[0.01] transition"
                              >
                                {app ? (
                                  /* Booked Slot Card */
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
                                        <span className="text-[10px] text-slate-400 font-medium">
                                          {app.therapy.name}
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
                                      </div>

                                      {/* Quick Actions */}
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                                        <button
                                          onClick={() => sendWhatsApp(app)}
                                          title="WhatsApp Recordatorio"
                                          className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-md transition"
                                        >
                                          <MessageSquare size={11} />
                                        </button>
                                        <button
                                          onClick={() => setAppointmentModal({ show: true, appointment: app })}
                                          title="Editar Cita"
                                          className="p-1 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 rounded-md transition"
                                        >
                                          <SettingsIcon size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  /* Empty Slot Placeholder */
                                  <button
                                    onClick={() =>
                                      setAppointmentModal({
                                        show: true,
                                        prefill: { timeSlot: slot, bedNumber: bed },
                                      })
                                    }
                                    className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 border border-dashed border-teal-500/20 bg-teal-500/[0.02] hover:bg-teal-500/[0.05] rounded-lg transition py-3"
                                  >
                                    <Plus className="text-teal-400" size={16} />
                                  </button>
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

              {activeTab === "patients" && (
                <div className="flex flex-col gap-6">
                  {/* Action Bar */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, apellidos, teléfono..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 bg-[#121826] border-white/5"
                      />
                    </div>
                    <button
                      onClick={() => setPatientModal({ show: true })}
                      className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition"
                    >
                      <Plus size={16} />
                      <span>Nuevo Paciente</span>
                    </button>
                  </div>

                  {/* Patients Table */}
                  <div className="glass overflow-hidden border border-white/5">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#121826] border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <th className="p-4">Paciente</th>
                          <th className="p-4">Teléfono 1</th>
                          <th className="p-4">Teléfono 2</th>
                          <th className="p-4">Género/Código</th>
                          <th className="p-4 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {patients.length > 0 ? (
                          patients.map((p) => (
                            <tr key={p.id} className="hover:bg-white/[0.01] transition">
                              <td className="p-4 font-bold text-white">
                                {p.lastName}, {p.firstName}
                              </td>
                              <td className="p-4 text-slate-300">{p.phone1}</td>
                              <td className="p-4 text-slate-400">{p.phone2 || "—"}</td>
                              <td className="p-4">
                                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-xs font-semibold rounded-md border border-white/5">
                                  {p.genderCode || "—"}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => setPatientModal({ show: true, patient: p })}
                                  className="text-teal-400 hover:text-teal-300 font-semibold text-xs bg-teal-500/10 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg border border-teal-500/20 transition"
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-8 text-center text-slate-500">
                              No se encontraron pacientes.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "payments" && (
                <div className="flex flex-col gap-6">
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
                        {/* We will load the debts list via another fetch, or display simple message to avoid cluttering. Let's make it fetch active debts */}
                        <DebtList />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "therapies" && (
                <div className="flex flex-col gap-6">
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

              {activeTab === "settings" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Left Column: WhatsApp Config */}
                  <div className="glass p-6 flex flex-col gap-5">
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
                        Puedes usar las siguientes variables que se reemplazarán automáticamente:
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
                          if (res.ok) alert("Plantilla de WhatsApp guardada exitosamente.");
                        } catch (err) {
                          alert("Error al guardar plantilla");
                        }
                      }}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl self-end transition"
                    >
                      Guardar Plantilla
                    </button>
                  </div>

                  {/* Right Column: Google & Backup Settings */}
                  <div className="flex flex-col gap-8">
                    {/* Google Sync Card */}
                    <div className="glass p-6 flex flex-col gap-5">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                        <CalendarIcon className="text-blue-400" size={20} />
                        <h3 className="font-bold text-sm">Google Calendar Link</h3>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        Conecta la aplicación web con la cuenta personal de Google del Doctor para que las citas creadas aquí se sincronicen de forma instantánea y automática en su celular.
                      </p>

                      {googleAuth.isAuthorized ? (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                              <Check size={14} /> Sincronización Activa
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1 block">
                              Conectado el: {new Date(googleAuth.updatedAt!).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            onClick={disconnectGoogleCalendar}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          >
                            <LogOut size={12} />
                            Desconectar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={connectGoogleCalendar}
                          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
                        >
                          <CalendarIcon size={16} />
                          Vincular Cuenta de Google del Dr.
                        </button>
                      )}
                    </div>

                    {/* Backups Panel */}
                    <div className="glass p-6 flex flex-col gap-5">
                      <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                        <Download className="text-amber-400" size={20} />
                        <h3 className="font-bold text-sm">Soporte y Respaldos</h3>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        Como este sistema utiliza una base de datos local SQLite (.db) dentro del contenedor en tu VPS, puedes descargar todo el archivo de base de datos directamente con un clic. Envíale este archivo a tu técnico de soporte cuando necesites asistencia o restauración.
                      </p>

                      <a
                        href="/api/config?action=backup"
                        download
                        className="w-full py-3 bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 text-amber-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition text-center"
                      >
                        <Download size={16} />
                        Descargar Base de Datos Completa (.db)
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>

      {/* 1. APPOINTMENT MODAL */}
      {appointmentModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <AppointmentForm
            prefill={appointmentModal.prefill}
            appointment={appointmentModal.appointment}
            therapies={therapies}
            onClose={() => setAppointmentModal({ show: false })}
            onSave={async () => {
              // Reload appointments
              const resAppts = await fetch(`/api/appointments?date=${selectedDate}`);
              const dataAppts = await resAppts.json();
              setAppointments(Array.isArray(dataAppts) ? dataAppts : []);
              setAppointmentModal({ show: false });
            }}
            onDelete={handleDeleteAppointment}
          />
        </div>
      )}

      {/* 2. PATIENT MODAL */}
      {patientModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <PatientForm
            patient={patientModal.patient}
            onClose={() => setPatientModal({ show: false })}
            onSave={async () => {
              // Reload patients list
              const resPatients = await fetch(`/api/patients?q=${searchQuery}`);
              const dataPatients = await resPatients.json();
              setPatients(Array.isArray(dataPatients) ? dataPatients : []);
              setPatientModal({ show: false });
            }}
          />
        </div>
      )}

      {/* 3. PAYMENT MODAL */}
      {paymentModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <PaymentForm
            appointment={paymentModal.appointment}
            onClose={() => setPaymentModal({ show: false })}
            onSave={async () => {
              // Reload appointments and finance totals
              const resAppts = await fetch(`/api/appointments?date=${selectedDate}`);
              const dataAppts = await resAppts.json();
              setAppointments(Array.isArray(dataAppts) ? dataAppts : []);
              
              const resFinance = await fetch(`/api/payments?mode=summary&date=${selectedDate}`);
              const dataFinance = await resFinance.json();
              setFinanceSummary(dataFinance);
              
              setPaymentModal({ show: false });
            }}
          />
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
                {d.date.split("-").reverse().join("/")} • {d.therapy.name}
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
function PatientForm({ patient, onClose, onSave }: { patient?: any; onClose: () => void; onSave: () => void }) {
  const [firstName, setFirstName] = useState(patient?.firstName || "");
  const [lastName, setLastName] = useState(patient?.lastName || "");
  const [phone1, setPhone1] = useState(patient?.phone1 || "");
  const [phone2, setPhone2] = useState(patient?.phone2 || "");
  const [genderCode, setGenderCode] = useState(patient?.genderCode || "A02");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone1) {
      alert("Por favor rellena los campos obligatorios");
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
          genderCode,
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
    <form onSubmit={handleSubmit} className="glass p-6 w-full max-w-md bg-[#121826]/95 flex flex-col gap-4 text-left glow-teal border border-teal-500/10">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="font-bold text-sm tracking-tight text-white">
          {patient ? "Editar Expediente Paciente" : "Registrar Nuevo Paciente"}
        </h3>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
          <X size={16} />
        </button>
      </div>

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

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium">Teléfono Principal (1) *</label>
        <input
          type="text"
          value={phone1}
          onChange={(e) => setPhone1(e.target.value)}
          placeholder="WhatsApp (con clave país e.g. 528112345678)"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium">Teléfono Opcional (2)</label>
        <input
          type="text"
          value={phone2}
          onChange={(e) => setPhone2(e.target.value)}
          placeholder="Teléfono secundario"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium">Género / Código</label>
        <select
          value={genderCode}
          onChange={(e) => setGenderCode(e.target.value)}
          className="bg-[#1b2336]"
        >
          <option value="A02">A02</option>
          <option value="A04">A04</option>
          <option value="A06">A06</option>
          <option value="General">General</option>
        </select>
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
  onClose,
  onSave,
  onDelete,
}: {
  prefill?: { timeSlot: string; bedNumber: number };
  appointment?: any;
  therapies: any[];
  onClose: () => void;
  onSave: () => void;
  onDelete: (id: string) => void;
}) {
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(appointment?.patientId || "");
  const [selectedTherapyId, setSelectedTherapyId] = useState(appointment?.therapyId || therapies[0]?.id || "");
  const [date, setDate] = useState(appointment?.date || new Date().toISOString().split("T")[0]);
  const [timeSlot, setTimeSlot] = useState(appointment?.timeSlot || prefill?.timeSlot || "07:00");
  const [bedNumber, setBedNumber] = useState(appointment?.bedNumber || prefill?.bedNumber || 1);
  const [status, setStatus] = useState(appointment?.status || "Agendada");
  const [tipo, setTipo] = useState(appointment?.tipo || "COT");
  const [rx, setRx] = useState(appointment?.rx || false);
  const [notes, setNotes] = useState(appointment?.notes || "");
  const [submitting, setSubmitting] = useState(false);

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
    if (!selectedPatientId || !selectedTherapyId || !date || !timeSlot || bedNumber === undefined) {
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
          date,
          timeSlot,
          bedNumber: parseInt(bedNumber.toString()),
          status,
          tipo,
          rx,
          notes,
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
    <form onSubmit={handleSubmit} className="glass p-6 w-full max-w-lg bg-[#121826]/95 flex flex-col gap-4 text-left border border-white/10 glow-teal">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="font-bold text-sm text-white">
          {appointment ? "Editar Cita Quiropráctica" : "Agendar Consulta de Terapia"}
        </h3>
        <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition">
          <X size={16} />
        </button>
      </div>

      {/* Patient Search and Selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-slate-400 font-medium">1. Seleccionar Paciente *</label>
        
        {appointment ? (
          <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5 text-sm font-semibold text-teal-400">
            {appointment.patient.lastName}, {appointment.patient.firstName}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="text"
                placeholder="Escribe para buscar paciente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 py-2 text-xs"
              />
            </div>
            
            <select
              value={selectedPatientId}
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

      {/* Row: Date & Time */}
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Fecha *</label>
          <input
            type="date"
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
          <label className="text-xs text-slate-400 font-medium">Cama/Cochera *</label>
          <select
            value={bedNumber}
            onChange={(e) => setBedNumber(parseInt(e.target.value))}
            className="w-full bg-[#1b2336] text-xs py-2 px-3"
            required
          >
            {BEDS.map((bed) => (
              <option key={bed} value={bed}>
                Cama {bed}
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

      {/* Row: Tipo & Rx */}
      <div className="grid grid-cols-2 gap-4 items-center mt-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-slate-400 font-medium">Tipo</label>
          <input
            type="text"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="COT, etc."
            className="w-full text-xs"
          />
        </div>
        
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => setRx(!rx)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300"
          >
            {rx ? (
              <CheckSquare size={18} className="text-cyan-400" />
            ) : (
              <Square size={18} className="text-slate-600" />
            )}
            <span>¿Requiere Rx (Radiografías)?</span>
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium">Notas / Observaciones</label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anotar detalles especiales..."
          className="w-full bg-[#1b2336] text-xs leading-normal resize-none"
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-4">
        <div>
          {appointment && (
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

  // Compute pending balance
  const price = appointment.therapy.price;
  const previousPaid = appointment.payments ? appointment.payments.reduce((sum: number, p: any) => sum + p.amount, 0) : appointment.paid || 0;
  const pending = Math.max(0, price - previousPaid);

  useEffect(() => {
    // Default the billing input to the remaining pending amount
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
    <form onSubmit={handleSubmit} className="glass p-6 w-full max-w-sm bg-[#121826]/95 flex flex-col gap-4 text-left border border-white/10 glow-teal">
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
          className="font-extrabold text-teal-400"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-slate-400 font-medium">Método de Pago *</label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="bg-[#1b2336] text-xs py-2 px-3"
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
