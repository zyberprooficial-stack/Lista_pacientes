package config

import (
	"log"
	"os"
	"strconv"
)

// Config contiene toda la configuración de la aplicación
type Config struct {
	DatabaseURL         string
	Port                string
	MaxDBConnections    int
	MaxIdleConnections  int
	RateLimitPerMinute  int
	GoogleMapsAPIKey    string
	AdminToken          string
}

// Load carga la configuración desde variables de entorno con valores por defecto
func Load() *Config {
	cfg := &Config{
		DatabaseURL:         getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/pacientes_db?sslmode=disable"),
		Port:                getEnv("PORT", "8080"),
		MaxDBConnections:    getEnvAsInt("MAX_DB_CONNECTIONS", 20),
		MaxIdleConnections:  getEnvAsInt("MAX_IDLE_CONNECTIONS", 5),
		RateLimitPerMinute:  getEnvAsInt("RATE_LIMIT_PER_MINUTE", 100),
		GoogleMapsAPIKey:    getEnv("GOOGLE_MAPS_API_KEY", ""),
		AdminToken:          getEnv("ADMIN_TOKEN", "sismo2026_secreto_seguro_9f8c"),
	}

	// Validar configuración crítica
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL es requerida")
	}

	if cfg.MaxDBConnections < 1 {
		log.Fatal("MAX_DB_CONNECTIONS debe ser mayor a 0")
	}

	if cfg.MaxIdleConnections > cfg.MaxDBConnections {
		log.Fatal("MAX_IDLE_CONNECTIONS no puede ser mayor a MAX_DB_CONNECTIONS")
	}
	
	// Advertencia si Google Maps API Key no está configurada
	if cfg.GoogleMapsAPIKey == "" {
		log.Println("⚠️  WARNING: GOOGLE_MAPS_API_KEY no está configurada. El autocompletado de ubicaciones estará deshabilitado.")
	}

	return cfg
}

// getEnv obtiene variable de entorno o retorna valor por defecto
func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// getEnvAsInt obtiene variable de entorno como entero o retorna valor por defecto
func getEnvAsInt(key string, defaultValue int) int {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue
	}

	value, err := strconv.Atoi(valueStr)
	if err != nil {
		log.Printf("Warning: %s no es un número válido, usando valor por defecto %d", key, defaultValue)
		return defaultValue
	}

	return value
}
