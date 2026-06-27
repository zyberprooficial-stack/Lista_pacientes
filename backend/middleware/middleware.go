package middleware

import (
	"compress/gzip"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Logging middleware — mantiene la cadena de handlers sin emitir logs
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}

// CORS middleware permite cross-origin requests
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Max-Age", "3600")

		// Handle preflight
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// RateLimiter implementa rate limiting por IP
type RateLimiter struct {
	visitors map[string]*visitor
	mu       sync.RWMutex
	rate     int           // requests por ventana
	window   time.Duration // tamaño de ventana
}

type visitor struct {
	requests []time.Time
	mu       sync.Mutex
}

var limiter *RateLimiter

// RateLimit middleware implementa rate limiting simple
func RateLimit(next http.Handler) http.Handler {
	// Inicializar limiter si no existe
	if limiter == nil {
		limiter = &RateLimiter{
			visitors: make(map[string]*visitor),
			rate:     200,          // 200 requests
			window:   time.Minute,  // por minuto
		}

		// Limpiar visitantes viejos cada 5 minutos
		go limiter.cleanupOldVisitors()
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)

		if !limiter.allow(ip) {
			http.Error(w, "Demasiadas solicitudes. Intente de nuevo más tarde.", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// allow verifica si una IP puede hacer una request
func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	v, exists := rl.visitors[ip]
	if !exists {
		v = &visitor{requests: []time.Time{}}
		rl.visitors[ip] = v
	}
	rl.mu.Unlock()

	v.mu.Lock()
	defer v.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rl.window)

	// Filtrar requests antiguas
	validRequests := []time.Time{}
	for _, t := range v.requests {
		if t.After(cutoff) {
			validRequests = append(validRequests, t)
		}
	}
	v.requests = validRequests

	// Verificar límite
	if len(v.requests) >= rl.rate {
		return false
	}

	// Agregar nueva request
	v.requests = append(v.requests, now)
	return true
}

// cleanupOldVisitors elimina visitantes que no han hecho requests recientemente
func (rl *RateLimiter) cleanupOldVisitors() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		rl.mu.Lock()
		for ip, v := range rl.visitors {
			v.mu.Lock()
			if len(v.requests) == 0 || time.Since(v.requests[len(v.requests)-1]) > 10*time.Minute {
				delete(rl.visitors, ip)
			}
			v.mu.Unlock()
		}
		rl.mu.Unlock()
	}
}

// getIP obtiene la IP real del cliente (considerando proxies)
func getIP(r *http.Request) string {
	// Intentar obtener de headers de proxy
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		return forwarded
	}

	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	// Fallback a RemoteAddr
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	return ip
}

// Recovery middleware recupera de panics y registra el error
func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("PANIC: %v", err)
				http.Error(w, "Error interno del servidor", http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}


// GzipResponseWriter wrapper para escribir respuestas comprimidas
type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (w gzipResponseWriter) Write(b []byte) (int, error) {
	return w.Writer.Write(b)
}

// Gzip middleware comprime las respuestas para reducir ancho de banda
func Gzip(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Solo comprimir si el cliente acepta gzip
		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		// Configurar headers de compresión
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Set("Vary", "Accept-Encoding")

		// Crear writer gzip
		gz := gzip.NewWriter(w)
		defer gz.Close()

		// Wrapper del ResponseWriter
		gzw := gzipResponseWriter{Writer: gz, ResponseWriter: w}
		next.ServeHTTP(gzw, r)
	})
}
