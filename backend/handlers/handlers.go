package handlers

import (
	"context"
	"encoding/csv"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"pacientes-system/database"
	"pacientes-system/models"
)

const (
	maxUploadSize     = 10 << 20 // 10 MB (bulk CSV)
	maxCreateBodySize = 5 << 20  // 5 MB (JSON con foto base64)
	maxRecords        = 10000    // Máximo de registros en bulk upload
)

// AdminToken es cargado desde main para autenticación de edición
var AdminToken string

// GetPacientes maneja GET /api/pacientes con paginación y filtros
func GetPacientes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	// Parsear query parameters
	query := r.URL.Query()
	page, _ := strconv.Atoi(query.Get("page"))
	limit, _ := strconv.Atoi(query.Get("limit"))
	nombre := query.Get("nombre")
	cedula := query.Get("cedula")
	ubicacion := query.Get("ubicacion")
	estado := query.Get("estado")
	estadoID, _ := strconv.Atoi(query.Get("estado_id"))
	municipioID, _ := strconv.Atoi(query.Get("municipio_id"))
	parroquiaID, _ := strconv.Atoi(query.Get("parroquia_id"))
	fechaDesde := query.Get("fechaDesde")
	fechaHasta := query.Get("fechaHasta")

	// Valores por defecto
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}

	// Context con timeout
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Obtener pacientes de la base de datos
	response, err := database.GetPacientes(ctx, page, limit, nombre, cedula, ubicacion, estado, estadoID, municipioID, parroquiaID, fechaDesde, fechaHasta)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error obteniendo pacientes")
		return
	}

	respondJSON(w, http.StatusOK, response)
}

// CreatePaciente maneja POST /api/pacientes/create
func CreatePaciente(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxCreateBodySize)

	// Parsear JSON del body
	var input models.PacienteInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "JSON inválido")
		return
	}



	// Validar entrada
	if errors := input.Validate(); len(errors) > 0 {
		respondErrorWithDetails(w, http.StatusBadRequest, "Validación fallida", errors)
		return
	}

	// Context con timeout
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Crear paciente en base de datos
	paciente, err := database.CreatePaciente(ctx, &input)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, paciente)
}

// UpdatePaciente maneja POST /api/pacientes/update?id=X
func UpdatePaciente(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	// Proteger el endpoint con token de administrador
	if r.Header.Get("X-Admin-Token") != AdminToken {
		respondError(w, http.StatusUnauthorized, "Token de administrador no autorizado o ausente")
		return
	}

	id, _ := strconv.Atoi(r.URL.Query().Get("id"))
	if id <= 0 {
		respondError(w, http.StatusBadRequest, "ID de paciente inválido")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxCreateBodySize)

	// Parsear JSON del body
	var input models.PacienteInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	// Validar entrada
	if errors := input.Validate(); len(errors) > 0 {
		respondErrorWithDetails(w, http.StatusBadRequest, "Validación fallida", errors)
		return
	}

	// Context con timeout
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	// Actualizar paciente en base de datos
	paciente, err := database.UpdatePaciente(ctx, id, &input)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, paciente)
}

// DeletePaciente maneja POST /api/pacientes/delete?id=X
func DeletePaciente(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	// Proteger el endpoint con token de administrador
	if r.Header.Get("X-Admin-Token") != AdminToken {
		respondError(w, http.StatusUnauthorized, "Token de administrador no autorizado o ausente")
		return
	}

	id, _ := strconv.Atoi(r.URL.Query().Get("id"))
	if id <= 0 {
		respondError(w, http.StatusBadRequest, "ID de paciente inválido")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	if err := database.DeletePaciente(ctx, id); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "Paciente eliminado correctamente"})
}

// BulkUpload maneja POST /api/pacientes/bulk para carga masiva CSV
func BulkUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	// Limitar tamaño del upload
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// Parsear multipart form
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		respondError(w, http.StatusBadRequest, "Archivo demasiado grande (máx 10MB)")
		return
	}

	// Obtener archivo CSV
	file, _, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "No se encontró el archivo CSV")
		return
	}
	defer file.Close()

	// Leer y parsear CSV
	reader := csv.NewReader(file)
	reader.FieldsPerRecord = 4 // Exactamente 4 campos esperados

	// Leer header
	header, err := reader.Read()
	if err != nil {
		respondError(w, http.StatusBadRequest, "Error leyendo header del CSV")
		return
	}

	// Validar header
	expectedHeader := []string{"nombre_completo", "cedula", "ubicacion_actual", "estado_salud"}
	if !validateHeader(header, expectedHeader) {
		respondError(w, http.StatusBadRequest, "Header del CSV inválido. Se espera: nombre_completo,cedula,ubicacion_actual,estado_salud")
		return
	}

	// Leer todos los registros
	pacientes := []models.PacienteInput{}
	lineNum := 1

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			lineNum++
			continue
		}

		// Validar que no se exceda el límite de registros
		if len(pacientes) >= maxRecords {
			respondError(w, http.StatusBadRequest, "Máximo 10,000 registros permitidos")
			return
		}

		paciente := models.PacienteInput{
			NombreCompleto:  record[0],
			Cedula:          record[1],
			UbicacionActual: record[2],
			EstadoSalud:     record[3],
		}

		pacientes = append(pacientes, paciente)
		lineNum++
	}

	if len(pacientes) == 0 {
		respondError(w, http.StatusBadRequest, "El archivo CSV está vacío")
		return
	}

	// Context con timeout más largo para bulk insert
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	// Insertar en base de datos
	result, err := database.BulkInsertPacientes(ctx, pacientes)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error procesando carga masiva")
		return
	}

	// Limitar errores mostrados a 20 para no saturar la respuesta
	if len(result.Errors) > 20 {
		result.Errors = append(result.Errors[:20], "... (más errores omitidos)")
	}

	respondJSON(w, http.StatusOK, result)
}

// respondJSON envía una respuesta JSON
func respondJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

// respondError envía una respuesta de error
func respondError(w http.ResponseWriter, statusCode int, message string) {
	respondJSON(w, statusCode, models.ErrorResponse{
		Error: message,
	})
}

// respondErrorWithDetails envía una respuesta de error con detalles
func respondErrorWithDetails(w http.ResponseWriter, statusCode int, message string, details []string) {
	respondJSON(w, statusCode, models.ErrorResponse{
		Error:   message,
		Details: details,
	})
}

// validateHeader valida que el header del CSV sea correcto
func validateHeader(actual, expected []string) bool {
	if len(actual) != len(expected) {
		return false
	}
	for i := range actual {
		if actual[i] != expected[i] {
			return false
		}
	}
	return true
}


// GetStats maneja GET /api/stats
func GetStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	stats, err := database.GetStats(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error obteniendo estadísticas")
		return
	}

	respondJSON(w, http.StatusOK, stats)
}

// GetEstados maneja GET /api/estados
func GetEstados(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	// Datos geográficos son estáticos, cachear por 1 hora
	w.Header().Set("Cache-Control", "public, max-age=3600")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	estados, err := database.GetEstados(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error obteniendo estados")
		return
	}

	respondJSON(w, http.StatusOK, estados)
}

// GetMunicipios maneja GET /api/municipios?estado_id=X
func GetMunicipios(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	estadoID, _ := strconv.Atoi(r.URL.Query().Get("estado_id"))
	if estadoID == 0 {
		respondError(w, http.StatusBadRequest, "estado_id es requerido")
		return
	}

	// Datos geográficos son estáticos, cachear por 1 hora
	w.Header().Set("Cache-Control", "public, max-age=3600")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	municipios, err := database.GetMunicipios(ctx, estadoID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error obteniendo municipios")
		return
	}

	respondJSON(w, http.StatusOK, municipios)
}

// GetParroquias maneja GET /api/parroquias?municipio_id=X
func GetParroquias(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	municipioID, _ := strconv.Atoi(r.URL.Query().Get("municipio_id"))
	if municipioID == 0 {
		respondError(w, http.StatusBadRequest, "municipio_id es requerido")
		return
	}

	// Datos geográficos son estáticos, cachear por 1 hora
	w.Header().Set("Cache-Control", "public, max-age=3600")

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	parroquias, err := database.GetParroquias(ctx, municipioID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error obteniendo parroquias")
		return
	}

	respondJSON(w, http.StatusOK, parroquias)
}

// GoogleMapsConfig representa la configuración de Google Maps
type GoogleMapsConfig struct {
	APIKey string `json:"api_key"`
}

// GetGoogleMapsConfig maneja GET /api/config/google-maps
func GetGoogleMapsConfig(w http.ResponseWriter, r *http.Request, apiKey string) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	config := GoogleMapsConfig{
		APIKey: apiKey,
	}

	respondJSON(w, http.StatusOK, config)
}

// ExportAllPacientes maneja GET /api/pacientes/export para obtener todos los pacientes (admin only)
func ExportAllPacientes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	// Proteger el endpoint con token de administrador
	if r.Header.Get("X-Admin-Token") != AdminToken {
		respondError(w, http.StatusUnauthorized, "Token de administrador no autorizado o ausente")
		return
	}

	// Context con timeout largo para exportación completa
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Obtener todos los pacientes sin paginación
	pacientes, err := database.GetAllPacientes(ctx)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error obteniendo pacientes para exportación")
		return
	}

	respondJSON(w, http.StatusOK, pacientes)
}

// ImportExcel maneja POST /api/pacientes/import para importar pacientes desde Excel (admin only)
func ImportExcel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		respondError(w, http.StatusMethodNotAllowed, "Método no permitido")
		return
	}

	// Proteger el endpoint con token de administrador
	if r.Header.Get("X-Admin-Token") != AdminToken {
		respondError(w, http.StatusUnauthorized, "Token de administrador no autorizado o ausente")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// Parsear el body JSON con array de pacientes
	var pacientes []models.PacienteInput
	if err := json.NewDecoder(r.Body).Decode(&pacientes); err != nil {
		respondError(w, http.StatusBadRequest, "JSON inválido")
		return
	}

	if len(pacientes) == 0 {
		respondError(w, http.StatusBadRequest, "El archivo Excel está vacío")
		return
	}

	if len(pacientes) > maxRecords {
		respondError(w, http.StatusBadRequest, "Máximo 10,000 registros permitidos")
		return
	}

	// Context con timeout largo para importación masiva
	ctx, cancel := context.WithTimeout(r.Context(), 120*time.Second)
	defer cancel()

	// Importar con UPSERT inteligente
	result, err := database.ImportPacientesWithUpsert(ctx, pacientes)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Error procesando importación")
		return
	}

	// Limitar errores y warnings mostrados
	if len(result.Errors) > 20 {
		result.Errors = append(result.Errors[:20], "... (más errores omitidos)")
	}
	if len(result.Warnings) > 20 {
		result.Warnings = append(result.Warnings[:20], "... (más advertencias omitidas)")
	}

	respondJSON(w, http.StatusOK, result)
}
