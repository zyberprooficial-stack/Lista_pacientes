# Documento de Requisitos

## Introducción

Sistema público de consulta web para visualizar información de pacientes afectados por el terremoto en Venezuela. El sistema está diseñado para ser extremadamente estable, rápido y funcionar eficientemente con conexiones de baja calidad, priorizando disponibilidad y velocidad sobre características complejas. Utiliza Go como backend, PostgreSQL como base de datos, y un frontend ultra ligero con HTML/CSS/JavaScript vanilla.

## Glosario

- **Sistema**: El sistema completo de consulta de pacientes del terremoto
- **API_Backend**: Servidor backend desarrollado en Go que procesa las solicitudes HTTP
- **Base_Datos**: Base de datos PostgreSQL que almacena información de pacientes
- **Frontend**: Interfaz web pública construida con HTML, CSS y JavaScript vanilla
- **Usuario**: Persona que accede al sistema público para consultar información de pacientes
- **Paciente**: Persona afectada por el terremoto cuya información está registrada en el sistema
- **Búsqueda**: Operación de filtrado de pacientes por criterios específicos
- **Paginación**: Técnica de dividir resultados en páginas para limitar datos transferidos
- **Carga_Masiva**: Proceso de importación de múltiples registros de pacientes simultáneamente
- **Índice_Base_Datos**: Estructura de datos que optimiza las consultas en PostgreSQL

## Requisitos

### Requisito 1: Visualización Pública de Información de Pacientes

**User Story:** Como usuario del sistema público, quiero ver información básica de pacientes afectados, para poder localizar personas después del terremoto.

#### Acceptance Criteria

1. THE Sistema SHALL display información pública de pacientes sin requerir autenticación
2. WHEN un Usuario accede a la página principal, THE Frontend SHALL cargar en menos de 2 segundos con conexión de 3G
3. THE Frontend SHALL tener un tamaño total menor a 500KB incluyendo HTML, CSS y JavaScript
4. THE API_Backend SHALL servir respuestas en formato JSON
5. FOR ALL registros de pacientes, THE Sistema SHALL mostrar nombre completo, número de cédula, ubicación actual y estado de salud

### Requisito 2: Búsqueda Eficiente de Pacientes

**User Story:** Como usuario, quiero buscar pacientes por diferentes criterios, para encontrar rápidamente a personas específicas.

#### Acceptance Criteria

1. WHEN un Usuario ingresa un término de búsqueda, THE API_Backend SHALL retornar resultados en menos de 300 milisegundos
2. THE Sistema SHALL permitir búsqueda por nombre completo
3. THE Sistema SHALL permitir búsqueda por número de cédula
4. THE Sistema SHALL permitir búsqueda por ubicación
5. THE Base_Datos SHALL utilizar índices GIN para búsquedas de texto en campos de nombre y ubicación
6. THE Base_Datos SHALL utilizar índice B-tree para búsquedas exactas en campo de cédula
7. WHEN no se encuentran resultados, THE API_Backend SHALL retornar una respuesta vacía con código HTTP 200

### Requisito 3: Paginación de Resultados

**User Story:** Como usuario con conexión lenta, quiero que los resultados se carguen por páginas pequeñas, para que la información aparezca rápidamente.

#### Acceptance Criteria

1. THE API_Backend SHALL implementar paginación con límite máximo de 50 registros por página
2. WHEN un Usuario solicita una página, THE API_Backend SHALL retornar únicamente los registros de esa página
3. THE API_Backend SHALL incluir metadata de paginación en la respuesta (página actual, total de páginas, total de registros)
4. THE Frontend SHALL mostrar controles de navegación entre páginas
5. WHEN un Usuario cambia de página, THE Frontend SHALL cargar solo los datos de la nueva página sin recargar toda la aplicación
6. THE Sistema SHALL utilizar LIMIT y OFFSET en consultas SQL para paginación eficiente

### Requisito 4: Carga Masiva de Datos de Pacientes

**User Story:** Como administrador del sistema, quiero cargar múltiples registros de pacientes simultáneamente, para poblar rápidamente la base de datos durante emergencias.

#### Acceptance Criteria

1. THE API_Backend SHALL proporcionar un endpoint para carga masiva de pacientes
2. WHEN se envía un archivo con datos de pacientes, THE API_Backend SHALL validar el formato antes de procesarlo
3. THE API_Backend SHALL aceptar archivos en formato CSV con codificación UTF-8
4. THE API_Backend SHALL procesar cargas masivas de hasta 10,000 registros
5. WHEN ocurre un error en un registro, THE API_Backend SHALL continuar procesando los registros restantes
6. THE API_Backend SHALL retornar un reporte con número de registros exitosos y fallidos
7. THE Base_Datos SHALL utilizar transacciones por lotes (batch inserts) para optimizar la inserción

### Requisito 5: Optimización para Alto Tráfico Concurrente

**User Story:** Como operador del sistema, quiero que el sistema maneje muchas conexiones simultáneas, para que funcione durante picos de tráfico en emergencias.

#### Acceptance Criteria

1. THE API_Backend SHALL manejar al menos 1,000 solicitudes concurrentes sin degradación de rendimiento
2. THE API_Backend SHALL utilizar connection pooling para la Base_Datos con mínimo 20 conexiones
3. THE API_Backend SHALL configurar timeouts de lectura y escritura HTTP para prevenir conexiones colgadas
4. WHEN el número de conexiones excede la capacidad, THE API_Backend SHALL retornar HTTP 503 Service Unavailable
5. THE Sistema SHALL consumir menos de 512MB de memoria RAM bajo carga normal (100 solicitudes por segundo)
6. THE API_Backend SHALL utilizar las goroutines de Go para manejar solicitudes de forma concurrente

### Requisito 6: Persistencia y Estructura de Base de Datos

**User Story:** Como desarrollador del sistema, quiero una estructura de base de datos optimizada, para garantizar consultas rápidas y almacenamiento eficiente.

#### Acceptance Criteria

1. THE Base_Datos SHALL almacenar la siguiente información por paciente: id (PRIMARY KEY), nombre_completo (TEXT), cedula (VARCHAR(20)), ubicacion_actual (TEXT), estado_salud (VARCHAR(50)), fecha_registro (TIMESTAMP)
2. THE Base_Datos SHALL crear un índice GIN en el campo nombre_completo para búsquedas de texto
3. THE Base_Datos SHALL crear un índice GIN en el campo ubicacion_actual para búsquedas de texto
4. THE Base_Datos SHALL crear un índice B-tree único en el campo cedula
5. THE Base_Datos SHALL crear un índice B-tree en el campo fecha_registro para ordenamiento temporal
6. WHEN se inserta un registro duplicado por cédula, THE Base_Datos SHALL rechazar la inserción
7. THE Base_Datos SHALL utilizar el tipo de dato TIMESTAMP WITH TIME ZONE para fecha_registro

### Requisito 7: Frontend Ultra Ligero

**User Story:** Como usuario con conexión lenta, quiero que la página cargue instantáneamente, para acceder rápidamente a la información.

#### Acceptance Criteria

1. THE Frontend SHALL utilizar únicamente HTML5, CSS3 y JavaScript vanilla sin frameworks externos
2. THE Frontend SHALL implementar lazy loading para cargar resultados de búsqueda solo cuando sea necesario
3. THE Frontend SHALL utilizar compresión GZIP para todos los assets estáticos
4. THE Frontend SHALL implementar caché del navegador con headers HTTP apropiados (Cache-Control)
5. THE Frontend SHALL minimizar el número de solicitudes HTTP a máximo 5 por carga inicial
6. THE Frontend SHALL mostrar indicadores visuales de carga durante operaciones asíncronas
7. THE Frontend SHALL ser totalmente funcional sin JavaScript habilitado para búsqueda básica (progressive enhancement)

### Requisito 8: Manejo de Errores y Resiliencia

**User Story:** Como usuario, quiero que el sistema me informe claramente cuando algo falla, para entender qué está sucediendo.

#### Acceptance Criteria

1. WHEN ocurre un error de conexión a Base_Datos, THE API_Backend SHALL retornar HTTP 503 con mensaje descriptivo
2. WHEN un Usuario envía datos inválidos, THE API_Backend SHALL retornar HTTP 400 con descripción del error de validación
3. WHEN un endpoint no existe, THE API_Backend SHALL retornar HTTP 404
4. IF THE Base_Datos no está disponible, THEN THE API_Backend SHALL reintentar la conexión hasta 3 veces con backoff exponencial
5. THE API_Backend SHALL registrar todos los errores en logs estructurados con nivel, timestamp y contexto
6. THE Frontend SHALL mostrar mensajes de error amigables al usuario sin exponer detalles técnicos internos
7. WHEN el servidor está sobrecargado, THE API_Backend SHALL implementar rate limiting de 100 solicitudes por minuto por dirección IP

### Requisito 9: Configuración y Despliegue

**User Story:** Como operador del sistema, quiero configurar fácilmente el sistema, para desplegarlo rápidamente en diferentes entornos.

#### Acceptance Criteria

1. THE API_Backend SHALL leer configuración desde variables de entorno (DATABASE_URL, PORT, MAX_CONNECTIONS)
2. THE Sistema SHALL proporcionar valores por defecto para todas las configuraciones opcionales
3. THE API_Backend SHALL validar configuración requerida al inicio y fallar explícitamente si falta
4. THE Sistema SHALL incluir un script de inicialización de Base_Datos que crea tablas e índices
5. THE Sistema SHALL compilar en un binario único sin dependencias externas de runtime
6. THE Sistema SHALL incluir documentación de variables de entorno requeridas en un archivo README

### Requisito 10: Validación de Datos de Entrada

**User Story:** Como desarrollador del sistema, quiero validar todos los datos de entrada, para prevenir datos corruptos en la base de datos.

#### Acceptance Criteria

1. WHEN se crea un paciente, THE API_Backend SHALL validar que nombre_completo no esté vacío y tenga máximo 200 caracteres
2. WHEN se crea un paciente, THE API_Backend SHALL validar que cedula tenga formato válido venezolano (letra seguida de 6-8 dígitos)
3. WHEN se crea un paciente, THE API_Backend SHALL validar que ubicacion_actual no exceda 300 caracteres
4. WHEN se crea un paciente, THE API_Backend SHALL validar que estado_salud sea uno de los valores permitidos (Estable, Crítico, Fallecido, Desconocido)
5. WHEN la validación falla, THE API_Backend SHALL retornar HTTP 400 con lista de campos inválidos y razones específicas
6. THE API_Backend SHALL sanitizar entradas para prevenir inyección SQL utilizando queries parametrizadas
7. THE API_Backend SHALL rechazar solicitudes con payloads mayores a 10MB
