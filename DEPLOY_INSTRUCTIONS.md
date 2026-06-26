# 🚀 Instrucciones de Deploy

## Resumen Rápido

**Variables de entorno necesarias:**

### Backend (Render):
```
DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require
PORT=8080
MAX_DB_CONNECTIONS=10
MAX_IDLE_CONNECTIONS=3
RATE_LIMIT_PER_MINUTE=100
```

### Frontend (Vercel):
Editar `frontend/config.js` después del deploy con la URL de tu backend Render.

---

## 📋 Paso a Paso

### 1️⃣ Preparar el Repositorio Git

```bash
# Inicializar git si no está inicializado
git init

# Agregar archivos
git add .

# Commit
git commit -m "Initial commit - Sistema de Pacientes"

# Crear repositorio en GitHub y hacer push
git remote add origin https://github.com/tu-usuario/tu-repo.git
git branch -M main
git push -u origin main
```

---

### 2️⃣ Deploy en Render (Backend + Database)

#### A. Crear Base de Datos PostgreSQL

1. Ve a [Render Dashboard](https://dashboard.render.com/)
2. Click en "New +" → "PostgreSQL"
3. Configuración:
   - **Name**: `pacientes-db`
   - **Database**: `pacientes_db`
   - **User**: `pacientes_user`
   - **Region**: Elige el más cercano
   - **Plan**: Free
4. Click "Create Database"
5. **Guarda la "Internal Database URL"** (la necesitarás)

#### B. Ejecutar Migraciones en la Base de Datos

Opción 1: Usando psql desde tu computadora
```bash
# Conectar a Render DB
psql "INTERNAL_DATABASE_URL_AQUI"

# Ejecutar migraciones en orden:
\i database/estados_schema.sql
\i database/venezuela_data.sql  
\i database/verificar_y_agregar_columnas.sql
```

Opción 2: Desde el Shell de Render
1. Ve a tu database en Render Dashboard
2. Click en "Connect" → "External Connection"
3. Copia los comandos y ejecútalos localmente

#### C. Crear Web Service (Backend Go)

1. Click en "New +" → "Web Service"
2. Conecta tu repositorio de GitHub
3. Configuración:
   - **Name**: `pacientes-backend`
   - **Region**: Mismo que la DB
   - **Branch**: `main`
   - **Root Directory**: (dejar vacío)
   - **Environment**: `Go`
   - **Build Command**: `cd backend && go build -o pacientes-server`
   - **Start Command**: `cd backend && ./pacientes-server`
   - **Plan**: Free
4. Variables de Entorno (Environment Variables):
   ```
   DATABASE_URL=<PEGA LA INTERNAL DATABASE URL>
   PORT=8080
   MAX_DB_CONNECTIONS=10
   MAX_IDLE_CONNECTIONS=3
   RATE_LIMIT_PER_MINUTE=100
   ```
5. Click "Create Web Service"
6. Espera a que se complete el deploy (5-10 min)
7. **Copia la URL de tu backend** (ej: `https://pacientes-backend-xxxx.onrender.com`)

---

### 3️⃣ Deploy en Vercel (Frontend)

#### A. Configurar el Frontend

1. Edita `frontend/config.js`:
   ```javascript
   window.ENV = {
       API_BASE_URL: 'https://TU-BACKEND-RENDER.onrender.com/api',
       ENABLE_DEBUG: false
   };
   ```

2. Commit y push los cambios:
   ```bash
   git add frontend/config.js
   git commit -m "Update API URL for production"
   git push
   ```

#### B. Deploy en Vercel

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Importa tu repositorio de GitHub
4. Configuración:
   - **Project Name**: `pacientes-terremoto`
   - **Framework Preset**: Other
   - **Root Directory**: `frontend`
   - **Build Command**: (dejar vacío)
   - **Output Directory**: `.`
   - **Install Command**: (dejar vacío)
5. Click "Deploy"
6. Espera a que termine (1-2 min)
7. **Tu sitio estará en**: `https://tu-proyecto.vercel.app`

---

### 4️⃣ Configurar CORS en el Backend

Después del primer deploy, necesitas actualizar el CORS en el backend:

Edita `backend/middleware/middleware.go`:

```go
func CORSMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Permitir tu dominio de Vercel
		w.Header().Set("Access-Control-Allow-Origin", "https://tu-proyecto.vercel.app")
		// ... resto del código
```

Commit y push:
```bash
git add backend/middleware/middleware.go
git commit -m "Update CORS for production"
git push
```

Render automáticamente hará redeploy del backend.

---

## ✅ Verificación

1. **Backend Health Check**:
   ```bash
   curl https://tu-backend.onrender.com/health
   ```
   Debería responder: `{"status":"ok"}`

2. **Database Connection**:
   ```bash
   curl https://tu-backend.onrender.com/api/estados
   ```
   Debería retornar lista de estados de Venezuela

3. **Frontend**:
   Visita `https://tu-proyecto.vercel.app` y prueba:
   - Ver pacientes
   - Registrar un paciente nuevo
   - Buscar pacientes

---

## 🔧 Troubleshooting

### Backend no inicia
- Verifica los logs en Render Dashboard
- Confirma que DATABASE_URL esté correcto
- Asegúrate que las migraciones se ejecutaron

### Frontend no conecta con Backend
- Verifica que `config.js` tenga la URL correcta
- Verifica CORS en el backend
- Revisa la consola del navegador (F12)

### Base de datos vacía
- Ejecuta las migraciones en orden
- Verifica la conexión con psql

### Error "Database connection failed"
- Asegúrate de usar `sslmode=require` en la URL de Render
- Verifica que la Internal Database URL sea correcta

---

## 📊 Monitoreo

### Render
- Logs: Dashboard → Tu servicio → Logs
- Métricas: Dashboard → Tu servicio → Metrics
- Shell: Dashboard → Tu servicio → Shell

### Vercel
- Logs: Dashboard → Tu proyecto → Deployments → [deployment] → Logs
- Analytics: Dashboard → Tu proyecto → Analytics

---

## 🔄 Redeploy

### Backend
```bash
git add .
git commit -m "Update backend"
git push
```
Render automáticamente hace redeploy.

### Frontend
```bash
git add frontend/
git commit -m "Update frontend"
git push
```
Vercel automáticamente hace redeploy.

---

## 💰 Costos

- **Render Free Tier**: 
  - 750 horas/mes web service
  - PostgreSQL: 1GB storage, 90 días sin actividad se suspende
  - Backend duerme después de 15 min sin actividad

- **Vercel Free Tier**:
  - Bandwidth ilimitado
  - 100 GB por mes
  - Deploy ilimitados

**Total: $0/mes** 🎉

---

## 🎯 URLs Finales

Después del deploy tendrás:

```
Frontend:  https://tu-proyecto.vercel.app
Backend:   https://pacientes-backend-xxxx.onrender.com
Database:  dpg-xxxxx.oregon-postgres.render.com
```

¡Guarda estas URLs!
