package main

import (
	"log"
	"net/http"
	"time"

	"pacientes-system/config"
	"pacientes-system/database"
	"pacientes-system/handlers"
	"pacientes-system/middleware"
)

func main() {
	// Cargar configuración desde variables de entorno
	cfg := config.Load()

	// Asignar el token de administrador a los handlers
	handlers.AdminToken = cfg.AdminToken



	// Inicializar conexión a base de datos con pool optimizado
	if err := database.Init(cfg); err != nil {
		log.Fatalf("Error inicializando base de datos: %v", err)
	}
	defer database.Close()



	// Configurar multiplexor HTTP con rutas
	mux := http.NewServeMux()

	// Servir archivos estáticos del frontend
	fs := http.FileServer(http.Dir("../frontend"))
	mux.Handle("/", fs)

	// API endpoints
	mux.HandleFunc("/api/pacientes", handlers.GetPacientes)
	mux.HandleFunc("/api/pacientes/create", handlers.CreatePaciente)
	mux.HandleFunc("/api/pacientes/update", handlers.UpdatePaciente)
	mux.HandleFunc("/api/pacientes/delete", handlers.DeletePaciente)
	mux.HandleFunc("/api/pacientes/bulk", handlers.BulkUpload)
	mux.HandleFunc("/api/pacientes/export", handlers.ExportAllPacientes)
	mux.HandleFunc("/api/pacientes/import", handlers.ImportExcel)
	
	// Endpoints geográficos
	mux.HandleFunc("/api/estados", handlers.GetEstados)
	mux.HandleFunc("/api/municipios", handlers.GetMunicipios)
	mux.HandleFunc("/api/parroquias", handlers.GetParroquias)

	// Estadísticas
	mux.HandleFunc("/api/stats", handlers.GetStats)

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Aplicar middleware (orden importa)
	handler := middleware.Logging(
		middleware.CORS(
			middleware.Gzip(
				middleware.RateLimit(
					middleware.Recovery(mux),
				),
			),
		),
	)

	// Configurar servidor HTTP con timeouts optimizados
	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      handler,
		ReadTimeout:  30 * time.Second,  // Timeout para leer request
		WriteTimeout: 30 * time.Second,  // Timeout para escribir response
		IdleTimeout:  120 * time.Second, // Timeout para conexiones idle
		MaxHeaderBytes: 1 << 20,         // 1 MB max header size
	}



	// Iniciar servidor
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("Error iniciando servidor: %v", err)
	}
}
