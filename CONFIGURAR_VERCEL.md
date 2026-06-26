# 🌐 Configurar Frontend en Vercel

## ✅ Paso 1: Hacer Commit y Push

El archivo `frontend/config.js` ya está actualizado con la URL de tu backend.

```bash
cd "c:\xampp\htdocs\Lista de pacientes"
git add frontend/config.js
git commit -m "Configure backend URL for production"
git push origin main
```

---

## 🚀 Paso 2: Deploy en Vercel

### Opción A: Desde el Dashboard (Recomendado)

1. Ve a https://vercel.com/dashboard
2. Click en **"Add New..."** → **"Project"**
3. Importa tu repositorio de GitHub:
   ```
   https://github.com/zyberprooficial-stack/Lista_pacientes
   ```

4. **Configuración del proyecto:**
   ```
   Project Name: lista-pacientes
   Framework Preset: Other
   Root Directory: frontend
   Build Command: (dejar vacío)
   Output Directory: .
   Install Command: (dejar vacío)
   ```

5. **NO necesitas variables de entorno** (ya está en config.js)

6. Click **"Deploy"**

7. Espera 1-2 minutos

8. Tu sitio estará en: `https://lista-pacientes.vercel.app`

### Opción B: Desde la Terminal

```bash
# Instalar Vercel CLI (si no lo tienes)
npm install -g vercel

# Desde la raíz del proyecto
cd "c:\xampp\htdocs\Lista de pacientes"

# Deploy
vercel

# Seguir las instrucciones:
# - Set up and deploy? Yes
# - Which scope? [tu cuenta]
# - Link to existing project? No
# - Project name? lista-pacientes
# - In which directory? frontend
# - Override settings? No
```

---

## 🔒 Paso 3: Actualizar CORS en Backend (IMPORTANTE)

Una vez que tengas tu URL de Vercel (ej: `https://lista-pacientes.vercel.app`), 

### Actualizar el backend:

Edita `backend/middleware/middleware.go`:

**Cambiar de:**
```go
w.Header().Set("Access-Control-Allow-Origin", "*")
```

**A:**
```go
// Permitir solo tu dominio de Vercel
origin := r.Header.Get("Origin")
allowedOrigins := []string{
    "https://lista-pacientes.vercel.app",
    "http://localhost:3000",  // Para desarrollo local
}

for _, allowed := range allowedOrigins {
    if origin == allowed {
        w.Header().Set("Access-Control-Allow-Origin", origin)
        break
    }
}
```

### Hacer commit y push:

```bash
git add backend/middleware/middleware.go
git commit -m "Update CORS for production domain"
git push origin main
```

Render automáticamente hará redeploy del backend (2-3 minutos).

---

## ✅ Paso 4: Verificar que Funciona

1. Visita tu sitio en Vercel: `https://[tu-proyecto].vercel.app`

2. Abre la consola del navegador (F12)

3. Intenta buscar pacientes o ver los estados

4. **Si ves errores de CORS:**
   - Verifica que actualizaste el middleware
   - Confirma que el backend se redesployó
   - Espera 2-3 minutos para el cache DNS

5. **Si todo funciona:**
   - ✅ Puedes registrar pacientes
   - ✅ Búsquedas funcionan
   - ✅ Dropdowns de estados/municipios cargan

---

## 🎯 URLs Finales

Después de completar el deploy:

```
Frontend (Vercel):  https://lista-pacientes.vercel.app
Backend (Render):   https://lista-pacientes.onrender.com
Database (Render):  dpg-xxxxx.oregon-postgres.render.com
```

---

## 🔧 Troubleshooting

### Error: "Failed to fetch" o "Network Error"

**Causa**: El backend no está respondiendo o CORS bloqueado

**Solución**:
1. Verifica que el backend esté corriendo: `https://lista-pacientes.onrender.com/health`
2. Debe responder: `{"status":"ok"}`
3. Si no responde, revisa los logs en Render

### Error: "CORS policy blocked"

**Causa**: El middleware CORS no está permitiendo tu dominio

**Solución**:
1. Actualiza `middleware.go` con tu dominio de Vercel
2. Haz commit y push
3. Espera que Render redespliegue (2-3 min)

### Página se ve pero no carga datos

**Causa**: URL del API incorrecta en `config.js`

**Solución**:
1. Abre la consola (F12) → Network
2. Busca requests a `/api/estados` o `/api/pacientes`
3. Verifica que vayan a: `https://lista-pacientes.onrender.com/api/...`
4. Si van a `localhost`, actualiza `config.js`

---

## 🎉 ¡Listo!

Tu aplicación está completamente desplegada:

- ✅ Frontend en Vercel (ultrarrápido, global CDN)
- ✅ Backend en Render (always on, $7/mes)
- ✅ Base de datos en Render PostgreSQL (FREE)

**Costo total**: $7/mes

**Capacidad**: 100-200 usuarios simultáneos

---

## 📱 Dominios Personalizados (Opcional)

Si quieres usar tu propio dominio (ej: `pacientes.midominio.com`):

### En Vercel:
1. Ve a Settings → Domains
2. Agrega tu dominio
3. Sigue las instrucciones DNS

### En Render:
1. Ve a Settings → Custom Domains
2. Agrega tu dominio para el backend
3. Actualiza `config.js` con el nuevo dominio

**Costo**: $0 (Vercel incluye SSL gratis)
