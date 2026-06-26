# 🏥 Sistema de Consulta de Pacientes - Terremoto Venezuela

Sistema web para gestionar y consultar información de pacientes afectados por desastres naturales en Venezuela. Desarrollado con Go (backend) y JavaScript vanilla (frontend).

## 🌟 Características

- ✅ Registro público de pacientes con información geográfica detallada
- 🔍 Búsqueda avanzada con múltiples filtros (nombre, cédula, ubicación, estado de salud)
- 📊 Paginación optimizada para manejar grandes volúmenes de datos
- 🗺️ Integración con estados, municipios y parroquias de Venezuela
- 📱 Diseño responsive adaptado a móviles y tablets
- ⚡ Backend optimizado con connection pooling y rate limiting
- 🔒 Validaciones robustas y sanitización de datos
- 🚀 Listo para deploy en Render (backend) y Vercel (frontend)

## 🛠️ Stack Tecnológico

### Backend
- **Lenguaje**: Go 1.21+
- **Base de datos**: PostgreSQL 14+
- **Arquitectura**: API RESTful
- **Features**: Connection pooling, rate limiting, CORS, índices full-text

### Frontend
- **Tecnologías**: HTML5, CSS3, JavaScript (ES6+)
- **Framework**: Vanilla JS (sin dependencias)
- **UI**: Responsive design con CSS Grid y Flexbox
- **API**: Fetch API con manejo de errores

## 📁 Estructura del Proyecto

```
Lista de pacientes/
├── backend/
│   ├── config/          # Configuración de la aplicación
│   ├── database/        # Capa de acceso a datos
│   ├── handlers/        # Handlers HTTP
│   ├── middleware/      # Middleware (CORS, Rate Limit)
│   ├── models/          # Modelos de datos
│   ├── main.go          # Punto de entrada
│   ├── go.mod           # Dependencias Go
│   └── build.bat        # Script de compilación
├── frontend/
│   ├── index.html       # Página principal
│   ├── app.js           # Lógica de la aplicación
│   ├── styles.css       # Estilos CSS
│   └── config.js        # Configuración del frontend
├── database/
│   ├── schema.sql                      # Schema inicial
│   ├── estados_schema.sql              # Tablas geográficas
│   ├── venezuela_data.sql              # Datos de Venezuela
│   ├── verificar_y_agregar_columnas.sql # Migraciones
│   └── migration_*.sql                 # Migraciones individuales
├── .env.example         # Variables de entorno ejemplo
├── render.yaml          # Configuración para Render
├── vercel.json          # Configuración para Vercel
└── README.md            # Este archivo
```

## 🚀 Inicio Rápido (Desarrollo Local)

### Prerequisitos

- Go 1.21 o superior
- PostgreSQL 14 o superior
- Git

### 1. Clonar el repositorio

```bash
git clone https://github.com/syberprooficial-stack/Lista_pacientes.git
cd Lista_pacientes
```

### 2. Configurar la base de datos

```bash
# Crear base de datos
createdb pacientes_db

# Ejecutar migraciones en orden
psql -d pacientes_db -f database/schema.sql
psql -d pacientes_db -f database/estados_schema.sql
psql -d pacientes_db -f database/venezuela_data.sql
psql -d pacientes_db -f database/verificar_y_agregar_columnas.sql
```

### 3. Configurar variables de entorno

```bash
# Copiar archivo de ejemplo
cp .env.example .env

# Editar .env con tus credenciales
# DATABASE_URL=postgres://postgres:tu_password@localhost:5432/pacientes_db?sslmode=disable
```

### 4. Ejecutar el backend

```bash
cd backend
go mod download
go run main.go
```

El servidor estará corriendo en `http://localhost:8080`

### 5. Abrir el frontend

Abre `frontend/index.html` en tu navegador o usa un servidor local:

```bash
# Opción 1: Servidor simple con Python
cd frontend
python -m http.server 3000

# Opción 2: Abrir directamente
# Doble click en frontend/index.html
```

Visita `http://localhost:3000`

## 🌐 Deploy en Producción

### Deploy Automático

Este proyecto incluye configuraciones para deploy automático en:
- **Backend + Database**: Render (usando `render.yaml`)
- **Frontend**: Vercel (usando `vercel.json`)

### Instrucciones Detalladas

Consulta los siguientes archivos para instrucciones completas:
- 📄 [DEPLOY_INSTRUCTIONS.md](./DEPLOY_INSTRUCTIONS.md) - Guía paso a paso
- 📋 [VARIABLES_RESUMEN.txt](./VARIABLES_RESUMEN.txt) - Resumen de variables
- 📚 [DEPLOY_VARIABLES.md](./DEPLOY_VARIABLES.md) - Documentación de variables

### Resumen Rápido

#### Render (Backend)
1. Crear PostgreSQL database
2. Ejecutar migraciones SQL
3. Crear Web Service con estas variables:
   ```
   DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require
   PORT=8080
   MAX_DB_CONNECTIONS=10
   MAX_IDLE_CONNECTIONS=3
   RATE_LIMIT_PER_MINUTE=100
   ```

#### Vercel (Frontend)
1. Editar `frontend/config.js` con la URL de tu backend
2. Deploy desde el repositorio GitHub
3. Root directory: `frontend`

## 📡 API Endpoints

### Pacientes
- `GET /api/pacientes` - Lista de pacientes con paginación y filtros
- `POST /api/pacientes/create` - Registrar nuevo paciente
- `POST /api/pacientes/bulk` - Carga masiva desde CSV

### Geografía
- `GET /api/estados` - Lista de estados de Venezuela
- `GET /api/municipios?estado_id=X` - Municipios por estado
- `GET /api/parroquias?municipio_id=X` - Parroquias por municipio

### Sistema
- `GET /health` - Health check del servidor

## 🔧 Configuración

### Variables de Entorno

| Variable | Descripción | Requerido | Default |
|----------|-------------|-----------|---------|
| `DATABASE_URL` | URL de conexión PostgreSQL | ✅ Sí | - |
| `PORT` | Puerto del servidor | ✅ Sí | 8080 |
| `MAX_DB_CONNECTIONS` | Conexiones máximas al pool | ⚠️ Recomendado | 20 |
| `MAX_IDLE_CONNECTIONS` | Conexiones idle en el pool | ⚠️ Recomendado | 5 |
| `RATE_LIMIT_PER_MINUTE` | Límite de requests por IP | ⚠️ Recomendado | 100 |
| `GOOGLE_MAPS_API_KEY` | API key de Google Maps | ❌ Opcional | - |

## 📊 Base de Datos

### Tablas Principales

- **pacientes**: Información de pacientes
- **estados**: Estados de Venezuela
- **municipios**: Municipios por estado
- **parroquias**: Parroquias por municipio

### Índices Optimizados

- Full-text search en nombre y ubicación (GIN)
- Índice único en cédula
- Índices B-tree en fechas y estados de salud
- Índices en claves foráneas geográficas

## 🧪 Testing

```bash
# Backend
cd backend
go test ./...

# Verificar compilación
go build -o pacientes-server
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es de código abierto para fines humanitarios y educativos.

## 👥 Autores

- **Desarrollo**: Sistema de gestión de pacientes para emergencias

## 🆘 Soporte

Para reportar problemas o solicitar features, abre un [Issue](https://github.com/syberprooficial-stack/Lista_pacientes/issues).

## 🎯 Roadmap

- [ ] Autenticación y roles de usuario
- [ ] Exportación de datos a Excel/PDF
- [ ] Estadísticas y dashboards
- [ ] Notificaciones por email/SMS
- [ ] API de integración con otros sistemas
- [ ] Aplicación móvil nativa

---

**⚡ Built with ❤️ for emergency response in Venezuela**
