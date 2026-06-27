package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"strings"
	"time"

	_ "github.com/lib/pq"
	"pacientes-system/config"
	"pacientes-system/models"
)

var db *sql.DB

// Init inicializa la conexión a la base de datos con connection pooling
func Init(cfg *config.Config) error {
	var err error
	db, err = sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		return fmt.Errorf("error abriendo conexión: %w", err)
	}

	// Configurar connection pool para alta concurrencia
	db.SetMaxOpenConns(cfg.MaxDBConnections)    // Máximo de conexiones abiertas
	db.SetMaxIdleConns(cfg.MaxIdleConnections)  // Conexiones idle para reutilizar
	db.SetConnMaxLifetime(time.Hour)            // Vida máxima de una conexión

	// Verificar conexión con timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("error conectando a la base de datos: %w", err)
	}

	return nil
}

// Close cierra la conexión a la base de datos
func Close() error {
	if db != nil {
		return db.Close()
	}
	return nil
}

// GetPacientes obtiene pacientes con paginación y filtros avanzados
func GetPacientes(ctx context.Context, page, limit int, nombre, cedula, ubicacion, estado string, estadoID, municipioID, parroquiaID int, fechaDesde, fechaHasta string) (*models.PaginatedResponse, error) {
	// Validar límites de paginación
	if limit > 50 {
		limit = 50
	}
	if limit < 1 {
		limit = 20
	}
	if page < 1 {
		page = 1
	}

	offset := (page - 1) * limit

	// Construir query dinámicamente basado en filtros
	whereClauses := []string{}
	args := []interface{}{}
	argPos := 1

	// Filtro por nombre (búsqueda full-text)
	if nombre != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("to_tsvector('spanish', nombre_completo) @@ plainto_tsquery('spanish', $%d)", argPos))
		args = append(args, nombre)
		argPos++
	}

	// Filtro por cédula (búsqueda exacta)
	if cedula != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("cedula = $%d", argPos))
		args = append(args, cedula)
		argPos++
	}

	// Filtro por ubicación (búsqueda full-text)
	if ubicacion != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("to_tsvector('spanish', ubicacion_actual) @@ plainto_tsquery('spanish', $%d)", argPos))
		args = append(args, ubicacion)
		argPos++
	}

	// Filtro por estado de salud
	if estado != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("estado_salud = $%d", argPos))
		args = append(args, estado)
		argPos++
	}

	// Filtro por estado geográfico
	if estadoID > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("p.id_estado = $%d", argPos))
		args = append(args, estadoID)
		argPos++
	}

	// Filtro por municipio
	if municipioID > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("p.id_municipio = $%d", argPos))
		args = append(args, municipioID)
		argPos++
	}

	// Filtro por parroquia
	if parroquiaID > 0 {
		whereClauses = append(whereClauses, fmt.Sprintf("p.id_parroquia = $%d", argPos))
		args = append(args, parroquiaID)
		argPos++
	}

	// Filtro por rango de fechas - desde
	if fechaDesde != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("fecha_registro >= $%d", argPos))
		args = append(args, fechaDesde+"T00:00:00Z")
		argPos++
	}

	// Filtro por rango de fechas - hasta
	if fechaHasta != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("fecha_registro <= $%d", argPos))
		args = append(args, fechaHasta+"T23:59:59Z")
		argPos++
	}

	whereSQL := ""
	if len(whereClauses) > 0 {
		whereSQL = "WHERE " + strings.Join(whereClauses, " AND ")
	}

	// Contar total de registros (para paginación)
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM pacientes %s", whereSQL)
	err := db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("error contando registros: %w", err)
	}

	// Query principal con paginación y JOINs para geografía
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT 
			p.id, 
			p.nombre_completo, 
			p.cedula, 
			p.telefono,
			p.edad,
			p.ubicacion_actual, 
			p.estado_salud,
			p.foto,
			p.fecha_registro,
			e.estado as estado_nombre,
			m.municipio as municipio_nombre,
			pa.parroquia as parroquia_nombre
		FROM pacientes p
		LEFT JOIN estados e ON p.id_estado = e.id_estado
		LEFT JOIN municipios m ON p.id_municipio = m.id_municipio
		LEFT JOIN parroquias pa ON p.id_parroquia = pa.id_parroquia
		%s
		ORDER BY p.fecha_registro DESC
		LIMIT $%d OFFSET $%d
	`, whereSQL, argPos, argPos+1)

	rows, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("error ejecutando query: %w", err)
	}
	defer rows.Close()

	pacientes := []models.Paciente{}
	for rows.Next() {
		var p models.Paciente
		err := rows.Scan(
			&p.ID, 
			&p.NombreCompleto, 
			&p.Cedula, 
			&p.Telefono,
			&p.Edad,
			&p.UbicacionActual, 
			&p.EstadoSalud,
			&p.Foto,
			&p.FechaRegistro,
			&p.Estado,
			&p.Municipio,
			&p.Parroquia,
		)
		if err != nil {
			return nil, fmt.Errorf("error escaneando fila: %w", err)
		}
		// DEBUG: Log para verificar si foto existe
		if p.Foto != nil {
			log.Printf("✅ Paciente %d tiene foto (tamaño: %d bytes)", p.ID, len(*p.Foto))
		} else {
			log.Printf("❌ Paciente %d NO tiene foto", p.ID)
		}
		pacientes = append(pacientes, p)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterando filas: %w", err)
	}

	// Calcular total de páginas
	totalPages := total / limit
	if total%limit != 0 {
		totalPages++
	}

	response := &models.PaginatedResponse{
		Data: pacientes,
		Pagination: models.PaginationMetadata{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}

	return response, nil
}

// CreatePaciente crea un nuevo paciente
func CreatePaciente(ctx context.Context, input *models.PacienteInput) (*models.Paciente, error) {
	query := `
		WITH inserted AS (
			INSERT INTO pacientes (nombre_completo, cedula, telefono, edad, ubicacion_actual, estado_salud, foto, id_estado, id_municipio, id_parroquia)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			RETURNING id, nombre_completo, cedula, telefono, edad, ubicacion_actual, estado_salud, foto, fecha_registro, id_estado, id_municipio, id_parroquia
		)
		SELECT 
			i.id, 
			i.nombre_completo, 
			i.cedula, 
			i.telefono,
			i.edad,
			i.ubicacion_actual, 
			i.estado_salud,
			i.foto,
			i.fecha_registro,
			e.estado as estado_nombre,
			m.municipio as municipio_nombre,
			pa.parroquia as parroquia_nombre
		FROM inserted i
		LEFT JOIN estados e ON i.id_estado = e.id_estado
		LEFT JOIN municipios m ON i.id_municipio = m.id_municipio
		LEFT JOIN parroquias pa ON i.id_parroquia = pa.id_parroquia
	`

	var p models.Paciente
	
	// Convertir cédula vacía a NULL para la base de datos
	var cedulaValue interface{}
	if input.Cedula == "" {
		cedulaValue = nil
	} else {
		cedulaValue = input.Cedula
	}
	
	// Convertir teléfono vacío a NULL para la base de datos
	var telefonoValue interface{}
	if input.Telefono == "" {
		telefonoValue = nil
	} else {
		telefonoValue = input.Telefono
	}
	
	// Convertir edad 0 a NULL para la base de datos
	var edadValue interface{}
	if input.Edad == 0 {
		edadValue = nil
	} else {
		edadValue = input.Edad
	}
	
	// Convertir foto vacía a NULL para la base de datos
	var fotoValue interface{}
	if input.Foto == "" {
		log.Printf("⚠️ DEBUG CreatePaciente: Foto vacía para paciente %s", input.NombreCompleto)
		fotoValue = nil
	} else {
		fotoSize := len(input.Foto)
		log.Printf("✅ DEBUG CreatePaciente: Guardando foto para %s (tamaño: %d bytes)", input.NombreCompleto, fotoSize)
		fotoValue = input.Foto
	}
	
	err := db.QueryRowContext(
		ctx,
		query,
		input.NombreCompleto,
		cedulaValue,
		telefonoValue,
		edadValue,
		input.UbicacionActual,
		input.EstadoSalud,
		fotoValue,
		input.EstadoID,
		input.MunicipioID,
		input.ParroquiaID,
	).Scan(
		&p.ID, 
		&p.NombreCompleto, 
		&p.Cedula, 
		&p.Telefono, 
		&p.Edad, 
		&p.UbicacionActual, 
		&p.EstadoSalud,
		&p.Foto,
		&p.FechaRegistro,
		&p.Estado,
		&p.Municipio,
		&p.Parroquia,
	)

	if err != nil {
		// Manejo especial para cédula duplicada
		if strings.Contains(err.Error(), "duplicate key") {
			return nil, fmt.Errorf("la cédula %s ya existe en el sistema", input.Cedula)
		}
		return nil, fmt.Errorf("error creando paciente: %w", err)
	}

	return &p, nil
}

// BulkInsertPacientes inserta múltiples pacientes en batch (transacción)
func BulkInsertPacientes(ctx context.Context, pacientes []models.PacienteInput) (*models.BulkUploadResult, error) {
	result := &models.BulkUploadResult{
		Total:  len(pacientes),
		Errors: []string{},
	}

	// Iniciar transacción
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("error iniciando transacción: %w", err)
	}
	defer tx.Rollback() // Rollback si no se hace commit

	// Preparar statement para mejor performance
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO pacientes (nombre_completo, cedula, telefono, edad, ubicacion_actual, estado_salud)
		VALUES ($1, $2, $3, $4, $5, $6)
	`)
	if err != nil {
		return nil, fmt.Errorf("error preparando statement: %w", err)
	}
	defer stmt.Close()

	// Insertar cada paciente
	for i, p := range pacientes {
		lineNum := i + 2 // +2 porque línea 1 es header y el array empieza en 0

		// Validar antes de insertar
		if validationErrors := p.Validate(); len(validationErrors) > 0 {
			result.Failed++
			result.Errors = append(result.Errors, fmt.Sprintf("línea %d: %s", lineNum, strings.Join(validationErrors, ", ")))
			continue
		}

		// Convertir cédula vacía a NULL para la base de datos
		var cedulaValue interface{}
		if p.Cedula == "" {
			cedulaValue = nil
		} else {
			cedulaValue = p.Cedula
		}
		
		// Convertir teléfono vacío a NULL para la base de datos
		var telefonoValue interface{}
		if p.Telefono == "" {
			telefonoValue = nil
		} else {
			telefonoValue = p.Telefono
		}
		
		// Convertir edad 0 a NULL para la base de datos
		var edadValue interface{}
		if p.Edad == 0 {
			edadValue = nil
		} else {
			edadValue = p.Edad
		}

		_, err := stmt.ExecContext(ctx, p.NombreCompleto, cedulaValue, telefonoValue, edadValue, p.UbicacionActual, p.EstadoSalud)
		if err != nil {
			result.Failed++
			if strings.Contains(err.Error(), "duplicate key") {
				result.Errors = append(result.Errors, fmt.Sprintf("línea %d: cédula %s ya existe", lineNum, p.Cedula))
			} else {
				result.Errors = append(result.Errors, fmt.Sprintf("línea %d: error insertando: %v", lineNum, err))
			}
			continue
		}

		result.Success++
	}

	// Commit transacción solo si hubo al menos un éxito
	if result.Success > 0 {
		if err := tx.Commit(); err != nil {
			return nil, fmt.Errorf("error confirmando transacción: %w", err)
		}
	}

	return result, nil
}


// Estado representa un estado de Venezuela
type Estado struct {
	ID     int    `json:"id"`
	Nombre string `json:"nombre"`
}

// Municipio representa un municipio
type Municipio struct {
	ID       int    `json:"id"`
	EstadoID int    `json:"estado_id"`
	Nombre   string `json:"nombre"`
}

// Parroquia representa una parroquia
type Parroquia struct {
	ID          int    `json:"id"`
	MunicipioID int    `json:"municipio_id"`
	Nombre      string `json:"nombre"`
}

// GetEstados obtiene todos los estados
func GetEstados(ctx context.Context) ([]Estado, error) {
	query := "SELECT id_estado, estado FROM estados ORDER BY estado"
	rows, err := db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	estados := []Estado{}
	for rows.Next() {
		var e Estado
		if err := rows.Scan(&e.ID, &e.Nombre); err != nil {
			return nil, err
		}
		estados = append(estados, e)
	}
	return estados, rows.Err()
}

// GetMunicipios obtiene municipios por estado
func GetMunicipios(ctx context.Context, estadoID int) ([]Municipio, error) {
	query := "SELECT id_municipio, id_estado, municipio FROM municipios WHERE id_estado = $1 ORDER BY municipio"
	rows, err := db.QueryContext(ctx, query, estadoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	municipios := []Municipio{}
	for rows.Next() {
		var m Municipio
		if err := rows.Scan(&m.ID, &m.EstadoID, &m.Nombre); err != nil {
			return nil, err
		}
		municipios = append(municipios, m)
	}
	return municipios, rows.Err()
}

// GetParroquias obtiene parroquias por municipio
func GetParroquias(ctx context.Context, municipioID int) ([]Parroquia, error) {
	query := "SELECT id_parroquia, id_municipio, parroquia FROM parroquias WHERE id_municipio = $1 ORDER BY parroquia"
	rows, err := db.QueryContext(ctx, query, municipioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	parroquias := []Parroquia{}
	for rows.Next() {
		var p Parroquia
		if err := rows.Scan(&p.ID, &p.MunicipioID, &p.Nombre); err != nil {
			return nil, err
		}
		parroquias = append(parroquias, p)
	}
	return parroquias, rows.Err()
}
