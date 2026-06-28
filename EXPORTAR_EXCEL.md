# Funcionalidad de Exportación a Excel

## Descripción
Se ha agregado una funcionalidad de exportación a Excel (XLSX) que permite descargar todos los pacientes registrados en el sistema con todos sus campos.

## Características

### Seguridad
- **Solo visible para administradores**: El botón de exportar solo aparece cuando se accede con el token de administrador en la URL
- **Protegido en el backend**: El endpoint `/api/pacientes/export` requiere el header `X-Admin-Token` válido
- **Sin paginación**: Devuelve todos los registros de una sola vez

### Campos Exportados
El archivo Excel incluye todas las columnas:
1. ID
2. Nombre Completo
3. Cédula
4. Teléfono
5. Edad
6. Estado
7. Municipio
8. Parroquia
9. Ubicación Actual
10. Estado de Salud
11. Fecha de Registro

### Formato del Archivo
- **Nombre**: `pacientes_localizave_YYYY-MM-DD.xlsx`
- **Formato**: Excel XLSX (compatible con Excel, LibreOffice, Google Sheets)
- **Hoja**: "Pacientes"
- **Ancho de columnas**: Optimizado para mejor visualización

## Uso

### Para Administradores
1. Acceder al sistema con el token de administrador en la URL:
   ```
   https://localizave.com/?token=TU_TOKEN_ADMIN
   ```

2. El botón "Exportar Excel" aparecerá en el header junto a "Buscar Pacientes" y "Registrar Paciente"

3. Hacer clic en el botón "Exportar Excel"

4. El sistema descargará automáticamente el archivo con todos los pacientes

### Tecnologías Utilizadas

#### Backend (Go)
- Nuevo endpoint: `GET /api/pacientes/export`
- Función en handlers: `ExportAllPacientes()`
- Función en database: `GetAllPacientes()`
- Middleware de autenticación con `X-Admin-Token`

#### Frontend (JavaScript)
- Librería: SheetJS (xlsx) v0.20.1
- CDN: `https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js`
- Función: `handleExportExcel()`
- Función de conversión: `exportToExcel()`

## Notas Técnicas

### Backend
```go
// Endpoint protegido con token de administrador
func ExportAllPacientes(w http.ResponseWriter, r *http.Request) {
    if r.Header.Get("X-Admin-Token") != AdminToken {
        respondError(w, http.StatusUnauthorized, "Token de administrador no autorizado o ausente")
        return
    }
    // ... devuelve todos los pacientes
}
```

### Frontend
```javascript
// Llamada al endpoint con autenticación
const response = await fetch(`${API_BASE_URL}/pacientes/export`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': _adminToken
    }
});

// Generación del archivo Excel
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(excelData);
XLSX.writeFile(wb, fileName);
```

## Solución de Problemas

### El botón no aparece
- Verificar que está accediendo con el token correcto en la URL: `?token=TU_TOKEN`
- El token debe coincidir con `ADMIN_TOKEN` en el archivo `.env`

### Error "Token de administrador inválido"
- El token en la URL no coincide con el configurado en el servidor
- Verificar el valor de `ADMIN_TOKEN` en el archivo `.env` del backend

### Error "Librería de Excel no cargada"
- Problema de conectividad al CDN de SheetJS
- Verificar conexión a internet
- Revisar la consola del navegador para errores de carga del script

### El archivo no se descarga
- Verificar que el navegador permite descargas
- Revisar la consola del navegador para errores JavaScript
- Verificar que hay pacientes registrados en el sistema

## Mantenimiento

### Actualizar la librería SheetJS
Si necesita actualizar la versión de SheetJS, editar la línea en `index.html`:
```html
<script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>
```

### Agregar más campos
Para agregar más campos al Excel, editar la función `exportToExcel()` en `app.js`:
```javascript
const excelData = pacientes.map(p => ({
    'ID': p.id,
    'Nombre Completo': p.nombre_completo,
    // ... agregar más campos aquí
    'Nuevo Campo': p.nuevo_campo
}));
```

## Seguridad

⚠️ **Importante**: Esta funcionalidad expone datos sensibles y solo debe estar disponible para administradores autorizados.

- El token de administrador debe ser fuerte y secreto
- No compartir el enlace con token a usuarios no autorizados
- Rotar el token periódicamente
- Monitorear el uso del endpoint de exportación

## Compilación

Después de modificar el backend, recompilar:
```bash
cd backend
go build -o pacientes-system.exe
```

## Pruebas

### Probar el endpoint manualmente
```bash
curl -H "X-Admin-Token: TU_TOKEN" http://localhost:8080/api/pacientes/export
```

### Probar en el navegador
1. Acceder con `?token=TU_TOKEN`
2. Abrir la consola del navegador (F12)
3. Hacer clic en "Exportar Excel"
4. Verificar que no hay errores en la consola
5. Verificar que el archivo se descarga correctamente
