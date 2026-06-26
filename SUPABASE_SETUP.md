# 🚀 Setup con Supabase (Base de Datos)

## Resumen: 3 pasos simples

1. **Crear proyecto en Supabase** y obtener connection string
2. **Ejecutar 2 scripts SQL** en el SQL Editor de Supabase
3. **Configurar DATABASE_URL** en Render con la connection string

---

## Paso 1: Crear Proyecto en Supabase

1. Ve a https://supabase.com/dashboard
2. Click **"New project"**
3. Configuración:
   - **Name**: `pacientes-terremoto`
   - **Database Password**: (crea una contraseña fuerte y guárdala)
   - **Region**: South America (São Paulo) o el más cercano
   - **Pricing Plan**: Free
4. Click **"Create new project"**
5. Espera 1-2 minutos mientras se crea

---

## Paso 2: Ejecutar Scripts SQL

### 2.1 Obtener los scripts

Tienes 2 archivos SQL que necesitas ejecutar:

1. `database/supabase_setup_completo.sql` - Crea todas las tablas e índices
2. `database/venezuela_data.sql` - Carga los estados, municipios y parroquias

### 2.2 Ejecutar en Supabase SQL Editor

1. En tu proyecto Supabase, click en **"SQL Editor"** (ícono </> en la barra lateral)
2. Click en **"New query"**

**Ejecutar Script 1:**
3. Copia TODO el contenido de `database/supabase_setup_completo.sql`
4. Pégalo en el SQL Editor
5. Click **"Run"** (o presiona Ctrl+Enter)
6. Deberías ver: ✅ "Tablas creadas exitosamente"

**Ejecutar Script 2:**
7. Click en **"New query"** nuevamente
8. Copia TODO el contenido de `database/venezuela_data.sql`
9. Pégalo en el SQL Editor
10. Click **"Run"**
11. Debería cargar 24 estados, 335 municipios y 1134 parroquias

### 2.3 Verificar que se cargó correctamente

Ejecuta esta consulta en SQL Editor:

```sql
SELECT 
    (SELECT COUNT(*) FROM estados) as estados_count,
    (SELECT COUNT(*) FROM municipios) as municipios_count,
    (SELECT COUNT(*) FROM parroquias) as parroquias_count,
    (SELECT COUNT(*) FROM pacientes) as pacientes_count;
```

Deberías ver:
- estados_count: 24
- municipios_count: 335
- parroquias_count: 1134
- pacientes_count: 0 (por ahora)

---

## Paso 3: Obtener Connection String

1. En tu proyecto Supabase, click en **"Settings"** (⚙️)
2. Click en **"Database"** en el menú lateral
3. Scroll hasta **"Connection string"**
4. Selecciona el tab **"URI"**
5. Verás algo como:
   ```
   postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
6. **Reemplaza `[YOUR-PASSWORD]`** con la contraseña que creaste en el Paso 1
7. **IMPORTANTE**: Supabase usa el puerto **6543** (no 5432)
8. Copia la URL completa

**Ejemplo de URL final:**
```
postgresql://postgres.abcdefghijk:MiContraseñaSegura123@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

---

## Paso 4: Configurar Render con Supabase

1. Ve a tu **Web Service** en Render Dashboard
2. Click en **"Environment"** en el menú lateral
3. Busca o agrega la variable `DATABASE_URL`
4. Pega la connection string de Supabase
5. **Importante**: Supabase ya incluye SSL, NO agregues `?sslmode=require`

**Variables de entorno en Render:**

```
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres
PORT=8080
MAX_DB_CONNECTIONS=10
MAX_IDLE_CONNECTIONS=3
RATE_LIMIT_PER_MINUTE=100
```

6. Click **"Save Changes"**
7. Render reiniciará automáticamente el servicio

---

## ✅ Verificación Final

Después de que Render reinicie, deberías ver en los logs:

```
✅ Conectado a la base de datos exitosamente
🚀 Servidor escuchando en puerto 8080
```

**NO** deberías ver:
```
❌ Error conectando a la base de datos: connection refused
```

---

## 🔧 Troubleshooting

### Error: "connection refused"
- Verifica que la connection string sea correcta
- Asegúrate de haber reemplazado `[YOUR-PASSWORD]` con tu contraseña real
- Verifica que el puerto sea **6543** (no 5432)

### Error: "relation 'estados' does not exist"
- No ejecutaste los scripts SQL
- Ve al Paso 2 y ejecuta ambos scripts

### Error: "too many connections"
- Reduce `MAX_DB_CONNECTIONS` a 5 en Render
- Supabase free tier tiene límite de conexiones

### Supabase está "pausado" (paused)
- Supabase free tier pausa proyectos inactivos después de 7 días
- Ve a tu proyecto y click "Resume" para reactivarlo

---

## 📊 Monitorear Supabase

**Ver tablas y datos:**
1. Click en **"Table Editor"** en Supabase
2. Verás todas tus tablas: pacientes, estados, municipios, parroquias
3. Puedes ver, editar y filtrar datos directamente

**Ver logs de la base de datos:**
1. Click en **"Logs"** en Supabase
2. Selecciona **"Postgres Logs"**
3. Verás todas las queries ejecutadas

**Límites del Free Tier:**
- 500 MB de almacenamiento
- Hasta 2 GB de transferencia
- Conexiones directas limitadas
- Proyecto se pausa después de 1 semana de inactividad

---

## 🎉 ¡Listo!

Ahora tu aplicación debería estar funcionando:

- **Frontend (Vercel)**: `https://tu-proyecto.vercel.app`
- **Backend (Render)**: `https://tu-backend.onrender.com`
- **Database (Supabase)**: `aws-0-us-east-1.pooler.supabase.com`

**Próximo paso**: Configurar el frontend en Vercel para que apunte al backend de Render.
