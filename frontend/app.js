/**
 * Sistema de Consulta de Pacientes - Frontend Logic
 * Optimizado para performance y conexiones lentas
 */

// Configuración
const API_BASE_URL = window.ENV?.API_BASE_URL || 'http://localhost:8080/api';
const MOBILE_BREAKPOINT = 768;
const MANY_RECORDS_HINT = 100;

// Estado de la aplicación
let currentPage = 1;
let currentLimit = 20;
let displayedCount = 0;
let lastPagination = null;
let lastPacientesResponse = null;
let currentFilters = {
    nombre: '',
    cedula: '',
    ubicacion: '',
    estado: '',
    estadoID: 0,
    municipioID: 0,
    parroquiaID: 0,
    fechaDesde: '',
    fechaHasta: ''
};

// Modo edición: se activa si hay ?token=... en la URL.
// El token se pasa directamente al backend — el backend lo valida contra ADMIN_TOKEN en el .env / Render.
const _adminToken = new URLSearchParams(window.location.search).get('token') || '';
const editModeEnabled = _adminToken.length > 0;
let editingPatientId = null;

// Caché para optimizar y reducir llamadas al servidor
const cache = {
    estados: null,
    municipios: {},
    parroquias: {}
};

// Fotos en memoria (evita incrustar base64 en atributos HTML)
const pacienteFotos = new Map();

// Elementos DOM (cacheados para performance)
const elements = {
    // Navegación
    showSearchBtn: document.getElementById('showSearchBtn'),
    showRegisterBtn: document.getElementById('showRegisterBtn'),
    exportExcelBtn: document.getElementById('exportExcelBtn'),
    importExcelBtn: document.getElementById('importExcelBtn'),
    importExcelInput: document.getElementById('importExcelInput'),
    searchSection: document.getElementById('searchSection'),
    registerSection: document.getElementById('registerSection'),
    
    // Búsqueda
    searchForm: document.getElementById('searchForm'),
    searchNombre: document.getElementById('searchNombre'),
    searchCedula: document.getElementById('searchCedula'),
    searchUbicacion: document.getElementById('searchUbicacion'),
    searchEstado: document.getElementById('searchEstado'),
    searchEstadoGeo: document.getElementById('searchEstadoGeo'),
    searchMunicipio: document.getElementById('searchMunicipio'),
    searchParroquia: document.getElementById('searchParroquia'),
    searchFechaDesde: document.getElementById('searchFechaDesde'),
    searchFechaHasta: document.getElementById('searchFechaHasta'),
    clearBtn: document.getElementById('clearBtn'),
    
    // Filtros avanzados
    toggleFiltersBtn: document.getElementById('toggleFiltersBtn'),
    advancedFiltersContent: document.getElementById('advancedFiltersContent'),
    filterIcon: document.getElementById('filterIcon'),
    
    // Registro
    registerForm: document.getElementById('registerForm'),
    regNombre: document.getElementById('regNombre'),
    regTelefono: document.getElementById('regTelefono'),
    regEdad: document.getElementById('regEdad'),
    regUbicacion: document.getElementById('regUbicacion'),
    regEstadoGeo: document.getElementById('regEstado'),
    regMunicipio: document.getElementById('regMunicipio'),
    regParroquia: document.getElementById('regParroquia'),
    regEstadoSalud: document.getElementById('regEstadoSalud'),
    cancelRegisterBtn: document.getElementById('cancelRegisterBtn'),
    
    // Resultados
    resultsBody: document.getElementById('resultsBody'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    errorMessage: document.getElementById('errorMessage'),
    successMessage: document.getElementById('successMessage'),
    resultsInfo: document.getElementById('resultsInfo'),
    resultsRange: document.getElementById('resultsRange'),
    resultsHint: document.getElementById('resultsHint'),
    pagination: document.getElementById('pagination'),
    pageInfo: document.getElementById('pageInfo'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    pageSize: document.getElementById('pageSize'),
    loadMoreBtn: document.getElementById('loadMoreBtn')
};

// Event Listeners
elements.showSearchBtn.addEventListener('click', showSearchSection);
elements.showRegisterBtn.addEventListener('click', showRegisterSection);
if (elements.exportExcelBtn) {
    elements.exportExcelBtn.addEventListener('click', handleExportExcel);
}
if (elements.importExcelBtn) {
    elements.importExcelBtn.addEventListener('click', () => elements.importExcelInput.click());
}
if (elements.importExcelInput) {
    elements.importExcelInput.addEventListener('change', handleImportExcel);
}
elements.toggleFiltersBtn.addEventListener('click', toggleAdvancedFilters);
elements.searchForm.addEventListener('submit', handleSearch);
elements.clearBtn.addEventListener('click', handleClear);
elements.registerForm.addEventListener('submit', handleRegister);
elements.cancelRegisterBtn.addEventListener('click', () => {
    cancelEditing();
    showSearchSection();
});
elements.prevBtn.addEventListener('click', () => changePage(currentPage - 1));
elements.nextBtn.addEventListener('click', () => changePage(currentPage + 1));
elements.pageSize.addEventListener('change', handlePageSizeChange);
elements.loadMoreBtn.addEventListener('click', handleLoadMore);
elements.resultsBody.addEventListener('click', handleResultsBodyClick);

// Event listener para cards móviles
const resultsCards = document.getElementById('resultsCards');
if (resultsCards) {
    resultsCards.addEventListener('click', handleResultsBodyClick);
}

// Event Listeners para dropdowns en cascada
elements.regEstadoGeo.addEventListener('change', handleEstadoChange);
elements.regMunicipio.addEventListener('change', handleMunicipioChange);

// Event Listeners para dropdowns en cascada de búsqueda
elements.searchEstadoGeo.addEventListener('change', handleSearchEstadoChange);
elements.searchMunicipio.addEventListener('change', handleSearchMunicipioChange);

// Cargar datos iniciales al cargar la pagina
document.addEventListener('DOMContentLoaded', () => {
    loadPacientes();
    loadEstados();
    loadEstadosSearch();
    loadStats();

    // Placeholders segun tipo de filtro activo
    const placeholders = {
        all:      'Nombre, cedula, hospital o ciudad...',
        nombre:   'Escribe el nombre completo o parcial...',
        cedula:   'Escribe la cedula (ej: V12345678)...',
        hospital: 'Escribe el nombre del hospital o clinica...',
        ciudad:   'Escribe la ciudad o municipio...',
        estado:   'Escribe el estado venezolano (ej: Zulia)...'
    };

    // Clases Tailwind para pill activa e inactiva
    const activeClasses   = 'quick-filter-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 border border-blue-600 text-blue-700 rounded-full text-sm font-semibold cursor-pointer transition-all active';
    const inactiveClasses = 'quick-filter-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-full text-sm font-medium cursor-pointer transition-all';

    function applyPillStyles(activePill) {
        document.querySelectorAll('.quick-filter-pill').forEach(p => {
            const icon = p.querySelector('i[data-lucide="check"]');
            if (p === activePill) {
                p.className = activeClasses;
                if (icon) { icon.style.opacity = '1'; icon.style.transform = 'scale(1)'; }
            } else {
                p.className = inactiveClasses;
                if (icon) { icon.style.opacity = '0'; icon.style.transform = 'scale(0.5)'; }
            }
        });
    }

    // Registrar listeners en las pills de filtro rapido
    document.querySelectorAll('.quick-filter-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            e.preventDefault();

            // Actualizar estilos visuales
            applyPillStyles(pill);

            // Cambiar placeholder segun filtro seleccionado
            const filterType = pill.dataset.filter;
            const queryInput = document.getElementById('unifiedSearchInput');
            if (queryInput) {
                queryInput.placeholder = placeholders[filterType] || placeholders.all;

                // Si ya hay texto, lanzar busqueda con el nuevo filtro
                if (queryInput.value.trim() !== '') {
                    handleSearch();
                } else {
                    queryInput.focus();
                }
            }
        });
    });
});


/**
 * Muestra la sección de búsqueda
 */
function showSearchSection() {
    elements.searchSection.style.display = 'block';
    elements.registerSection.style.display = 'none';
    
    // Actualizar estilos de botones del header con Tailwind
    if (window.updateHeaderButtons) {
        window.updateHeaderButtons('search');
    }
    
    // Asegurar que se muestre la sección de resultados
    document.querySelector('.results-section').style.display = 'block';
    elements.pagination.style.display = lastPagination && lastPagination.total_pages > 1 ? 'flex' : 'none';
    if (elements.resultsInfo && displayedCount > 0) {
        elements.resultsInfo.style.display = 'flex';
    }
    
    // Ocultar mensajes
    hideError();
    hideSuccess();
}

/**
 * Muestra la sección de registro
 */
function showRegisterSection() {
    elements.searchSection.style.display = 'none';
    elements.registerSection.style.display = 'block';
    
    // Actualizar estilos de botones del header con Tailwind
    if (window.updateHeaderButtons) {
        window.updateHeaderButtons('register');
    }
    
    // Ocultar tabla de resultados y mensajes
    document.querySelector('.results-section').style.display = 'none';
    elements.pagination.style.display = 'none';
    elements.resultsInfo.style.display = 'none';
    hideError();
    hideSuccess();
    
    // Cargar estados si no están cargados
    if (elements.regEstadoGeo.options.length === 1) {
        loadEstados();
    }
}

/**
 * Toggle filtros avanzados
 */
function toggleAdvancedFilters() {
    const isVisible = elements.advancedFiltersContent.style.display !== 'none';
    
    if (isVisible) {
        elements.advancedFiltersContent.style.display = 'none';
        elements.toggleFiltersBtn.classList.remove('active');
    } else {
        elements.advancedFiltersContent.style.display = 'block';
        elements.toggleFiltersBtn.classList.add('active');
    }
}

/**
 * Maneja el envío del formulario de búsqueda
 */
function handleSearch(e) {
    if (e) e.preventDefault();
    
    const queryInput = document.getElementById('unifiedSearchInput');
    const query = queryInput ? queryInput.value.trim() : '';
    
    // Obtener filtro rápido activo
    const activePill = document.querySelector('.quick-filter-pill.active');
    const activeFilter = activePill ? activePill.dataset.filter : 'all';
    
    let nombre = '';
    let cedula = '';
    let ubicacion = '';
    
    if (activeFilter === 'all') {
        // Auto-detectar tipo de búsqueda según el patrón ingresado
        if (/^[VEve]?\d+$/.test(query)) {
            cedula = query;
        } else if (/\b(hospital|clinica|cdi|ambulatorio|seguro|ivss|maternidad|sanatorio)\b/i.test(query)) {
            ubicacion = query;
        } else {
            nombre = query;
        }
    } else if (activeFilter === 'nombre') {
        nombre = query;
    } else if (activeFilter === 'cedula') {
        cedula = query;
    } else if (activeFilter === 'hospital' || activeFilter === 'ciudad') {
        ubicacion = query;
    } else if (activeFilter === 'estado') {
        ubicacion = query; // Enviar como ubicación (el backend busca en estado con full-text)
    }
    
    currentFilters = {
        nombre: nombre,
        cedula: cedula,
        ubicacion: ubicacion,
        estado: elements.searchEstado.value,
        estadoID: elements.searchEstadoGeo.value ? parseInt(elements.searchEstadoGeo.value) : 0,
        municipioID: elements.searchMunicipio.value ? parseInt(elements.searchMunicipio.value) : 0,
        parroquiaID: elements.searchParroquia.value ? parseInt(elements.searchParroquia.value) : 0,
        fechaDesde: elements.searchFechaDesde.value,
        fechaHasta: elements.searchFechaHasta.value
    };
    
    currentPage = 1;
    
    // Mostrar sección de resultados
    document.querySelector('.results-section').style.display = 'block';
    
    loadPacientes();
}

/**
 * Limpia los filtros y recarga
 */
function handleClear() {
    const queryInput = document.getElementById('unifiedSearchInput');
    if (queryInput) queryInput.value = '';
    
    // Restaurar filtro rápido por defecto ("Todo")
    document.querySelectorAll('.quick-filter-pill').forEach(p => p.classList.remove('active'));
    const defaultPill = document.querySelector('.quick-filter-pill[data-filter="all"]');
    if (defaultPill) defaultPill.classList.add('active');
    
    elements.searchEstado.value = '';
    elements.searchEstadoGeo.value = '';
    elements.searchMunicipio.value = '';
    elements.searchMunicipio.disabled = true;
    elements.searchMunicipio.innerHTML = '<option value="">Primero seleccione un estado</option>';
    elements.searchParroquia.value = '';
    elements.searchParroquia.disabled = true;
    elements.searchParroquia.innerHTML = '<option value="">Primero seleccione un municipio</option>';
    elements.searchFechaDesde.value = '';
    elements.searchFechaHasta.value = '';
    
    currentFilters = { 
        nombre: '', 
        cedula: '', 
        ubicacion: '',
        estado: '',
        estadoID: 0,
        municipioID: 0,
        parroquiaID: 0,
        fechaDesde: '',
        fechaHasta: ''
    };
    currentPage = 1;
    
    loadPacientes();
}

/**
 * Carga los estados desde la API (con caché)
 */
async function loadEstados() {
    // Usar caché si está disponible
    if (cache.estados) {
        poblarDropdownEstados(cache.estados);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/estados`);
        
        if (!response.ok) {
            throw new Error('Error cargando estados');
        }
        
        const estados = await response.json();
        
        // Guardar en caché
        cache.estados = estados;
        
        poblarDropdownEstados(estados);
        
    } catch (error) {
        showError('Error cargando lista de estados');
    }
}

/**
 * Poblar dropdown de estados
 */
function poblarDropdownEstados(estados) {
    elements.regEstadoGeo.innerHTML = '<option value="">Seleccione un estado...</option>';
    
    estados.forEach(estado => {
        const option = document.createElement('option');
        option.value = estado.id;
        option.textContent = estado.nombre;
        elements.regEstadoGeo.appendChild(option);
    });
}

/**
 * Maneja el cambio de estado para cargar municipios (con caché)
 */
async function handleEstadoChange(e) {
    const estadoId = e.target.value;
    
    // Resetear municipios y parroquias
    elements.regMunicipio.innerHTML = '<option value="">Primero seleccione un estado</option>';
    elements.regMunicipio.disabled = true;
    elements.regParroquia.innerHTML = '<option value="">Primero seleccione un municipio</option>';
    elements.regParroquia.disabled = true;
    
    if (!estadoId) {
        return;
    }
    
    // Usar caché si está disponible
    if (cache.municipios[estadoId]) {
        poblarDropdownMunicipios(cache.municipios[estadoId]);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/municipios?estado_id=${estadoId}`);
        
        if (!response.ok) {
            throw new Error('Error cargando municipios');
        }
        
        const municipios = await response.json();
        
        // Guardar en caché
        cache.municipios[estadoId] = municipios;
        
        poblarDropdownMunicipios(municipios);
        
    } catch (error) {
        showError('Error cargando lista de municipios');
    }
}

/**
 * Poblar dropdown de municipios
 */
function poblarDropdownMunicipios(municipios) {
    elements.regMunicipio.innerHTML = '<option value="">Seleccione un municipio...</option>';
    
    municipios.forEach(municipio => {
        const option = document.createElement('option');
        option.value = municipio.id;
        option.textContent = municipio.nombre;
        elements.regMunicipio.appendChild(option);
    });
    
    elements.regMunicipio.disabled = false;
}

/**
 * Maneja el cambio de municipio para cargar parroquias (con caché)
 */
async function handleMunicipioChange(e) {
    const municipioId = e.target.value;
    
    // Resetear parroquias
    elements.regParroquia.innerHTML = '<option value="">Primero seleccione un municipio</option>';
    elements.regParroquia.disabled = true;
    
    if (!municipioId) {
        return;
    }
    
    // Usar caché si está disponible
    if (cache.parroquias[municipioId]) {
        poblarDropdownParroquias(cache.parroquias[municipioId]);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/parroquias?municipio_id=${municipioId}`);
        
        if (!response.ok) {
            throw new Error('Error cargando parroquias');
        }
        
        const parroquias = await response.json();
        
        // Guardar en caché
        cache.parroquias[municipioId] = parroquias;
        
        poblarDropdownParroquias(parroquias);
        
    } catch (error) {
        showError('Error cargando lista de parroquias');
    }
}

/**
 * Poblar dropdown de parroquias
 */
function poblarDropdownParroquias(parroquias) {
    elements.regParroquia.innerHTML = '<option value="">Seleccione una parroquia...</option>';
    
    parroquias.forEach(parroquia => {
        const option = document.createElement('option');
        option.value = parroquia.id;
        option.textContent = parroquia.nombre;
        elements.regParroquia.appendChild(option);
    });
    
    elements.regParroquia.disabled = false;
}

/**
 * Maneja el registro de un nuevo paciente
 */
async function handleRegister(e) {
    e.preventDefault();
    
    hideError();
    hideSuccess();
    
    if (editingPatientId) {
        return handleUpdate(e);
    }
    
    // Obtener foto en base64 si existe
    const fotoBase64Input = document.getElementById('regFotoBase64');
    const fotoBase64 = fotoBase64Input ? fotoBase64Input.value : '';
    
    // Construir la cédula completa (tipo + número)
    const regCedulaTipo = document.getElementById('regCedulaTipo');
    const regCedulaNumero = document.getElementById('regCedulaNumero');
    const cedulaCompleta = regCedulaNumero && regCedulaNumero.value ? 
        `${regCedulaTipo.value}${regCedulaNumero.value}` : '';
    
    const paciente = {
        nombre_completo: elements.regNombre.value.trim(),
        cedula: cedulaCompleta,
        telefono: elements.regTelefono.value.trim(),
        edad: parseInt(elements.regEdad.value) || 0,
        ubicacion_actual: elements.regUbicacion.value.trim(),
        estado_salud: elements.regEstadoSalud.value,
        foto: fotoBase64,
        estado_id: parseInt(elements.regEstadoGeo.value) || 0,
        municipio_id: parseInt(elements.regMunicipio.value) || 0,
        parroquia_id: parseInt(elements.regParroquia.value) || 0
    };
    
    // Validación básica
    if (!paciente.nombre_completo || !paciente.ubicacion_actual || !paciente.estado_salud) {
        showError('Por favor complete todos los campos requeridos');
        return;
    }
    
    // Validar formato de cédula (solo si se proporciona)
    if (paciente.cedula && paciente.cedula.length > 0) {
        const cedulaRegex = /^[VE][0-9]{6,8}$/;
        if (!cedulaRegex.test(paciente.cedula)) {
            showError('Formato de cédula inválido. Use V o E seguido de 6-8 dígitos (Ej: V12345678)');
            return;
        }
    }
    
    // Validar teléfono (solo si se proporciona)
    if (paciente.telefono && paciente.telefono.length > 0) {
        if (paciente.telefono.length < 7) {
            showError('El teléfono debe tener al menos 7 caracteres');
            return;
        }
        if (paciente.telefono.length > 20) {
            showError('El teléfono no puede exceder 20 caracteres');
            return;
        }
    }
    
    // Validar edad (solo si se proporciona)
    if (paciente.edad > 0 && paciente.edad > 150) {
        showError('La edad no puede ser mayor a 150 años');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/pacientes/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paciente)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // Mostrar detalles de validación si están disponibles
            if (data.details && data.details.length > 0) {
                const errorList = data.details.join('\n• ');
                throw new Error(`Errores de validación:\n• ${errorList}`);
            }
            throw new Error(data.error || 'Error al registrar paciente');
        }
        
        // Éxito - Mensaje mejorado
        showSuccess(`🎉 ¡Registro Exitoso! El paciente ${paciente.nombre_completo} ha sido registrado correctamente en el sistema.`);
        
        // Limpiar formulario
        elements.registerForm.reset();
        
        // Resetear dropdowns
        elements.regMunicipio.innerHTML = '<option value="">Primero seleccione un estado</option>';
        elements.regMunicipio.disabled = true;
        elements.regParroquia.innerHTML = '<option value="">Primero seleccione un municipio</option>';
        elements.regParroquia.disabled = true;
        
        // Actualizar stats con el nuevo registro
        loadStats();
        
        // Opcional: volver a búsqueda después de 4 segundos
        setTimeout(() => {
            showSearchSection();
            loadPacientes();
        }, 4000);
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

/**
 * Cambia de página
 */
function changePage(newPage) {
    currentPage = newPage;
    loadPacientes(false);
    
    document.querySelector('.results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function handlePageSizeChange() {
    currentLimit = parseInt(elements.pageSize.value, 10) || 20;
    currentPage = 1;
    loadPacientes(false);
}

function handleLoadMore() {
    if (!lastPagination || currentPage >= lastPagination.total_pages) return;
    currentPage += 1;
    loadPacientes(true);
}

function handleResultsBodyClick(e) {
    const editBtn = e.target.closest('.btn-edit-patient');
    if (editBtn) {
        e.stopPropagation();
        e.preventDefault();
        const id = parseInt(editBtn.dataset.id, 10);
        startEditing(id);
        return;
    }

    const deleteBtn = e.target.closest('.btn-delete-patient');
    if (deleteBtn) {
        e.stopPropagation();
        e.preventDefault();
        const id = parseInt(deleteBtn.dataset.id, 10);
        handleDeletePatient(id);
        return;
    }

    const photoImg = e.target.closest('.patient-photo-thumb');
    if (photoImg) {
        e.stopPropagation();
        const id = parseInt(photoImg.dataset.pacienteId, 10);
        const data = pacienteFotos.get(id);
        if (data) {
            showPhotoModal(data.foto, data.nombre);
        }
        return;
    }
}

/**
 * Carga pacientes desde la API
 */
async function loadPacientes(append = false) {
    if (!append) {
        displayedCount = 0;
    }

    showLoading(append);
    hideError();
    
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: currentLimit
        });
        
        if (currentFilters.nombre) params.append('nombre', currentFilters.nombre);
        if (currentFilters.cedula) params.append('cedula', currentFilters.cedula);
        if (currentFilters.ubicacion) params.append('ubicacion', currentFilters.ubicacion);
        if (currentFilters.estado) params.append('estado', currentFilters.estado);
        if (currentFilters.estadoID) params.append('estado_id', currentFilters.estadoID);
        if (currentFilters.municipioID) params.append('municipio_id', currentFilters.municipioID);
        if (currentFilters.parroquiaID) params.append('parroquia_id', currentFilters.parroquiaID);
        if (currentFilters.fechaDesde) params.append('fechaDesde', currentFilters.fechaDesde);
        if (currentFilters.fechaHasta) params.append('fechaHasta', currentFilters.fechaHasta);
        
        const url = `${API_BASE_URL}/pacientes?${params.toString()}`;
        
        // Fetch con timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const data = await response.json();
        lastPagination = data.pagination;
        lastPacientesResponse = data;
        
        renderResults(data, append);
        updatePagination(data.pagination);
        
    } catch (error) {
        
        if (error.name === 'AbortError') {
            showError('La solicitud tardó demasiado. Verifique su conexión.');
        } else if (error.message.includes('Failed to fetch')) {
            showError('No se pudo conectar al servidor. Verifique que el servidor esté corriendo.');
        } else {
            showError('Error al cargar los datos. Por favor, intente de nuevo.');
        }
        
        renderNoResults('Error al cargar datos');
    } finally {
        hideLoading(append);
    }
}

function formatPacienteFields(paciente) {
    const fecha = new Date(paciente.fecha_registro);
    const fechaFormateada = fecha.toLocaleDateString('es-VE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    const estadoClass = `estado-${paciente.estado_salud.toLowerCase()}`;
    
    return {
        nombre: escapeHtml(paciente.nombre_completo),
        cedula: paciente.cedula ? escapeHtml(paciente.cedula) : '<em class="na-value">Sin cédula</em>',
        edad: paciente.edad ? escapeHtml(paciente.edad.toString()) + ' años' : '<em class="na-value">N/A</em>',
        telefono: paciente.telefono ? escapeHtml(paciente.telefono) : '<em class="na-value">N/A</em>',
        estado: paciente.estado ? escapeHtml(paciente.estado) : '<em class="na-value">N/A</em>',
        municipio: paciente.municipio ? escapeHtml(paciente.municipio) : '<em class="na-value">N/A</em>',
        parroquia: paciente.parroquia ? escapeHtml(paciente.parroquia) : '<em class="na-value">N/A</em>',
        ubicacion: escapeHtml(paciente.ubicacion_actual),
        estadoSalud: escapeHtml(paciente.estado_salud),
        estadoClass,
        fechaFormateada
    };
}

function createPhotoElement(paciente) {
    if (!paciente.foto) {
        const placeholder = document.createElement('div');
        placeholder.className = 'patient-photo-placeholder';
        placeholder.innerHTML = '<i data-lucide="user" class="placeholder-icon"></i>';
        return placeholder;
    }

    pacienteFotos.set(paciente.id, {
        foto: paciente.foto,
        nombre: paciente.nombre_completo
    });

    const img = document.createElement('img');
    img.src = paciente.foto;
    img.alt = `Foto de ${paciente.nombre_completo}`;
    img.className = 'patient-photo-thumb';
    img.dataset.pacienteId = String(paciente.id);
    return img;
}

function createDesktopRow(paciente) {
    const f = formatPacienteFields(paciente);
    const tr = document.createElement('tr');
    tr.className = 'group';
    
    const tdPhoto = document.createElement('td');
    tdPhoto.dataset.label = 'Foto';
    tdPhoto.appendChild(createPhotoElement(paciente));
    tr.appendChild(tdPhoto);
    
    tr.insertAdjacentHTML('beforeend', `
        <td data-label="Nombre">
            <div class="flex items-center justify-between gap-2">
                <span class="font-semibold text-slate-900">${f.nombre}</span>
                ${editModeEnabled ? `
                <div class="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" class="btn-edit-patient inline-flex items-center justify-center w-7 h-7 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors" data-id="${paciente.id}" title="Editar">
                        <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                    </button>
                    <button type="button" class="btn-delete-patient inline-flex items-center justify-center w-7 h-7 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-colors" data-id="${paciente.id}" title="Eliminar">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                </div>
                ` : ''}
            </div>
        </td>
        <td data-label="Cédula"><strong class="text-slate-900">${f.cedula}</strong></td>
        <td data-label="Edad">${f.edad}</td>
        <td data-label="Teléfono">${f.telefono}</td>
        <td data-label="Estado">${f.estado}</td>
        <td data-label="Municipio">${f.municipio}</td>
        <td data-label="Parroquia">${f.parroquia}</td>
        <td data-label="Ubicación"><span class="text-sm">${f.ubicacion}</span></td>
        <td data-label="Estado de Salud"><span class="${f.estadoClass}">${f.estadoSalud}</span></td>
        <td data-label="Fecha"><span class="text-xs text-slate-500">${f.fechaFormateada}</span></td>
    `);
    return tr;
}

function createMobileCard(paciente) {
    const f = formatPacienteFields(paciente);
    const card = document.createElement('div');
    card.className = 'group relative flex flex-col bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:shadow-xl hover:border-slate-300/80 transition-all duration-300';
    card.dataset.pacienteId = paciente.id;

    const getInitials = (nombre) => {
        if (!nombre) return 'PA';
        const parts = nombre.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return parts[0].substring(0, 2).toUpperCase();
    };
    const initials = getInitials(paciente.nombre_completo);

    let badgeHTML = '';
    const estadoLower = paciente.estado_salud.toLowerCase();
    if (estadoLower === 'estable') {
        badgeHTML = `<span class="inline-flex items-center rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"><span class="w-1.5 h-1.5 rounded-full bg-white/70 mr-1.5"></span>Estable</span>`;
    } else if (estadoLower === 'critico' || estadoLower === 'critico') {
        badgeHTML = `<span class="inline-flex items-center rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"><span class="w-1.5 h-1.5 rounded-full bg-white/70 mr-1.5 animate-pulse"></span>Critico</span>`;
    } else if (estadoLower === 'fallecido') {
        badgeHTML = `<span class="inline-flex items-center rounded-full bg-zinc-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"><span class="w-1.5 h-1.5 rounded-full bg-white/70 mr-1.5"></span>Fallecido</span>`;
    } else {
        badgeHTML = `<span class="inline-flex items-center rounded-full bg-slate-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm"><span class="w-1.5 h-1.5 rounded-full bg-white/70 mr-1.5"></span>Desconocido</span>`;
    }

    let topSectionHTML = '';
    if (paciente.foto) {
        topSectionHTML = `
            <div class="relative w-full" style="height:200px;flex-shrink:0;">
                <img src="${paciente.foto}"
                     alt="Foto de ${f.nombre}"
                     class="w-full h-full patient-photo-thumb"
                     data-paciente-id="${paciente.id}"
                     style="display:block;object-fit:cover;width:100%;height:100%;cursor:pointer;">
                <div class="absolute top-3 left-3">${badgeHTML}</div>
                <div class="absolute bottom-0 left-0 right-0 h-20 pointer-events-none" style="background:linear-gradient(to top,rgba(0,0,0,0.65),transparent);"></div>
                <div class="absolute bottom-3 left-3 right-3">
                    <h3 class="font-bold text-white text-base leading-tight" style="text-shadow:0 1px 3px rgba(0,0,0,0.5);" title="${f.nombre}">${f.nombre}</h3>
                </div>
                ${editModeEnabled ? `<div class="absolute top-3 right-3 flex gap-1.5">
                    <button type="button" class="btn-edit-patient inline-flex items-center justify-center w-8 h-8 bg-white/90 hover:bg-white text-blue-600 rounded-lg shadow" data-id="${paciente.id}" title="Editar"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button type="button" class="btn-delete-patient inline-flex items-center justify-center w-8 h-8 bg-white/90 hover:bg-white text-red-600 rounded-lg shadow" data-id="${paciente.id}" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>` : ''}
            </div>`;
    } else {
        topSectionHTML = `
            <div class="flex items-center gap-3 p-5 pb-0">
                <div class="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-sm" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);">
                    ${initials}
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-slate-900 text-base leading-tight truncate group-hover:text-blue-600 transition-colors" title="${f.nombre}">${f.nombre}</h3>
                    <div class="mt-1">${badgeHTML}</div>
                </div>
                ${editModeEnabled ? `<div class="flex gap-1.5 flex-shrink-0">
                    <button type="button" class="btn-edit-patient inline-flex items-center justify-center w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-100" data-id="${paciente.id}" title="Editar"><i data-lucide="edit-2" class="w-4 h-4"></i></button>
                    <button type="button" class="btn-delete-patient inline-flex items-center justify-center w-8 h-8 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100" data-id="${paciente.id}" title="Eliminar"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>` : ''}
            </div>`;
    }

    card.innerHTML = `
        ${topSectionHTML}
        <div class="p-5 ${paciente.foto ? '' : 'pt-3'} flex flex-col gap-3 flex-1">
            <div class="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 text-xs">
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Cedula</span>
                    <span class="font-semibold text-slate-800 truncate">${f.cedula}</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Edad</span>
                    <span class="font-semibold text-slate-800">${f.edad}</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Telefono</span>
                    <span class="font-semibold text-slate-800 truncate">${f.telefono}</span>
                </div>
            </div>
            <div class="flex items-start gap-2">
                <svg class="w-4 h-4 mt-0.5 flex-shrink-0" style="color:#f43f5e;" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25s-7.5-4.108-7.5-11.25a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <div class="flex flex-col min-w-0">
                    <span class="text-sm font-semibold text-slate-900 leading-tight break-words">${f.ubicacion}</span>
                    <span class="text-[11px] text-slate-500 mt-0.5">Ubicación específica</span>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2 py-2.5 border-t border-slate-100 text-xs">
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Edo.</span>
                    <span class="font-semibold text-slate-800 break-words leading-tight">${f.estado}</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Mun.</span>
                    <span class="font-semibold text-slate-800 break-words leading-tight">${f.municipio}</span>
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Parroq.</span>
                    <span class="font-semibold text-slate-800 break-words leading-tight">${f.parroquia}</span>
                </div>
            </div>
            <div class="flex items-center pt-2 border-t border-slate-100 text-[11px] text-slate-400 mt-auto">
                <span>Act: ${f.fechaFormateada}</span>
            </div>
        </div>
    `;

    if (paciente.foto) {
        pacienteFotos.set(paciente.id, { foto: paciente.foto, nombre: paciente.nombre_completo });
    }
    return card;
}

function renderResults(data, append = false) {
    const tbody = elements.resultsBody;
    const cardsContainer = document.getElementById('resultsCards');
    
    if (!data.data || data.data.length === 0) {
        if (!append) {
            renderNoResults('No se encontraron pacientes con los criterios de búsqueda');
            elements.resultsInfo.style.display = 'none';
        }
        return;
    }
    
    if (!append) {
        tbody.innerHTML = '';
        if (cardsContainer) cardsContainer.innerHTML = '';
        pacienteFotos.clear();
    }
    
    displayedCount += data.data.length;
    updateResultsInfo(data.pagination, displayedCount, append);
    
    // Renderizar para Móvil y Desktop de manera unificada
    if (cardsContainer) {
        const cardsFragment = document.createDocumentFragment();
        data.data.forEach((paciente) => {
            cardsFragment.appendChild(createMobileCard(paciente));
        });
        cardsContainer.appendChild(cardsFragment);
    }
    
    // Re-inicializar iconos de Lucide dinámicos
    if (window.lucide) {
        lucide.createIcons();
    }
}

/**
 * Renderiza mensaje cuando no hay resultados
 */
function renderNoResults(message) {
    elements.resultsBody.innerHTML = `
        <tr>
            <td colspan="11" class="text-center text-slate-400 py-16">
                <div class="flex flex-col items-center gap-3">
                    <i data-lucide="search-x" class="w-12 h-12 text-slate-300"></i>
                    <p class="text-sm font-medium">${escapeHtml(message)}</p>
                </div>
            </td>
        </tr>
    `;
    
    const cardsContainer = document.getElementById('resultsCards');
    if (cardsContainer) {
        cardsContainer.innerHTML = `
            <div class="p-6 text-center text-slate-400">
                <div class="flex flex-col items-center gap-3">
                    <i data-lucide="search-x" class="w-12 h-12 text-slate-300"></i>
                    <p class="text-sm font-medium">${escapeHtml(message)}</p>
                </div>
            </div>
        `;
    }
    
    elements.pagination.style.display = 'none';
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

function updateResultsInfo(pagination, shown, append = false) {
    if (!pagination) return;

    const total = pagination.total;
    let from;
    let to;

    if (append) {
        from = 1;
        to = shown;
    } else {
        from = total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
        to = Math.min(pagination.page * pagination.limit, total);
    }

    elements.resultsRange.textContent = `Mostrando ${from}-${to} de ${total.toLocaleString('es-VE')}`;
    elements.resultsInfo.style.display = 'block';
    elements.resultsHint.style.display = total >= MANY_RECORDS_HINT ? 'block' : 'none';
    
    // Actualizar estadística rápida del total
    const statPatients = document.getElementById('statPatients');
    if (statPatients) {
        statPatients.textContent = total.toLocaleString('es-VE');
    }
}

/**
 * Carga estadísticas reales desde la API
 */
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        if (!response.ok) return;
        const stats = await response.json();
        
        const el = (id, val) => {
            const node = document.getElementById(id);
            if (node) node.textContent = val.toLocaleString('es-VE');
        };
        
        el('statPatients',   stats.total);
        el('statEstable',    stats.estable);
        el('statCritico',    stats.critico);
        el('statFallecido',  stats.fallecido);
        el('statDesconocido', stats.desconocido);
        
    } catch (error) {
        // Silencioso: los stats no son críticos
        console.warn('No se pudieron cargar las estadísticas:', error);
    }
}

/**
 * Actualiza los controles de paginación
 */
function updatePagination(pagination) {
    if (!pagination || pagination.total === 0) {
        elements.pagination.style.display = 'none';
        elements.loadMoreBtn.style.display = 'none';
        return;
    }
    
    elements.pagination.style.display = 'flex';
    elements.pageInfo.textContent = `Página ${pagination.page} de ${pagination.total_pages}`;
    
    elements.prevBtn.disabled = pagination.page <= 1;
    elements.nextBtn.disabled = pagination.page >= pagination.total_pages;

    const hasMore = pagination.page < pagination.total_pages;
    
    // No se usa el botón "Cargar más" ya que tenemos paginación normal
    elements.loadMoreBtn.style.display = 'none';
}

/**
 * Muestra el indicador de carga
 */
function showLoading(append = false) {
    if (append) {
        elements.loadMoreBtn.disabled = true;
        elements.loadMoreBtn.textContent = 'Cargando...';
        return;
    }
    elements.loadingIndicator.style.display = 'block';
}

/**
 * Oculta el indicador de carga
 */
function hideLoading(append = false) {
    if (append) {
        updatePagination(lastPagination);
        return;
    }
    elements.loadingIndicator.style.display = 'none';
}

/**
 * Muestra un mensaje de error
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    
    // Auto-ocultar después de 10 segundos
    setTimeout(() => {
        hideError();
    }, 10000);
}

/**
 * Oculta el mensaje de error
 */
function hideError() {
    elements.errorMessage.style.display = 'none';
}

/**
 * Muestra un mensaje de éxito
 */
function showSuccess(message) {
    elements.successMessage.textContent = message;
    elements.successMessage.style.display = 'flex';
    
    // Scroll suave al mensaje
    elements.successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Auto-ocultar después de 6 segundos
    setTimeout(() => {
        hideSuccess();
    }, 6000);
}

/**
 * Oculta el mensaje de éxito
 */
function hideSuccess() {
    elements.successMessage.style.display = 'none';
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Debounce para optimizar búsquedas en tiempo real (opcional)
 * No usado actualmente pero disponible para agregar búsqueda automática
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Carga los estados desde la API para los filtros de búsqueda (con caché)
 */
async function loadEstadosSearch() {
    // Usar caché si está disponible
    if (cache.estados) {
        poblarDropdownEstadosSearch(cache.estados);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/estados`);
        
        if (!response.ok) {
            throw new Error('Error cargando estados');
        }
        
        const estados = await response.json();
        
        // Guardar en caché
        cache.estados = estados;
        
        poblarDropdownEstadosSearch(estados);
        
    } catch (error) {
        // Error silencioso
    }
}

/**
 * Poblar dropdown de estados para búsqueda
 */
function poblarDropdownEstadosSearch(estados) {
    elements.searchEstadoGeo.innerHTML = '<option value="">Todos los estados</option>';
    
    estados.forEach(estado => {
        const option = document.createElement('option');
        option.value = estado.id;
        option.textContent = estado.nombre;
        elements.searchEstadoGeo.appendChild(option);
    });
}

/**
 * Maneja el cambio de estado en los filtros de búsqueda (con caché)
 */
async function handleSearchEstadoChange(e) {
    const estadoId = e.target.value;
    
    // Resetear municipios y parroquias
    elements.searchMunicipio.innerHTML = '<option value="">Todos los municipios</option>';
    elements.searchMunicipio.disabled = !estadoId;
    elements.searchParroquia.innerHTML = '<option value="">Todas las parroquias</option>';
    elements.searchParroquia.disabled = true;
    
    if (!estadoId) {
        return;
    }
    
    // Usar caché si está disponible
    if (cache.municipios[estadoId]) {
        poblarDropdownMunicipiosSearch(cache.municipios[estadoId]);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/municipios?estado_id=${estadoId}`);
        
        if (!response.ok) {
            throw new Error('Error cargando municipios');
        }
        
        const municipios = await response.json();
        
        // Guardar en caché
        cache.municipios[estadoId] = municipios;
        
        poblarDropdownMunicipiosSearch(municipios);
        
    } catch (error) {
        // Error silencioso
    }
}

/**
 * Poblar dropdown de municipios para búsqueda
 */
function poblarDropdownMunicipiosSearch(municipios) {
    elements.searchMunicipio.innerHTML = '<option value="">Todos los municipios</option>';
    
    municipios.forEach(municipio => {
        const option = document.createElement('option');
        option.value = municipio.id;
        option.textContent = municipio.nombre;
        elements.searchMunicipio.appendChild(option);
    });
    
    elements.searchMunicipio.disabled = false;
}

/**
 * Maneja el cambio de municipio en los filtros de búsqueda (con caché)
 */
async function handleSearchMunicipioChange(e) {
    const municipioId = e.target.value;
    
    // Resetear parroquias
    elements.searchParroquia.innerHTML = '<option value="">Todas las parroquias</option>';
    elements.searchParroquia.disabled = !municipioId;
    
    if (!municipioId) {
        return;
    }
    
    // Usar caché si está disponible
    if (cache.parroquias[municipioId]) {
        poblarDropdownParroquiasSearch(cache.parroquias[municipioId]);
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/parroquias?municipio_id=${municipioId}`);
        
        if (!response.ok) {
            throw new Error('Error cargando parroquias');
        }
        
        const parroquias = await response.json();
        
        // Guardar en caché
        cache.parroquias[municipioId] = parroquias;
        
        poblarDropdownParroquiasSearch(parroquias);
        
    } catch (error) {
        // Error silencioso
    }
}

/**
 * Poblar dropdown de parroquias para búsqueda
 */
function poblarDropdownParroquiasSearch(parroquias) {
    elements.searchParroquia.innerHTML = '<option value="">Todas las parroquias</option>';
    
    parroquias.forEach(parroquia => {
        const option = document.createElement('option');
        option.value = parroquia.id;
        option.textContent = parroquia.nombre;
        elements.searchParroquia.appendChild(option);
    });
    
    elements.searchParroquia.disabled = false;
}

// Exportar funciones para testing (opcional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        loadPacientes,
        escapeHtml,
        debounce
    };
}


// ===================================================
// VALIDACIONES EN TIEMPO REAL
// ===================================================

// Validación de nombre: solo letras y convertir a mayúsculas
elements.regNombre.addEventListener('input', function(e) {
    // Eliminar números y caracteres especiales (excepto letras, espacios y acentos)
    let value = e.target.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '');
    
    // Convertir a mayúsculas
    value = value.toUpperCase();
    
    // Limitar a 50 caracteres
    if (value.length > 50) {
        value = value.substring(0, 50);
    }
    
    e.target.value = value;
});

// Validación de cédula: solo números y validación de duplicación
let cedulaTimeout;
elements.regCedulaNumero = document.getElementById('regCedulaNumero');
elements.regCedulaTipo = document.getElementById('regCedulaTipo');

function validateCedulaNumber(e) {
    // Solo permitir números en el campo de número (no en el select de tipo)
    if (e.target === elements.regCedulaNumero) {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    }
    
    // Validar longitud (6-9 dígitos)
    const numero = elements.regCedulaNumero.value;
    const tipo = elements.regCedulaTipo.value;
    const msgElement = document.getElementById('cedulaValidationMsg');
    
    if (numero.length < 6 || numero.length > 9) {
        msgElement.style.display = 'block';
        msgElement.style.color = '#f59e0b';
        msgElement.textContent = 'La cédula debe tener entre 6 y 9 dígitos';
        elements.regCedulaNumero.setCustomValidity('Cédula inválida');
        return;
    }
    
    // Validar duplicación en tiempo real (con debounce)
    clearTimeout(cedulaTimeout);
    cedulaTimeout = setTimeout(async () => {
        const cedulaCompleta = tipo + numero;
        
        try {
            msgElement.style.display = 'block';
            msgElement.style.color = '#94a3b8';
            msgElement.textContent = '🔍 Verificando cédula...';
            
            const response = await fetch(`${API_BASE_URL}/pacientes?cedula=${encodeURIComponent(cedulaCompleta)}&limit=1`);
            const data = await response.json();
            
            if (data.data && data.data.length > 0 && data.data[0].id !== editingPatientId) {
                msgElement.style.color = '#f43f5e';
                msgElement.textContent = '⚠️ Esta cédula ya está registrada';
                elements.regCedulaNumero.setCustomValidity('Cédula duplicada');
            } else {
                msgElement.style.color = '#10b981';
                msgElement.textContent = '✓ Cédula disponible';
                elements.regCedulaNumero.setCustomValidity('');
            }
        } catch (error) {
            msgElement.style.display = 'none';
        }
    }, 500); // Espera 500ms después de que el usuario deja de escribir
}

elements.regCedulaNumero.addEventListener('input', validateCedulaNumber);
elements.regCedulaTipo.addEventListener('change', validateCedulaNumber);

// Validación de teléfono: solo números y guiones
elements.regTelefono.addEventListener('input', function(e) {
    // Solo permitir números y guiones
    let value = e.target.value.replace(/[^0-9\-]/g, '');
    
    // Limitar a 15 caracteres
    if (value.length > 15) {
        value = value.substring(0, 15);
    }
    
    e.target.value = value;
});

// Validación de edad: límite 0-120
elements.regEdad.addEventListener('input', function(e) {
    const value = parseInt(e.target.value);
    
    if (value < 0) {
        e.target.value = 0;
    } else if (value > 120) {
        e.target.value = 120;
    }
});


// ===================================================
// FUNCIONALIDAD DE FOTO CON COMPRESIÓN
// ===================================================

const MAX_FOTO_SIZE = 200 * 1024; // 200KB máximo
const MAX_FOTO_WIDTH = 800; // Ancho máximo en píxeles
const MAX_FOTO_HEIGHT = 800; // Alto máximo en píxeles
const FOTO_QUALITY = 0.8; // Calidad de compresión (0-1) - WebP permite mayor calidad con menor tamaño
const USE_WEBP = true; // Usar WebP para mejor compresión (fallback a JPEG si no soportado)

let cameraStream = null;
let currentFacingMode = 'user'; // 'user' para frontal, 'environment' para trasera

// Elementos de foto
const fotoInput = document.getElementById('regFoto');
const fotoPreview = document.getElementById('fotoPreview');
const fotoPreviewImg = document.getElementById('fotoPreviewImg');
const fotoRemoveBtn = document.getElementById('fotoRemoveBtn');
const fotoBase64Input = document.getElementById('regFotoBase64');
const tomarFotoBtn = document.getElementById('tomarFotoBtn');
const fotoUploadContainer = document.getElementById('fotoUploadContainer');
const fotoInfo = document.getElementById('fotoInfo');
const fotoSize = document.getElementById('fotoSize');

// Modal de cámara
const cameraModal = document.getElementById('cameraModal');
const cameraVideo = document.getElementById('cameraVideo');
const cameraCanvas = document.getElementById('cameraCanvas');
const captureFotoBtn = document.getElementById('captureFotoBtn');
const cancelCameraBtn = document.getElementById('cancelCameraBtn');
const switchCameraBtn = document.getElementById('switchCameraBtn');

/**
 * Comprimir imagen a base64 usando WebP (o JPEG como fallback)
 */
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = new Image();
            
            img.onload = function() {
                // Calcular nuevas dimensiones manteniendo aspect ratio
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > MAX_FOTO_WIDTH) {
                        height = height * (MAX_FOTO_WIDTH / width);
                        width = MAX_FOTO_WIDTH;
                    }
                } else {
                    if (height > MAX_FOTO_HEIGHT) {
                        width = width * (MAX_FOTO_HEIGHT / height);
                        height = MAX_FOTO_HEIGHT;
                    }
                }
                
                // Crear canvas y dibujar imagen redimensionada
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Detectar soporte de WebP
                const format = USE_WEBP && canvas.toDataURL('image/webp').startsWith('data:image/webp') 
                    ? 'image/webp' 
                    : 'image/jpeg';
                
                // Comprimir y convertir a base64
                let quality = FOTO_QUALITY;
                let base64 = canvas.toDataURL(format, quality);
                
                // Si aún es muy grande, reducir calidad iterativamente
                while (base64.length > MAX_FOTO_SIZE && quality > 0.1) {
                    quality -= 0.05; // Pasos más pequeños para WebP
                    base64 = canvas.toDataURL(format, quality);
                }
                
                if (base64.length > MAX_FOTO_SIZE) {
                    reject(new Error('No se pudo comprimir la imagen lo suficiente. Por favor use una imagen más pequeña.'));
                } else {
                    resolve(base64);
                }
            };
            
            img.onerror = function() {
                reject(new Error('Error al cargar la imagen'));
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = function() {
            reject(new Error('Error al leer el archivo'));
        };
        
        reader.readAsDataURL(file);
    });
}

/**
 * Mostrar vista previa de foto
 */
function showFotoPreview(base64) {
    // Mostrar imagen
    fotoPreviewImg.src = base64;
    fotoPreview.style.display = 'block';
    fotoBase64Input.value = base64;
    
    // Mostrar información de tamaño
    const sizeKB = Math.round((base64.length * 3/4) / 1024);
    fotoSize.textContent = `${sizeKB} KB`;
    fotoInfo.style.display = 'block';
    
    // Añadir animación de éxito
    fotoPreview.style.animation = 'none';
    setTimeout(() => {
        fotoPreview.style.animation = 'zoomIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }, 10);
}

/**
 * Remover foto
 */
function removeFoto() {
    fotoPreviewImg.src = '';
    fotoPreview.style.display = 'none';
    fotoBase64Input.value = '';
    fotoInput.value = '';
    fotoInfo.style.display = 'none';
    fotoSize.textContent = '0 KB';
}

/**
 * Manejar selección de archivo
 */
fotoInput.addEventListener('change', async function(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        showError('Por favor seleccione un archivo de imagen válido');
        return;
    }
    
    // Validar tamaño antes de comprimir (máx 10MB original)
    if (file.size > 10 * 1024 * 1024) {
        showError('La imagen es demasiado grande. Por favor seleccione una imagen menor a 10MB');
        return;
    }
    
    try {
        // Mostrar estado de carga
        fotoUploadContainer.classList.add('loading');
        showLoading();
        
        const base64 = await compressImage(file);
        
        hideLoading();
        fotoUploadContainer.classList.remove('loading');
        
        showFotoPreview(base64);
        
    } catch (error) {
        hideLoading();
        fotoUploadContainer.classList.remove('loading');
        showError(error.message);
        removeFoto();
    }
});

/**
 * Remover foto al hacer clic en botón X
 */
fotoRemoveBtn.addEventListener('click', removeFoto);

/**
 * Iniciar cámara con modo especificado
 */
async function startCamera(facingMode) {
    try {
        // Detener stream anterior si existe
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
        }
        
        // Solicitar acceso a la cámara
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        cameraVideo.srcObject = cameraStream;
        currentFacingMode = facingMode;
        
        // Actualizar indicador visual del botón
        if (facingMode === 'user') {
            switchCameraBtn.className = 'btn-switch-camera frontal';
            switchCameraBtn.title = 'Cambiar a cámara trasera';
        } else {
            switchCameraBtn.className = 'btn-switch-camera trasera';
            switchCameraBtn.title = 'Cambiar a cámara frontal';
        }
        
    } catch (error) {
        showError('No se pudo acceder a la cámara. Verifique los permisos del navegador.');
    }
}

/**
 * Abrir cámara
 */
tomarFotoBtn.addEventListener('click', async function() {
    await startCamera('user');
    cameraModal.classList.add('active');
});

/**
 * Capturar foto de la cámara
 */
captureFotoBtn.addEventListener('click', function() {
    // Configurar canvas con las dimensiones del video
    cameraCanvas.width = cameraVideo.videoWidth;
    cameraCanvas.height = cameraVideo.videoHeight;
    
    // Dibujar frame actual del video en el canvas
    const ctx = cameraCanvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0);
    
    // Detectar soporte de WebP
    const format = USE_WEBP && cameraCanvas.toDataURL('image/webp').startsWith('data:image/webp') 
        ? 'image/webp' 
        : 'image/jpeg';
    
    // Convertir a base64 y comprimir
    let base64 = cameraCanvas.toDataURL(format, FOTO_QUALITY);
    
    // Si es muy grande, comprimir más
    let quality = FOTO_QUALITY;
    while (base64.length > MAX_FOTO_SIZE && quality > 0.1) {
        quality -= 0.05;
        base64 = cameraCanvas.toDataURL(format, quality);
    }
    
    // Cerrar cámara
    closeCameraModal();
    
    // Mostrar vista previa
    showFotoPreview(base64);
});

/**
 * Cancelar y cerrar cámara
 */
cancelCameraBtn.addEventListener('click', closeCameraModal);

/**
 * Cambiar entre cámara frontal y trasera
 */
switchCameraBtn.addEventListener('click', async function() {
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    // Animación de rotación del botón
    this.style.transform = 'scale(0.8) rotate(360deg)';
    
    setTimeout(async () => {
        await startCamera(newFacingMode);
        this.style.transform = '';
    }, 200);
});

/**
 * Cerrar modal de cámara
 */
function closeCameraModal() {
    cameraModal.classList.remove('active');
    
    // Detener stream de cámara
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// Cerrar modal al hacer clic fuera del contenido
cameraModal.addEventListener('click', function(e) {
    if (e.target === cameraModal) {
        closeCameraModal();
    }
});




// ===================================================
// MODAL DE VISUALIZACIÓN DE FOTO
// ===================================================

/**
 * Mostrar foto en modal
 */
function showPhotoModal(photoSrc, patientName) {
    const modal = document.getElementById('photoViewModal');
    const img = document.getElementById('photoModalImage');
    const title = document.getElementById('photoModalTitle');
    
    if (!photoSrc) {
        showError('Esta persona no tiene foto registrada');
        return;
    }
    
    img.src = photoSrc;
    title.textContent = `Foto de ${patientName}`;
    modal.classList.add('active');
    
    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
}

/**
 * Cerrar modal de foto
 */
function closePhotoModal() {
    const modal = document.getElementById('photoViewModal');
    modal.classList.remove('active');
    
    // Restaurar scroll del body
    document.body.style.overflow = '';
}

// Cerrar modal al hacer clic fuera de la imagen
document.getElementById('photoViewModal').addEventListener('click', function(e) {
    if (e.target.id === 'photoViewModal') {
        closePhotoModal();
    }
});

// Cerrar modal con tecla ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('photoViewModal');
        if (modal.classList.contains('active')) {
            closePhotoModal();
        }
    }
});

// ===================================================
// FUNCIONES DE EDICIÓN (SOLO ACCESIBLE CON PARAMETRO ?admin=1 o ?edit=1)
// ===================================================

async function startEditing(id) {
    if (!lastPacientesResponse || !lastPacientesResponse.data) return;
    const paciente = lastPacientesResponse.data.find(p => p.id === id);
    if (!paciente) return;
    
    editingPatientId = id;
    
    // Cambiar texto de títulos y botones para modo edición
    const formTitle = document.querySelector('#registerSection .form-title');
    const formSubtitle = document.querySelector('#registerSection .form-subtitle');
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    
    if (formTitle) {
        formTitle.innerHTML = '✏️ Editar Datos de Paciente';
    }
    if (formSubtitle) {
        formSubtitle.textContent = 'Modifique los campos necesarios para actualizar la información del paciente';
    }
    if (submitBtn) {
        submitBtn.innerHTML = '✏️ Guardar Cambios';
    }
    
    // Cambiar estilos del botón de cancelar para que diga "Cancelar Edición"
    const cancelBtn = document.getElementById('cancelRegisterBtn');
    if (cancelBtn) {
        cancelBtn.innerHTML = '✖ Cancelar Edición';
    }
    
    // Mostrar sección del formulario
    showRegisterSection();
    
    // Llenar campos
    elements.regNombre.value = paciente.nombre_completo;
    
    // Cédula
    if (paciente.cedula) {
        const tipo = paciente.cedula.charAt(0);
        const numero = paciente.cedula.substring(1);
        if (elements.regCedulaTipo) elements.regCedulaTipo.value = tipo;
        if (elements.regCedulaNumero) elements.regCedulaNumero.value = numero;
    } else {
        if (elements.regCedulaNumero) elements.regCedulaNumero.value = '';
    }
    
    elements.regTelefono.value = paciente.telefono || '';
    elements.regEdad.value = paciente.edad || '';
    elements.regUbicacion.value = paciente.ubicacion_actual;
    elements.regEstadoSalud.value = paciente.estado_salud;
    
    // Foto
    removeFoto();
    if (paciente.foto) {
        showFotoPreview(paciente.foto);
        const base64Input = document.getElementById('regFotoBase64');
        if (base64Input) base64Input.value = '';
    }
    
    // Poblar dropdowns de geografía en cascada
    if (paciente.estado_id) {
        elements.regEstadoGeo.value = paciente.estado_id;
        await loadMunicipiosForEditing(paciente.estado_id, paciente.municipio_id, paciente.parroquia_id);
    }
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

function cancelEditing() {
    editingPatientId = null;
    
    // Restaurar títulos y botones a su estado original
    const formTitle = document.querySelector('#registerSection .form-title');
    const formSubtitle = document.querySelector('#registerSection .form-subtitle');
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    
    if (formTitle) {
        formTitle.innerHTML = 'Registro Público de Paciente';
    }
    if (formSubtitle) {
        formSubtitle.textContent = 'Complete la información del paciente afectado';
    }
    if (submitBtn) {
        submitBtn.innerHTML = 'Registrar Paciente';
    }
    
    const cancelBtn = document.getElementById('cancelRegisterBtn');
    if (cancelBtn) {
        cancelBtn.innerHTML = '✖ Cancelar';
    }
    
    // Limpiar formulario
    elements.registerForm.reset();
    removeFoto();
    
    // Resetear dropdowns
    elements.regMunicipio.innerHTML = '<option value="">Primero seleccione un estado</option>';
    elements.regMunicipio.disabled = true;
    elements.regParroquia.innerHTML = '<option value="">Primero seleccione un municipio</option>';
    elements.regParroquia.disabled = true;
    
    const msgElement = document.getElementById('cedulaValidationMsg');
    if (msgElement) msgElement.style.display = 'none';
    if (elements.regCedulaNumero) elements.regCedulaNumero.setCustomValidity('');
    
    if (window.lucide) {
        lucide.createIcons();
    }
}

async function handleUpdate(e) {
    e.preventDefault();
    
    hideError();
    hideSuccess();
    
    const fotoBase64Input = document.getElementById('regFotoBase64');
    let fotoBase64 = fotoBase64Input ? fotoBase64Input.value : '';
    
    if (fotoBase64 === '') {
        const previewVisible = elements.fotoPreview && elements.fotoPreview.style.display !== 'none';
        if (previewVisible) {
            fotoBase64 = 'KEEP';
        } else {
            fotoBase64 = 'REMOVE';
        }
    }

    const regCedulaTipo = document.getElementById('regCedulaTipo');
    const regCedulaNumero = document.getElementById('regCedulaNumero');
    const cedulaCompleta = regCedulaNumero && regCedulaNumero.value ? 
        `${regCedulaTipo.value}${regCedulaNumero.value}` : '';
    
    const paciente = {
        nombre_completo: elements.regNombre.value.trim(),
        cedula: cedulaCompleta,
        telefono: elements.regTelefono.value.trim(),
        edad: parseInt(elements.regEdad.value) || 0,
        ubicacion_actual: elements.regUbicacion.value.trim(),
        estado_salud: elements.regEstadoSalud.value,
        foto: fotoBase64,
        estado_id: parseInt(elements.regEstadoGeo.value) || 0,
        municipio_id: parseInt(elements.regMunicipio.value) || 0,
        parroquia_id: parseInt(elements.regParroquia.value) || 0
    };
    
    if (!paciente.nombre_completo || !paciente.ubicacion_actual || !paciente.estado_salud) {
        showError('Por favor complete todos los campos requeridos');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/pacientes/update?id=${editingPatientId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': _adminToken
            },
            body: JSON.stringify(paciente)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (data.details && data.details.length > 0) {
                const errorList = data.details.join('\n• ');
                throw new Error(`Errores de validación:\n• ${errorList}`);
            }
            throw new Error(data.error || 'Error al actualizar paciente');
        }
        
        showSuccess(`🎉 ¡Actualización Exitosa! Los datos de ${paciente.nombre_completo} se han modificado correctamente.`);
        
        cancelEditing();
        loadStats();
        
        setTimeout(() => {
            showSearchSection();
            loadPacientes();
        }, 2000);
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function loadMunicipiosForEditing(estadoId, selectedMunicipioId = null, selectedParroquiaId = null) {
    elements.regMunicipio.innerHTML = '<option value="">Cargando municipios...</option>';
    elements.regMunicipio.disabled = true;
    
    let municipios;
    if (cache.municipios[estadoId]) {
        municipios = cache.municipios[estadoId];
    } else {
        try {
            const response = await fetch(`${API_BASE_URL}/municipios?estado_id=${estadoId}`);
            if (!response.ok) throw new Error();
            municipios = await response.json();
            cache.municipios[estadoId] = municipios;
        } catch (e) {
            elements.regMunicipio.innerHTML = '<option value="">Error al cargar municipios</option>';
            return;
        }
    }
    
    poblarDropdownMunicipios(municipios);
    if (selectedMunicipioId) {
        elements.regMunicipio.value = selectedMunicipioId;
        await loadParroquiasForEditing(selectedMunicipioId, selectedParroquiaId);
    }
}

async function loadParroquiasForEditing(municipioId, selectedParroquiaId = null) {
    elements.regParroquia.innerHTML = '<option value="">Cargando parroquias...</option>';
    elements.regParroquia.disabled = true;
    
    let parroquias;
    if (cache.parroquias[municipioId]) {
        parroquias = cache.parroquias[municipioId];
    } else {
        try {
            const response = await fetch(`${API_BASE_URL}/parroquias?municipio_id=${municipioId}`);
            if (!response.ok) throw new Error();
            parroquias = await response.json();
            cache.parroquias[municipioId] = parroquias;
        } catch (e) {
            elements.regParroquia.innerHTML = '<option value="">Error al cargar parroquias</option>';
            return;
        }
    }
    
    poblarDropdownParroquias(parroquias);
    if (selectedParroquiaId) {
        elements.regParroquia.value = selectedParroquiaId;
    }
}

async function handleDeletePatient(id) {
    if (!lastPacientesResponse || !lastPacientesResponse.data) return;
    const paciente = lastPacientesResponse.data.find(p => p.id === id);
    if (!paciente) return;

    const confirmacion = confirm(`¿Está seguro de que desea eliminar permanentemente al paciente "${paciente.nombre_completo}"? Esta acción no se puede deshacer.`);
    if (!confirmacion) return;

    showLoading();

    try {
        const response = await fetch(`${API_BASE_URL}/pacientes/delete?id=${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': _adminToken
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Error al eliminar paciente');
        }

        showSuccess(`🎉 ¡Eliminado! El paciente ${paciente.nombre_completo} ha sido removido del sistema.`);
        loadStats();
        
        setTimeout(() => {
            loadPacientes();
        }, 1500);

    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}




/**
 * Maneja la exportación de todos los pacientes a Excel
 */
async function handleExportExcel() {
    if (!_adminToken) {
        showError('No tiene permisos para exportar datos');
        return;
    }
    
    // Cambiar el texto del botón para mostrar que está procesando
    const originalText = elements.exportExcelBtn.innerHTML;
    elements.exportExcelBtn.innerHTML = '<i data-lucide="loader"></i><span>Exportando...</span>';
    elements.exportExcelBtn.disabled = true;
    
    showLoading();
    
    try {
        const response = await fetch(`${API_BASE_URL}/pacientes/export`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': _adminToken
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Token de administrador inválido o ausente');
            }
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        const pacientes = await response.json();
        
        if (!pacientes || pacientes.length === 0) {
            showError('No hay datos para exportar');
            return;
        }
        
        // Crear el archivo Excel con SheetJS
        exportToExcel(pacientes);
        
        showSuccess(`✅ Se exportaron ${pacientes.length} pacientes exitosamente`);
        
    } catch (error) {
        showError(`Error al exportar: ${error.message}`);
    } finally {
        hideLoading();
        elements.exportExcelBtn.innerHTML = originalText;
        elements.exportExcelBtn.disabled = false;
        // Re-inicializar iconos de Lucide
        if (window.lucide) {
            lucide.createIcons();
        }
    }
}

/**
 * Exporta los datos a Excel usando SheetJS
 */
function exportToExcel(pacientes) {
    if (typeof XLSX === 'undefined') {
        showError('Librería de Excel no cargada. Recargue la página.');
        return;
    }
    
    // Preparar los datos para Excel
    const excelData = pacientes.map(p => ({
        'ID': p.id,
        'Nombre Completo': p.nombre_completo,
        'Cédula': p.cedula || '',
        'Teléfono': p.telefono || '',
        'Edad': p.edad || '',
        'Estado': p.estado || '',
        'Municipio': p.municipio || '',
        'Parroquia': p.parroquia || '',
        'Ubicación Actual': p.ubicacion_actual,
        'Estado de Salud': p.estado_salud,
        'Fecha de Registro': formatDateForExcel(p.fecha_registro)
    }));
    
    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Configurar ancho de columnas
    const columnWidths = [
        { wch: 8 },  // ID
        { wch: 30 }, // Nombre Completo
        { wch: 12 }, // Cédula
        { wch: 15 }, // Teléfono
        { wch: 8 },  // Edad
        { wch: 20 }, // Estado
        { wch: 25 }, // Municipio
        { wch: 25 }, // Parroquia
        { wch: 40 }, // Ubicación Actual
        { wch: 15 }, // Estado de Salud
        { wch: 20 }  // Fecha de Registro
    ];
    ws['!cols'] = columnWidths;
    
    // Agregar el worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Pacientes');
    
    // Generar nombre del archivo con fecha actual
    const fecha = new Date();
    const fechaStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    const fileName = `pacientes_localizave_${fechaStr}.xlsx`;
    
    // Descargar el archivo
    XLSX.writeFile(wb, fileName);
}

/**
 * Formatea fecha para Excel
 */
function formatDateForExcel(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Mostrar botón de exportar si el usuario es admin
document.addEventListener('DOMContentLoaded', () => {
    if (editModeEnabled && elements.exportExcelBtn) {
        elements.exportExcelBtn.style.display = 'inline-flex';
    }
    if (editModeEnabled && elements.importExcelBtn) {
        elements.importExcelBtn.style.display = 'inline-flex';
    }
});


/**
 * Maneja la importación de Excel
 */
async function handleImportExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!_adminToken) {
        showError('No tiene permisos para importar datos');
        elements.importExcelInput.value = '';
        return;
    }
    
    // Validar que sea un archivo Excel
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        showError('Por favor seleccione un archivo Excel válido (.xlsx o .xls)');
        elements.importExcelInput.value = '';
        return;
    }
    
    showLoading();
    
    try {
        // Leer el archivo Excel
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Obtener la primera hoja
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
            showError('El archivo Excel está vacío');
            elements.importExcelInput.value = '';
            return;
        }
        
        // Mapear los datos del Excel al formato esperado por el API
        const pacientes = jsonData.map(row => {
            // Buscar estado_id, municipio_id, parroquia_id si existen en caché
            let estadoID = 0;
            let municipioID = 0;
            let parroquiaID = 0;
            
            // Si hay nombres geográficos, intentar buscar los IDs
            if (row['Estado'] && cache.estados) {
                const estado = cache.estados.find(e => e.nombre.toLowerCase() === row['Estado'].toLowerCase());
                if (estado) estadoID = estado.id;
            }
            
            return {
                nombre_completo: String(row['Nombre Completo'] || '').trim().toUpperCase(),
                cedula: String(row['Cédula'] || row['Cedula'] || '').trim().toUpperCase(),
                telefono: String(row['Teléfono'] || row['Telefono'] || '').trim(),
                edad: parseInt(row['Edad']) || 0,
                ubicacion_actual: String(row['Ubicación Actual'] || row['Ubicacion Actual'] || '').trim(),
                estado_salud: String(row['Estado de Salud'] || row['Estado Salud'] || '').trim(),
                estado_id: estadoID,
                municipio_id: municipioID,
                parroquia_id: parroquiaID
            };
        });
        
        // Validar que al menos tengan nombre y ubicación
        const invalidRows = pacientes.filter(p => !p.nombre_completo || !p.ubicacion_actual || !p.estado_salud);
        if (invalidRows.length > 0) {
            showError(`Hay ${invalidRows.length} filas con datos incompletos (requieren: Nombre Completo, Ubicación Actual, Estado de Salud)`);
            elements.importExcelInput.value = '';
            return;
        }
        
        // Enviar al backend
        const response = await fetch(`${API_BASE_URL}/pacientes/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Admin-Token': _adminToken
            },
            body: JSON.stringify(pacientes)
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Token de administrador inválido');
            }
            const errorData = await response.json();
            throw new Error(errorData.error || `Error del servidor: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Mostrar resultados detallados
        let mensaje = `📊 Importación completada:\n\n`;
        mensaje += `✅ Total procesados: ${result.total}\n`;
        mensaje += `✅ Exitosos: ${result.success}\n`;
        
        if (result.inserted > 0) {
            mensaje += `➕ Nuevos registros: ${result.inserted}\n`;
        }
        
        if (result.updated > 0) {
            mensaje += `🔄 Registros actualizados: ${result.updated}\n`;
        }
        
        if (result.failed > 0) {
            mensaje += `❌ Fallidos: ${result.failed}\n`;
        }
        
        // Mostrar warnings si hay
        if (result.warnings && result.warnings.length > 0) {
            mensaje += `\n⚠️ Advertencias:\n`;
            result.warnings.slice(0, 5).forEach(w => mensaje += `• ${w}\n`);
            if (result.warnings.length > 5) {
                mensaje += `... y ${result.warnings.length - 5} más\n`;
            }
        }
        
        // Mostrar errores si hay
        if (result.errors && result.errors.length > 0) {
            mensaje += `\n❌ Errores:\n`;
            result.errors.slice(0, 5).forEach(e => mensaje += `• ${e}\n`);
            if (result.errors.length > 5) {
                mensaje += `... y ${result.errors.length - 5} más\n`;
            }
        }
        
        if (result.success > 0) {
            showSuccess(mensaje);
            // Recargar datos después de 3 segundos
            setTimeout(() => {
                loadPacientes();
                loadStats();
            }, 3000);
        } else {
            showError(mensaje);
        }
        
    } catch (error) {
        showError(`Error procesando archivo: ${error.message}`);
    } finally {
        hideLoading();
        // Limpiar el input para permitir reimportar el mismo archivo
        elements.importExcelInput.value = '';
    }
}
