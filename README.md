# Sistema de Agenda y Gestión Quiropráctica

Este es un sistema web optimizado tipo aplicación de escritorio diseñado para la administración de citas, control de camas de terapia, registro de pacientes, estados de cobro y sincronización con Google Calendar. Está listo para ser desplegado en tu servidor VPS mediante Docker.

---

## 🛠 Requisitos en el VPS
1. **Docker** y **Docker Compose**.
2. **Nginx** instalado en el host (como proxy reverso).
3. Certificado SSL (e.g., Let's Encrypt / Certbot).

---

## 🚀 Guía de Despliegue en 3 Pasos

### 1. Clonar y Configurar Variables de Entorno (`.env`)
Sube la carpeta del proyecto a tu VPS. Crea un archivo `.env` en la raíz del proyecto con la configuración de Google OAuth y la URL de redirección:

```env
# Credenciales del flujo Google OAuth (se crean en Google Cloud Console)
GOOGLE_CLIENT_ID=tu_cliente_id_aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_secreto_aqui
GOOGLE_REDIRECT_URI=https://agenda.tudominio.com/api/google-auth/callback
```

### 2. Levantar la Aplicación en Docker
Ejecuta el siguiente comando para compilar el contenedor e iniciar el servidor de producción en segundo plano:

```bash
docker compose up -d --build
```

> **Persistencia de Datos**: Docker Compose creará un volumen llamado `quiropractico_db-data` montado en `/app/data` para almacenar el archivo `dev.db` de SQLite. Tus datos no se perderán cuando reinicies, actualices o detengas el contenedor.

### 3. Configurar Nginx y HTTPS
Crea una configuración para tu dominio en `/etc/nginx/sites-available/agenda.tudominio.com`:

```nginx
server {
    listen 80;
    server_name agenda.tudominio.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name agenda.tudominio.com;

    ssl_certificate /etc/letsencrypt/live/agenda.tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agenda.tudominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Aumentar timeouts para peticiones largas (sincronizaciones)
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Habilita el sitio y recarga Nginx:
```bash
ln -s /etc/nginx/sites-available/agenda.tudominio.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 💾 Respaldo y Recuperación (Soporte Técnico)

### Respaldar
El sistema tiene un botón integrado en **Configuración > Soporte y Respaldos** que permite a la recepcionista descargar el archivo SQLite completo `.db` directamente en su navegador.
Si prefieres hacerlo vía consola en el VPS, puedes copiar el archivo desde el volumen de Docker:

```bash
# Copia la base de datos a tu directorio actual
docker cp quiropractico-app:/app/data/dev.db ./copia_respaldo.db
```

### Restaurar
Para restaurar una copia de seguridad en un contenedor nuevo o existente:

1. Detén el contenedor: `docker compose down`
2. Copia tu archivo de respaldo al volumen Docker (o reemplázalo en el volumen en `/var/lib/docker/volumes/quiropractico_db-data/_data/dev.db` si usas la ruta por defecto).
3. Inicia el contenedor: `docker compose up -d`
