# Manual de Usuario: Centro Quiropráctico de Monterrey

Este manual describe el funcionamiento y uso diario del sistema web para la administración de la clínica **Centro Quiropráctico de Monterrey** del **Dr. David Rodríguez Garita**. El sistema está optimizado para funcionar como una aplicación de escritorio ágil, facilitando el trabajo de la **Asistente Clínica**.

---

## 📋 Tabla de Contenidos
1. [Acceso al Sistema](#-acceso-al-sistema)
2. [Estructura General](#-estructura-general)
3. [Agenda Diaria (Flujo Principal)](#-agenda-diaria-flujo-principal)
4. [Gestión de Pacientes](#-gestión-de-pacientes)
5. [Caja e Ingresos](#-caja-e-ingresos)
6. [Catálogo de Terapias](#-catálogo-de-terapias)
7. [Configuración y Soporte](#-configuración-y-soporte)

---

## 💻 Acceso al Sistema

Para ingresar al sistema, abre el navegador web e introduce la dirección asignada a tu VPS (ej. `https://agenda.tudominio.com`). 

El sistema cuenta con un indicador visual en la esquina superior derecha que muestra el estado **"Online VPS"**, asegurando que estás conectado correctamente al servidor en la nube.

---

## 🏛 Estructura General

La interfaz está dividida en dos secciones principales:
1. **Barra Lateral Izquierda (Menú):** Permite navegar entre las 5 secciones del sistema.
2. **Panel Principal:** Muestra la información correspondiente a la pestaña seleccionada. En la parte superior cuenta con la barra de fecha (para navegar en el calendario) y el estado de la conexión.

---

## 📅 Agenda Diaria (Flujo Principal)

Esta es la pantalla de trabajo principal. Muestra una **matriz interactiva** organizada por **horas** (en intervalos de 15 minutos, desde las 06:30 hs hasta las 18:45 hs) y por **camillas** (Cama 1, Cama 2, Cama 3 y Cama 4).

### 1. Métricas del Día
En la parte superior verás 4 tarjetas informativas automáticas para la fecha seleccionada:
*   **Citas Programadas:** Total de citas activas (excluye canceladas).
*   **Citas Confirmadas:** Citas que han sido marcadas como confirmadas.
*   **Pagos Pendientes:** Citas agendadas que aún no se han liquidado.
*   **Citas Canceladas:** Historial de citas anuladas el día de hoy.

### 2. Agendar una Nueva Cita
Para agendar una cita en una hora y camilla específica:
1. Pasa el cursor sobre el espacio vacío de la camilla y hora deseada; verás aparecer un botón con el símbolo **`+`**.
2. Haz clic en el botón **`+`**. Se abrirá el formulario de **Nueva Cita**.
3. **Buscar Paciente:** Escribe el nombre del paciente. El sistema autocompletará con los pacientes registrados. Si es nuevo, primero deberás registrarlo en la pestaña de Pacientes.
4. **Servicio/Terapia:** Selecciona el tratamiento que recibirá.
5. **Notas:** Escribe observaciones relevantes (ej. *"Dolor en espalda baja"*).
6. Haz clic en **Guardar**. La cita se sincronizará automáticamente en la agenda y en el Google Calendar del Dr. (si está conectado).

### 3. Gestionar una Cita Existente
Cada tarjeta de cita en la agenda te permite realizar acciones rápidas sin abrir menús complejos:
*   **Cambiar Estado de la Cita:** Haz clic sobre el botón del estado (ej: `Agendada`, `Confirmada` o `Cancelada`) para cambiarlo de manera cíclica con un solo clic.
*   **Marcar Radiografías (Rx):** Haz clic sobre el botón **`Rx`**. Si se muestra iluminado en color cian, significa que el paciente tiene radiografías listas para revisión en su sesión.
*   **Registrar Pago:** Haz clic en el botón del precio (ej. `$800 (Pendiente)`). Se abrirá una ventana para registrar el monto abonado y el método de pago (Efectivo, Tarjeta o Transferencia). El estado cambiará a `Parcial` o `Pagado`.
*   **Enviar Recordatorio de WhatsApp:** Haz clic en el icono verde de mensaje (se muestra al pasar el cursor sobre la cita). Esto abrirá automáticamente un chat de WhatsApp con el paciente, incluyendo una plantilla de texto personalizada lista para enviar.
*   **Editar o Eliminar:** Haz clic en el icono de configuración (engranaje) en la tarjeta de la cita para abrir el formulario completo donde podrás modificar detalles o eliminar la cita permanentemente.

---

## 👥 Gestión de Pacientes

En esta pestaña se encuentra el padrón completo de la clínica.

*   **Buscador:** Utiliza la barra superior para buscar pacientes de forma rápida por su nombre, apellidos o número telefónico.
*   **Crear Paciente:** Haz clic en **`+ Nuevo Paciente`**. Llena los campos:
    *   Nombre(s) y Apellidos.
    *   Teléfono 1 (Principal) y Teléfono 2 (Opcional).
    *   Género/Código (campo para clasificar de acuerdo a la categorización interna de la clínica, ej. `A02`, `A04`).
*   **Editar Paciente:** En la tabla de resultados, haz clic en **`Editar`** junto al paciente correspondiente para corregir o actualizar sus datos de contacto.

---

## 💰 Caja e Ingresos

Esta sección ayuda a llevar el control financiero de la clínica día con día.

### 1. Resumen de Caja
*   **Recaudación Diaria:** Total de dinero cobrado y registrado durante el día seleccionado (efectivo, tarjeta y transferencias combinadas). También muestra el número de transacciones realizadas.
*   **Adeudos Totales por Cobrar:** Suma acumulada de todas las citas pasadas y presentes que están marcadas como `Pendiente` o `Parcial`.

### 2. Cortes de Caja de Hoy
Lista todos los pagos individuales que ha recibido la asistente durante el día. Cada registro muestra:
*   Nombre del paciente.
*   Terapia recibida.
*   Método de pago utilizado.
*   Hora de la cita.
*   Monto pagado.

### 3. Pacientes con Adeudos
Muestra la lista de pacientes que tienen cuentas pendientes con la clínica, facilitando el cobro en su próxima visita.

---

## 🩺 Catálogo de Terapias

Aquí puedes visualizar los servicios y terapias que ofrece la clínica. Cada tarjeta de terapia muestra:
*   El código identificador interno.
*   El nombre del tratamiento y su descripción.
*   El precio estándar del servicio.
*   Un color distintivo. Este color se utiliza para pintar las tarjetas en la agenda diaria, lo que permite a la asistente identificar visualmente y a simple vista qué tipo de terapia se está aplicando en cada camilla.

---

## ⚙️ Configuración y Soporte

Esta sección está reservada para personalizar el sistema y realizar mantenimiento.

### 1. Plantilla de WhatsApp
Puedes cambiar el mensaje automático que se envía a los pacientes para recordarles su cita. 
Puedes escribir el texto libremente y utilizar comodines que el sistema rellenará automáticamente antes de enviar:
*   `{paciente}`: Se sustituye por el nombre completo del paciente.
*   `{terapia}`: Se sustituye por el nombre de la terapia asignada.
*   `{fecha}`: Se sustituye por la fecha de la cita (DD/MM/AAAA).
*   `{hora}`: Se sustituye por el bloque de hora seleccionado (HH:MM).

*Ejemplo de plantilla:*
> *"Hola `{paciente}`, te recordamos tu cita de `{terapia}` el `{fecha}` a las `{hora}`. Confírmanos por este medio."*

Una vez editada, haz clic en **Guardar Plantilla**.

### 2. Google Calendar Link
Permite sincronizar las citas del sistema con el calendario personal de Google del Doctor.
*   **Vincular Cuenta:** Si no está conectado, haz clic en **`Vincular Cuenta de Google del Dr.`** para autorizar el acceso mediante el flujo seguro de Google.
*   **Estado:** Si ya está vinculado, mostrará el mensaje en verde **"Sincronización Activa"** junto a la fecha de la última actualización.
*   **Desvincular:** Puedes hacer clic en **`Desconectar`** en cualquier momento para desactivar la sincronización en tiempo real.

### 3. Soporte y Respaldos (Backups)
Dado que el sistema guarda la información en una base de datos local ligera (`dev.db`), es muy fácil respaldarla:
*   Haz clic en el botón **`Descargar Base de Datos Completa (.db)`**.
*   El sistema descargará un archivo de respaldo directamente en tu computadora a través del navegador.
*   **Importante:** Se recomienda realizar esta descarga semanal o mensualmente como medida de seguridad. Puedes enviar este archivo al soporte técnico en caso de que requieras restaurar los datos en un nuevo servidor.
