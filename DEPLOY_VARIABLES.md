# Variables de Entorno para Deploy

## 🚀 RENDER (Backend Go)

### Variables requeridas:

```
DATABASE_URL=postgres://usuario:contraseña@host:5432/nombre_db?sslmode=require
PORT=8080
MAX_DB_CONNECTIONS=20
MAX_IDLE_CONNECTIONS=5
RATE_LIMIT_PER_MINUTE=100
```

### Ejemplo con Render PostgreSQL:
```
DATABASE_URL=postgres://pacientes_db_user:contraseña_generada@dpg-xxxxx.oregon-postgres.render.com/pacientes_db?sslmode=require
PORT=8080
MAX_DB_CONNECTIONS=10
MAX_IDLE_CONNECTIONS=3
RATE_LIMIT_PER_MINUTE=100
```

### Pasos en Render:

1. **Crear PostgreSQL Database**:
   - Database Name: `pacientes_db`
   - Copia la "Internal Database URL" o "External Database URL"

2. **Crear Web Service (Backend)**:
   - Build Command: `cd backend && go build -o pacientes-server`
   - Start Command: `cd backend && ./pacientes-server`
   - Environment: Go
   - Agrega las variables de entorno en "Environment"

3. **Ejecutar Migraciones**:
   - Conecta a tu base de datos Render usando psql o pgAdmin
   - Ejecuta en orden:
     ```
     database/estados_schema.sql
     database/venezuela_data.sql
     database/verificar_y_agregar_columnas.sql
     ```

---

## 🌐 VERCEL (Frontend)

### Variables requeridas:

```
VITE_API_BASE_URL=https://tu-backend.onrender.com/api
```

### Si usas API Routes de Vercel (opcional):
```
DATABASE_URL=postgres://usuario:contraseña@host:5432/nombre_db?sslmode=require
```

### Pasos en Vercel:

1. **Configurar proyecto**:
   - Root Directory: `frontend`
   - Framework Preset: Other
   - Build Command: (dejar vacío o `echo "No build needed"`)
   - Output Directory: `.`
   - Install Command: `npm install` (si usas node modules, sino dejar vacío)

2. **Variables de entorno**:
   - Ve a Settings > Environment Variables
   - Agrega: `VITE_API_BASE_URL` con el valor de tu backend Render

3. **Actualizar app.js**:
   - Cambiar `API_BASE_URL` para usar variable de entorno o el dominio de Render

---

## 📋 RESUMEN DE URLS

Después del deploy tendrás:

- **Frontend (Vercel)**: `https://tu-proyecto.vercel.app`
- **Backend (Render)**: `https://tu-backend.onrender.com`
- **Database (Render)**: `dpg-xxxxx.oregon-postgres.render.com:5432`

---

## ⚠️ CONFIGURACIONES IMPORTANTES

### 1. CORS en Backend (main.go)

Asegúrate que el backend permita requests desde Vercel:

```go
// Permitir CORS desde Vercel
w.Header().Set("Access-Control-Allow-Origin", "https://tu-proyecto.vercel.app")
```

### 2. DATABASE_URL Format

**Render PostgreSQL URL viene en formato**:
```
postgres://user:password@host/database
```

**Puede necesitar agregar**:
```
?sslmode=require
```

### 3. Frontend API URL

En `frontend/app.js`, cambiar:

```javascript
// Desarrollo local
const API_BASE_URL = 'http://localhost:8080/api';

// Producción (después de deploy)
const API_BASE_URL = 'https://tu-backend.onrender.com/api';
```

O mejor aún, usar variable de entorno:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
```

---

## 🔧 COMANDOS ÚTILES

### Compilar backend localmente:
```bash
cd backend
go build -o pacientes-server
```

### Probar conexión a DB de Render:
```bash
psql "postgres://user:pass@host/db?sslmode=require"
```

### Ver logs en Render:
- Ve al dashboard de tu servicio
- Click en "Logs" tab

---

## 📊 MIGRACIONES DE BASE DE DATOS

Orden de ejecución en la nueva base de datos:

1. `database/estados_schema.sql` - Crea tablas de geografía
2. `database/venezuela_data.sql` - Carga estados, municipios, parroquias
3. `database/verificar_y_agregar_columnas.sql` - Agrega campos telefono y edad

Si usas el schema completo:
1. `database/schema.sql` - Crea tabla pacientes
2. Ejecutar pasos 1-3 de arriba

---

## 🔐 SEGURIDAD

**NO subas a Git**:
- `.env` (ya está en .gitignore)
- Credenciales de base de datos
- Tokens o API keys

**Sube a Git**:
- `.env.example` (con valores de ejemplo)
- Todo el código fuente
- Archivos SQL de migraciones

