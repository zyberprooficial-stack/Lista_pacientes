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
elements.toggleFiltersBtn.addEventListener('click', toggleAdvancedFilters);
elements.searchForm.addEventListener('submit', handleSearch);
elements.clearBtn.addEventListener('click', handleClear);
elements.registerForm.addEventListener('submit', handleRegister);
elements.cancelRegisterBtn.addEventListener('click', () => showSearchSection());
elements.prevBtn.addEventListener('click', () => changePage(currentPage - 1));
elements.nextBtn.addEventListener('click', () => changePage(currentPage + 1));
elements.pageSize.addEventListener('change', handlePageSizeChange);
elements.loadMoreBtn.addEventListener('click', handleLoadMore);
elements.resultsBody.addEventListener('click', handleResultsBodyClick);

// Event Listeners para dropdowns en cascada
elements.regEstadoGeo.addEventListener('change', handleEstadoChange);
elements.regMunicipio.addEventListener('change', handleMunicipioChange);

// Event Listeners para dropdowns en cascada de búsqueda
elements.searchEstadoGeo.addEventListener('change', handleSearchEstadoChange);
elements.searchMunicipio.addEventListener('change', handleSearchMunicipioChange);

// Cargar datos iniciales al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    loadPacientes();
    loadEstados();
    loadEstadosSearch();
});

/**
 * Muestra la sección de búsqueda
 */
function showSearchSection() {
    elements.searchSection.style.display = 'block';
    elements.registerSection.style.display = 'none';
    elements.showSearchBtn.classList.add('active');
    elements.showRegisterBtn.classList.remove('active');
    
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
    elements.showSearchBtn.classList.remove('active');
    elements.showRegisterBtn.classList.add('active');
    
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
    e.preventDefault();
    
    currentFilters = {
        nombre: elements.searchNombre.value.trim(),
        cedula: elements.searchCedula.value.trim(),
        ubicacion: elements.searchUbicacion.value.trim(),
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
    elements.searchNombre.value = '';
    elements.searchCedula.value = '';
    elements.searchUbicacion.value = '';
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
        console.error('Error cargando estados:', error);
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
        console.error('Error cargando municipios:', error);
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
        console.error('Error cargando parroquias:', error);
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
    
    // Obtener foto en base64 si existe
    const fotoBase64Input = document.getElementById('regFotoBase64');
    const fotoBase64 = fotoBase64Input ? fotoBase64Input.value : '';
    
    console.log('📸 DEBUG - Foto en formulario:', fotoBase64 ? `Sí (${Math.round(fotoBase64.length / 1024)}KB)` : 'No hay foto');
    
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
        estado_id: parseInt(elements.regEstadoGeo.value),
        municipio_id: parseInt(elements.regMunicipio.value),
        parroquia_id: parseInt(elements.regParroquia.value)
    };
    
    // Validación básica
    if (!paciente.nombre_completo || !paciente.ubicacion_actual || !paciente.estado_salud) {
        showError('Por favor complete todos los campos requeridos');
        return;
    }
    
    // Validar que se hayan seleccionado estado, municipio y parroquia
    if (!paciente.estado_id || !paciente.municipio_id || !paciente.parroquia_id) {
        showError('Por favor seleccione Estado, Municipio y Parroquia');
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
    
    console.log('📤 DEBUG - Enviando paciente al servidor:', {
        ...paciente,
        foto: paciente.foto ? `[Base64 ${Math.round(paciente.foto.length / 1024)}KB]` : 'Sin foto'
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/pacientes/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paciente)
        });
        
        console.log('📥 DEBUG - Respuesta del servidor:', response.status);
        
        const data = await response.json();
        
        console.log('📥 DEBUG - Datos recibidos:', data);
        
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
        
        // Opcional: volver a búsqueda después de 4 segundos
        setTimeout(() => {
            showSearchSection();
            loadPacientes();
        }, 4000);
        
    } catch (error) {
        console.error('Error registrando paciente:', error);
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

    handlePatientCardClick(e);
}

function handlePatientCardClick(e) {
    const header = e.target.closest('.patient-card-header');
    if (!header) return;
    const card = header.closest('.patient-card');
    if (!card) return;
    const expanded = card.classList.toggle('expanded');
    header.setAttribute('aria-expanded', String(expanded));
    const toggle = header.querySelector('.patient-card-toggle');
    if (toggle) {
        toggle.textContent = expanded ? 'Ocultar ▲' : 'Ver detalles ▼';
    }
}

function isMobileView() {
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
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
        
        renderResults(data, append);
        updatePagination(data.pagination);
        
    } catch (error) {
        console.error('Error cargando pacientes:', error);
        
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
        placeholder.textContent = '👤';
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
    const tdPhoto = document.createElement('td');
    tdPhoto.dataset.label = 'Foto';
    tdPhoto.className = 'cell-photo';
    tdPhoto.appendChild(createPhotoElement(paciente));
    tr.appendChild(tdPhoto);
    tr.insertAdjacentHTML('beforeend', `
        <td data-label="Nombre">${f.nombre}</td>
        <td data-label="Cédula"><strong>${f.cedula}</strong></td>
        <td data-label="Edad">${f.edad}</td>
        <td data-label="Teléfono">${f.telefono}</td>
        <td data-label="Estado">${f.estado}</td>
        <td data-label="Municipio">${f.municipio}</td>
        <td data-label="Parroquia">${f.parroquia}</td>
        <td data-label="Ubicación">${f.ubicacion}</td>
        <td data-label="Estado de Salud"><span class="${f.estadoClass}">${f.estadoSalud}</span></td>
        <td data-label="Fecha" class="cell-fecha">${f.fechaFormateada}</td>
    `);
    return tr;
}

function createMobileCardRow(paciente) {
    const f = formatPacienteFields(paciente);
    const tr = document.createElement('tr');
    tr.className = 'patient-card';
    tr.innerHTML = `
        <td colspan="11" class="patient-card-cell">
            <button type="button" class="patient-card-header" aria-expanded="false">
                <div class="patient-card-photo-section">
                    <div class="patient-card-photo-slot"></div>
                    <div class="patient-card-info">
                        <div class="patient-card-top">
                            <span class="patient-card-name">${f.nombre}</span>
                            <span class="${f.estadoClass}">${f.estadoSalud}</span>
                        </div>
                        <div class="patient-card-summary">
                            <span class="summary-item"><strong>Cédula:</strong> ${f.cedula}</span>
                            <span class="summary-item"><strong>Ubicación:</strong> ${f.ubicacion}</span>
                        </div>
                    </div>
                </div>
                <span class="patient-card-toggle">Ver detalles ▼</span>
            </button>
            <div class="patient-card-details">
                <div class="detail-row"><span>Edad</span><span>${f.edad}</span></div>
                <div class="detail-row"><span>Teléfono</span><span>${f.telefono}</span></div>
                <div class="detail-row"><span>Estado</span><span>${f.estado}</span></div>
                <div class="detail-row"><span>Municipio</span><span>${f.municipio}</span></div>
                <div class="detail-row"><span>Parroquia</span><span>${f.parroquia}</span></div>
                <div class="detail-row"><span>Fecha registro</span><span>${f.fechaFormateada}</span></div>
            </div>
        </td>
    `;
    const photoSlot = tr.querySelector('.patient-card-photo-slot');
    if (photoSlot) {
        photoSlot.replaceWith(createPhotoElement(paciente));
    }
    return tr;
}

function createPatientRow(paciente) {
    return isMobileView() ? createMobileCardRow(paciente) : createDesktopRow(paciente);
}

/**
 * Renderiza los resultados en la tabla
 */
function renderResults(data, append = false) {
    const tbody = elements.resultsBody;
    
    if (!data.data || data.data.length === 0) {
        if (!append) {
            renderNoResults('No se encontraron pacientes con los criterios de búsqueda');
            elements.resultsInfo.style.display = 'none';
        }
        return;
    }
    
    if (!append) {
        tbody.innerHTML = '';
        pacienteFotos.clear();
    }
    
    displayedCount += data.data.length;
    updateResultsInfo(data.pagination, displayedCount, append);
    
    const fragment = document.createDocumentFragment();
    data.data.forEach((paciente) => {
        fragment.appendChild(createPatientRow(paciente));
    });
    tbody.appendChild(fragment);
}

/**
 * Renderiza mensaje cuando no hay resultados
 */
function renderNoResults(message) {
    elements.resultsBody.innerHTML = `
        <tr>
            <td colspan="11" class="no-results">${escapeHtml(message)}</td>
        </tr>
    `;
    elements.pagination.style.display = 'none';
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
    const mobile = isMobileView();

    elements.pagination.classList.toggle('pagination-mobile', mobile);
    elements.loadMoreBtn.style.display = mobile && hasMore ? 'block' : 'none';
    elements.loadMoreBtn.disabled = !hasMore;

    if (mobile && hasMore) {
        const remaining = pagination.total - displayedCount;
        elements.loadMoreBtn.textContent = `↓ Cargar más (${Math.min(currentLimit, remaining)} de ${remaining.toLocaleString('es-VE')} restantes)`;
    }
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
        console.error('Error cargando estados para búsqueda:', error);
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
        console.error('Error cargando municipios:', error);
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
        console.error('Error cargando parroquias:', error);
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
    // Solo permitir números
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
    
    // Validar longitud (6-9 dígitos)
    const numero = e.target.value;
    const tipo = elements.regCedulaTipo.value;
    const msgElement = document.getElementById('cedulaValidationMsg');
    
    if (numero.length < 6 || numero.length > 9) {
        msgElement.style.display = 'block';
        msgElement.style.color = '#f59e0b';
        msgElement.textContent = 'La cédula debe tener entre 6 y 9 dígitos';
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
            
            if (data.data && data.data.length > 0) {
                msgElement.style.color = '#f43f5e';
                msgElement.textContent = '⚠️ Esta cédula ya está registrada';
                e.target.setCustomValidity('Cédula duplicada');
            } else {
                msgElement.style.color = '#10b981';
                msgElement.textContent = '✓ Cédula disponible';
                e.target.setCustomValidity('');
            }
        } catch (error) {
            msgElement.style.display = 'none';
            console.error('Error validando cédula:', error);
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

console.log('✓ Validaciones en tiempo real activadas');


// ===================================================
// FUNCIONALIDAD DE FOTO CON COMPRESIÓN
// ===================================================

const MAX_FOTO_SIZE = 200 * 1024; // 200KB máximo
const MAX_FOTO_WIDTH = 800; // Ancho máximo en píxeles
const MAX_FOTO_HEIGHT = 800; // Alto máximo en píxeles
const FOTO_QUALITY = 0.8; // Calidad de compresión (0-1) - WebP permite mayor calidad con menor tamaño
const USE_WEBP = true; // Usar WebP para mejor compresión (fallback a JPEG si no soportado)

let cameraStream = null;

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
                    const sizeKB = Math.round((base64.length * 3/4) / 1024);
                    const formatName = format === 'image/webp' ? 'WebP' : 'JPEG';
                    console.log(`✓ Foto comprimida en formato ${formatName}: ${sizeKB}KB (calidad: ${Math.round(quality * 100)}%)`);
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
    console.log('📸 DEBUG - Mostrando preview, tamaño:', Math.round(base64.length / 1024), 'KB');
    
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
    
    console.log('📸 DEBUG - Valor guardado en input hidden:', fotoBase64Input.value ? 'Sí' : 'No');
}

/**
 * Remover foto
 */
function removeFoto() {
    console.log('📸 DEBUG - Removiendo foto');
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
 * Abrir cámara
 */
tomarFotoBtn.addEventListener('click', async function() {
    try {
        // Solicitar acceso a la cámara
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user', // 'environment' para cámara trasera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        
        cameraVideo.srcObject = cameraStream;
        cameraModal.classList.add('active');
        
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        showError('No se pudo acceder a la cámara. Verifique los permisos del navegador.');
    }
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
    
    const finalSizeKB = Math.round((base64.length * 3/4) / 1024);
    const formatName = format === 'image/webp' ? 'WebP' : 'JPEG';
    console.log(`✓ Foto capturada y comprimida en ${formatName}: ${finalSizeKB}KB (calidad: ${Math.round(quality * 100)}%)`);
});

/**
 * Cancelar y cerrar cámara
 */
cancelCameraBtn.addEventListener('click', closeCameraModal);

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

console.log('✓ Funcionalidad de foto con compresión WebP/JPEG activada');


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

console.log('✓ Modal de visualización de fotos activado');
