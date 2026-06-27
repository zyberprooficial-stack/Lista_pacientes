// Configuración del Frontend
// Detecta automáticamente la URL del API según dónde se abre la app

(function () {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const origin = window.location.origin;

    // Backend y frontend en el mismo origen (go run local :8080, Render, etc.)
    let apiBase = `${origin}/api`;

    // Frontend servido desde XAMPP u otro puerto: backend Go en :8080
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port !== '8080') {
        apiBase = 'http://localhost:8080/api';
    }

    window.ENV = {
        API_BASE_URL: apiBase,
        ENABLE_DEBUG: hostname === 'localhost' || hostname === '127.0.0.1'
    };
})();
