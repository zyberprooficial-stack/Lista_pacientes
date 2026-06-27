package models

import (
	"regexp"
	"time"
)

// Paciente representa un paciente en el sistema
type Paciente struct {
	ID              int       `json:"id"`
	NombreCompleto  string    `json:"nombre_completo"`
	Cedula          *string   `json:"cedula"` // Puntero para permitir NULL
	Telefono        *string   `json:"telefono"` // Número de contacto opcional
	Edad            *int      `json:"edad"` // Edad opcional
	UbicacionActual string    `json:"ubicacion_actual"`
	EstadoSalud     string    `json:"estado_salud"`
	Foto            *string   `json:"foto"` // Foto en base64, opcional (sin omitempty para siempre incluirla)
	FechaRegistro   time.Time `json:"fecha_registro"`
	Estado          *string   `json:"estado,omitempty"`
	Municipio       *string   `json:"municipio,omitempty"`
	Parroquia       *string   `json:"parroquia,omitempty"`
}

// PacienteInput representa los datos de entrada para crear un paciente
type PacienteInput struct {
	NombreCompleto  string `json:"nombre_completo"`
	Cedula          string `json:"cedula"`
	Telefono        string `json:"telefono"`
	Edad            int    `json:"edad"`
	UbicacionActual string `json:"ubicacion_actual"`
	EstadoSalud     string `json:"estado_salud"`
	Foto            string `json:"foto"` // Foto en base64
	EstadoID        int    `json:"estado_id"`
	MunicipioID     int    `json:"municipio_id"`
	ParroquiaID     int    `json:"parroquia_id"`
}

// PaginatedResponse representa una respuesta paginada
type PaginatedResponse struct {
	Data       []Paciente       `json:"data"`
	Pagination PaginationMetadata `json:"pagination"`
}

// PaginationMetadata contiene información de paginación
type PaginationMetadata struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// BulkUploadResult representa el resultado de una carga masiva
type BulkUploadResult struct {
	Success int      `json:"success"`
	Failed  int      `json:"failed"`
	Total   int      `json:"total"`
	Errors  []string `json:"errors,omitempty"`
}

// ErrorResponse representa una respuesta de error
type ErrorResponse struct {
	Error   string   `json:"error"`
	Details []string `json:"details,omitempty"`
}

// Estados de salud válidos
var ValidEstadosSalud = map[string]bool{
	"Estable":     true,
	"Critico":     true,
	"Fallecido":   true,
	"Desconocido": true,
}

// Expresión regular para validar cédula venezolana (V o E seguido de 6-9 dígitos)
var cedulaRegex = regexp.MustCompile(`^[VE][0-9]{6,9}$`)

// Validate valida los datos de entrada de un paciente
func (p *PacienteInput) Validate() []string {
	var errors []string

	// Validar nombre completo
	if len(p.NombreCompleto) == 0 {
		errors = append(errors, "nombre_completo no puede estar vacío")
	} else if len(p.NombreCompleto) > 200 {
		errors = append(errors, "nombre_completo no puede exceder 200 caracteres")
	}

	// Validar cédula (opcional, pero si se proporciona debe tener formato válido)
	if len(p.Cedula) > 0 && !cedulaRegex.MatchString(p.Cedula) {
		errors = append(errors, "cedula debe tener formato venezolano (V o E seguido de 6-9 dígitos, ej: V12345678)")
	}

	// Validar teléfono (opcional, pero si se proporciona debe tener al menos 7 caracteres)
	if len(p.Telefono) > 0 {
		if len(p.Telefono) < 7 {
			errors = append(errors, "telefono debe tener al menos 7 caracteres")
		} else if len(p.Telefono) > 20 {
			errors = append(errors, "telefono no puede exceder 20 caracteres")
		}
	}

	// Validar edad (opcional, pero si se proporciona debe ser válida)
	if p.Edad > 0 {
		if p.Edad > 150 {
			errors = append(errors, "edad no puede ser mayor a 150 años")
		}
	}

	// Validar ubicación
	if len(p.UbicacionActual) == 0 {
		errors = append(errors, "ubicacion_actual no puede estar vacío")
	} else if len(p.UbicacionActual) > 300 {
		errors = append(errors, "ubicacion_actual no puede exceder 300 caracteres")
	}

	// Validar estado de salud
	if !ValidEstadosSalud[p.EstadoSalud] {
		errors = append(errors, "estado_salud debe ser: Estable, Critico, Fallecido o Desconocido")
	}

	// Validar campos geográficos (obligatorios)
	if p.EstadoID <= 0 {
		errors = append(errors, "estado_id es requerido y debe ser mayor a 0")
	}
	if p.MunicipioID <= 0 {
		errors = append(errors, "municipio_id es requerido y debe ser mayor a 0")
	}
	if p.ParroquiaID <= 0 {
		errors = append(errors, "parroquia_id es requerido y debe ser mayor a 0")
	}

	return errors
}