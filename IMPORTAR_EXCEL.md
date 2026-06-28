# Funcionalidad de Importación de Excel

## Descripción
Sistema de importación inteligente desde Excel con lógica **UPSERT** que evita duplicados y actualiza registros existentes.

## 🎯 Lógica de Importación (UPSERT Inteligente)

### Estrategia de Identificación de Duplicados

La importación sigue esta lógica en orden de prioridad:

1. **Búsqueda por Cédula** (si existe en el Excel):
   - Si encuentra un registro con esa cédula → **ACTUALIZA** ese registro
   
2. **Búsqueda por Nombre Completo** (si no hay cédula o no se encontró):
   - Si encuentra un registro con ese nombre → **ACTUALIZA** ese registro
   - **Caso especial**: Si el registro existente NO tiene cédula pero el Excel SÍ la trae → agrega la cédula (mejora de datos)

3. **Nuevo Registro** (si no existe):
   - **INSERTA** un nuevo registro

### Diagrama de Flujo

```
┌─────────────────────┐
│  Registro del Excel │
└──────────┬──────────┘
           │
           ▼
    ¿Tiene cédula?
           │
    ┌──────┴──────┐
   SÍ             NO
    │              │
    ▼              ▼
¿Existe en BD?  ¿Existe nombre
    │           en BD?
┌───┴───┐         │
SÍ     NO      ┌──┴──┐
│       │     SÍ    NO
▼       │      │     │
ACTUALIZAR    │     │
       │      ▼     ▼
       └───► INSERTAR
```

## 📋 Formato del Excel

### Columnas Requeridas (Order no importa)

| Columna | Obligatorio | Ejemplo | Notas |
|---------|-------------|---------|-------|
| **Nombre Completo** | ✅ Sí | JUAN PÉREZ GONZÁLEZ | Se convierte automáticamente a mayúsculas |
| **Cédula** | ⚠️ Opcional | V12345678 | Formato: V o E + 6-9 dígitos. Si existe, se usa para buscar duplicados |
| **Teléfono** | ⚪ Opcional | 0414-1234567 | Mínimo 7 caracteres |
| **Edad** | ⚪ Opcional | 35 | Entre 0 y 150 años |
| **Estado** | ⚪ Opcional | Zulia | Nombre del estado |
| **Municipio** | ⚪ Opcional | Maracaibo | Nombre del municipio |
| **Parroquia** | ⚪ Opcional | Bolívar | Nombre de la parroquia |
| **Ubicación Actual** | ✅ Sí | Hospital General del Sur | Hospital o ubicación específica |
| **Estado de Salud** | ✅ Sí | Estable | Estable, Critico, Fallecido, Desconocido |
| **Fecha de Registro** | ⚪ Ignorado | 2026-06-28 | Solo lectura en exportación |

### Ejemplo de Excel para Importar

```
Nombre Completo          | Cédula      | Teléfono      | Edad | Estado | Municipio  | Parroquia | Ubicación Actual           | Estado de Salud
JUAN PÉREZ GONZÁLEZ      | V12345678   | 0414-1234567  | 35   | Zulia  | Maracaibo  | Bolívar   | Hospital General del Sur   | Estable
MARÍA GARCÍA RODRÍGUEZ   | V87654321   | 0424-9876543  | 28   | Zulia  | Maracaibo  | Cacique   | Clínica Santa María        | Critico
CARLOS LÓPEZ MARTÍNEZ    |             |               | 42   | Zulia  | San Francisco |        | Centro Médico Los Andes    | Estable
```

## 🔒 Seguridad

### Permisos
- **Solo administradores**: Requiere token de administrador en la URL
- **Validación backend**: El endpoint verifica `X-Admin-Token`
- **Transacciones**: Todo o nada (si falla, rollback automático)

### Límites
- **Máximo 10,000 registros** por importación
- **Timeout de 120 segundos** para procesamiento
- **Validación de datos** antes de insertar/actualizar

## 📊 Casos de Uso

### Caso 1: Actualizar Ubicación de Pacientes Existentes

**Escenario**: Los pacientes fueron trasladados a otros hospitales

**Excel**:
```
Nombre Completo      | Cédula    | Ubicación Actual
JUAN PÉREZ GONZÁLEZ  | V12345678 | Hospital Universitario
```

**Resultado**: 
- ✅ Busca por cédula V12345678
- 🔄 Actualiza la ubicación a "Hospital Universitario"
- ✅ Mantiene los demás datos (teléfono, edad, etc.)

### Caso 2: Agregar Cédulas a Pacientes Sin Cédula

**Escenario**: Se obtuvo información de cédulas de pacientes registrados sin cédula

**Base de Datos Actual**:
```
ID | Nombre Completo      | Cédula | Ubicación
1  | JUAN PÉREZ GONZÁLEZ  | NULL   | Hospital Central
```

**Excel para Importar**:
```
Nombre Completo      | Cédula    | Ubicación Actual
JUAN PÉREZ GONZÁLEZ  | V12345678 | Hospital Central
```

**Resultado**:
- 🔍 No encuentra por cédula (porque en BD es NULL)
- 🔍 Busca por nombre "JUAN PÉREZ GONZÁLEZ"
- ✅ Lo encuentra
- 🔄 Actualiza agregando la cédula V12345678
- ⚠️ Genera advertencia: "se agregará cédula 'V12345678' al paciente existente 'JUAN PÉREZ GONZÁLEZ'"

### Caso 3: Importar Nuevos Pacientes

**Escenario**: Registros masivos de nuevos afectados

**Excel**:
```
Nombre Completo          | Cédula    | Ubicación Actual
NUEVA PERSONA UNO        | V99999999 | Hospital Regional
NUEVA PERSONA DOS        |           | Clínica Local
```

**Resultado**:
- ➕ Se insertan 2 nuevos registros
- ✅ Success: 2, Inserted: 2

### Caso 4: Mezcla de Operaciones

**Excel con 5 registros**:
1. Paciente existente con misma cédula → **ACTUALIZA**
2. Paciente existente con mismo nombre → **ACTUALIZA**
3. Nuevo paciente → **INSERTA**
4. Cédula duplicada en BD → **ERROR**
5. Datos incompletos → **ERROR**

**Resultado**:
```
✅ Total procesados: 5
✅ Exitosos: 3
🔄 Actualizados: 2
➕ Insertados: 1
❌ Fallidos: 2

❌ Errores:
• línea 4: la cédula V12345678 ya existe en otro registro
• línea 5: nombre_completo no puede estar vacío
```

## 💻 Uso

### Paso 1: Preparar el Excel

1. **Descargar plantilla**: Usar el botón "Exportar Excel" para obtener el formato correcto
2. **Editar datos**: Modificar, agregar o actualizar registros
3. **Validar campos obligatorios**: 
   - Nombre Completo
   - Ubicación Actual
   - Estado de Salud

### Paso 2: Importar

1. **Acceder como admin**: `https://localizave.com/?token=TU_TOKEN`
2. **Clic en "Importar Excel"**
3. **Seleccionar archivo** (.xlsx o .xls)
4. **Esperar procesamiento** (puede tardar según cantidad de registros)
5. **Revisar resultado**:
   - Registros exitosos
   - Registros actualizados
   - Registros nuevos
   - Errores y advertencias

### Paso 3: Verificar Cambios

- Los datos se recargan automáticamente después de 3 segundos
- Revisar las advertencias para confirmar actualizaciones
- Revisar errores si algunos registros fallaron

## 🧪 Ejemplos de Respuesta

### Importación Exitosa Completa

```json
{
  "success": 150,
  "failed": 0,
  "updated": 80,
  "inserted": 70,
  "total": 150,
  "errors": [],
  "warnings": [
    "línea 5: registro actualizado (encontrado por cedula): JUAN PÉREZ",
    "línea 23: se agregará cédula 'V12345678' al paciente existente 'MARÍA GARCÍA'"
  ]
}
```

### Importación con Errores

```json
{
  "success": 145,
  "failed": 5,
  "updated": 75,
  "inserted": 70,
  "total": 150,
  "errors": [
    "línea 10: la cédula V12345678 ya existe en otro registro",
    "línea 45: nombre_completo no puede estar vacío",
    "línea 67: cedula debe tener formato venezolano (V o E seguido de 6-8 dígitos)",
    "línea 89: estado_salud debe ser: Estable, Critico, Fallecido o Desconocido",
    "línea 120: telefono debe tener al menos 7 caracteres"
  ],
  "warnings": [
    "línea 15: registro actualizado (encontrado por nombre): CARLOS LÓPEZ"
  ]
}
```

## ⚙️ Configuración Técnica

### Backend (Go)

**Endpoint**: `POST /api/pacientes/import`

**Headers**:
```
Content-Type: application/json
X-Admin-Token: TU_TOKEN_ADMIN
```

**Body**: Array de pacientes en formato JSON
```json
[
  {
    "nombre_completo": "JUAN PÉREZ",
    "cedula": "V12345678",
    "telefono": "0414-1234567",
    "edad": 35,
    "ubicacion_actual": "Hospital General",
    "estado_salud": "Estable",
    "estado_id": 1,
    "municipio_id": 5,
    "parroquia_id": 20
  }
]
```

**Función Principal**: `ImportPacientesWithUpsert()` en `database/db.go`

**Características**:
- Usa transacciones para atomicidad
- Prepared statements para performance
- Busca duplicados por cédula y nombre
- Actualiza si existe, inserta si no existe
- Retorna estadísticas detalladas

### Frontend (JavaScript)

**Librería**: SheetJS (xlsx) para lectura de Excel

**Función Principal**: `handleImportExcel()` en `app.js`

**Proceso**:
1. Lee archivo Excel con `XLSX.read()`
2. Convierte a JSON con `XLSX.utils.sheet_to_json()`
3. Mapea columnas al formato del API
4. Valida datos mínimos requeridos
5. Envía al backend con `fetch()`
6. Muestra resultado detallado

## 🛡️ Validaciones

### Validaciones en Frontend
- ✅ Archivo es Excel (.xlsx, .xls)
- ✅ Archivo no está vacío
- ✅ Campos obligatorios presentes
- ✅ Token de administrador válido

### Validaciones en Backend
- ✅ Token de administrador correcto
- ✅ Máximo 10,000 registros
- ✅ Formato de cédula válido (si existe)
- ✅ Longitud de teléfono (7-20 caracteres)
- ✅ Edad válida (0-150 años)
- ✅ Estado de salud válido
- ✅ No duplicar cédulas existentes
- ✅ Transacción con rollback en caso de error crítico

## 🔧 Solución de Problemas

### Error: "Token de administrador inválido"
- Verificar que estás accediendo con `?token=TU_TOKEN` en la URL
- El token debe coincidir con `ADMIN_TOKEN` en `.env`

### Error: "El archivo Excel está vacío"
- Verificar que el archivo tenga al menos una fila de datos (además del header)
- Asegurarse de que la primera hoja del Excel tenga datos

### Error: "Hay X filas con datos incompletos"
- Verificar que todas las filas tengan:
  - Nombre Completo
  - Ubicación Actual
  - Estado de Salud

### Advertencia: "la cédula X ya existe en otro registro"
- Hay dos registros diferentes con la misma cédula
- Revisar los datos para identificar duplicados
- Decidir cuál registro mantener

### Registros no se actualizan
- Verificar que el nombre en Excel coincida **exactamente** con el de la BD
- La búsqueda por nombre es case-insensitive pero debe ser exacta
- Considerar incluir la cédula para búsqueda más confiable

## 📈 Mejores Prácticas

### Antes de Importar
1. ✅ **Exportar datos actuales** para tener respaldo
2. ✅ **Probar con pocos registros** primero (5-10)
3. ✅ **Revisar formato** de cédulas y teléfonos
4. ✅ **Validar estados de salud** (Estable, Critico, Fallecido, Desconocido)

### Durante la Importación
1. ✅ **Esperar a que termine** (no refrescar página)
2. ✅ **Revisar resultado completo** antes de continuar
3. ✅ **Leer advertencias** para confirmar actualizaciones

### Después de Importar
1. ✅ **Verificar registros actualizados** en la búsqueda
2. ✅ **Revisar estadísticas** para confirmar cambios
3. ✅ **Guardar archivo Excel** usado como respaldo
4. ✅ **Documentar cambios masivos** realizados

## 🚀 Ventajas de Este Sistema

1. **No crea duplicados**: Busca inteligentemente antes de insertar
2. **Actualiza automáticamente**: Mejora datos existentes
3. **Agrega cédulas faltantes**: Completa información incompleta
4. **Transaccional**: Todo o nada, no deja datos inconsistentes
5. **Reporta detalladamente**: Sabes exactamente qué pasó con cada registro
6. **Rápido**: Prepared statements y transacciones optimizadas
7. **Seguro**: Solo administradores, con validaciones múltiples

## 📚 Comparación: Importar vs Bulk Upload

| Característica | Importar Excel (UPSERT) | Bulk Upload (CSV) |
|----------------|-------------------------|-------------------|
| Formato | Excel (.xlsx, .xls) | CSV (.csv) |
| Actualiza existentes | ✅ Sí | ❌ No |
| Agrega cédulas | ✅ Sí | ❌ No |
| Evita duplicados | ✅ Sí (inteligente) | ⚠️ Falla si existe |
| Campos | 11 campos completos | 4 campos básicos |
| Reporta actualizaciones | ✅ Sí | ❌ No |
| Uso recomendado | Actualizar datos masivos | Carga inicial |

## 🎓 Casos de Uso Recomendados

### ✅ Usar Importar Excel cuando:
- Necesitas actualizar ubicaciones de pacientes
- Tienes nuevas cédulas para agregar
- Quieres actualizar estados de salud
- Tienes una mezcla de nuevos y existentes
- Necesitas completar información faltante

### ✅ Usar Bulk Upload (CSV) cuando:
- Carga inicial masiva de datos nuevos
- Todos los registros son nuevos
- Solo necesitas campos básicos
- No hay riesgo de duplicados

## 📞 Soporte

Para problemas con la importación:
- Revisar esta documentación completa
- Verificar formato del Excel con plantilla exportada
- Probar con pocos registros primero
- Contactar a ZyberPro: 0412-9050109
