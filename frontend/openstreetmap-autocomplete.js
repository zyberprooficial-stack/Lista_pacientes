/**
 * OpenStreetMap Nominatim Autocomplete
 * Alternativa GRATUITA a Google Maps - Sin API Key necesaria
 * Busca hospitales, clínicas y lugares en Venezuela
 */

let autocompleteTimeout = null;
let selectedPlace = null;

/**
 * Inicializa el autocompletado con OpenStreetMap
 */
function initOpenStreetMapAutocomplete() {
    const inputReg = document.getElementById('regUbicacion');
    const inputSearch = document.getElementById('searchUbicacion');
    
    if (!inputReg && !inputSearch) {
        return;
    }

    // Inicializar autocompletado para el formulario de registro
    if (inputReg) {
        setupAutocomplete(inputReg, 'reg');
    }
    
    // Inicializar autocompletado para el formulario de búsqueda
    if (inputSearch) {
        setupAutocomplete(inputSearch, 'search');
    }
}

/**
 * Configura el autocompletado para un input específico
 */
function setupAutocomplete(input, prefix) {
    // Crear contenedor de sugerencias
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.id = `osm-suggestions-${prefix}`;
    suggestionsContainer.className = 'osm-suggestions-container';
    suggestionsContainer.style.display = 'none';
    
    // Insertar después del input
    input.parentNode.style.position = 'relative';
    input.parentNode.appendChild(suggestionsContainer);

    // Event listeners
    input.addEventListener('input', (e) => handleInputOSM(e, prefix));
    input.addEventListener('focus', (e) => handleFocusOSM(e, prefix));
    input.addEventListener('blur', (e) => handleBlurOSM(e, prefix));
    
    // Cerrar sugerencias al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!input.parentNode.contains(e.target)) {
            hideSuggestionsOSM(prefix);
        }
    });
}

/**
 * Maneja el evento de input con debounce
 */
function handleInputOSM(e, prefix) {
    const query = e.target.value.trim();
    
    // Limpiar timeout anterior
    if (autocompleteTimeout) {
        clearTimeout(autocompleteTimeout);
    }
    
    // Si está vacío, ocultar sugerencias
    if (query.length < 2) {
        hideSuggestionsOSM(prefix);
        return;
    }
    
    // Debounce de 800ms
    autocompleteTimeout = setTimeout(() => {
        searchPlacesOSM(query, prefix);
    }, 800);
}

/**
 * Maneja el focus del input
 */
function handleFocusOSM(e, prefix) {
    const query = e.target.value.trim();
    if (query.length >= 2) {
        searchPlacesOSM(query, prefix);
    }
}

/**
 * Maneja el blur del input
 */
function handleBlurOSM(e, prefix) {
    setTimeout(() => {
        hideSuggestionsOSM(prefix);
    }, 200);
}

/**
 * Busca lugares usando Nominatim (OpenStreetMap)
 */
async function searchPlacesOSM(query, prefix) {
    const suggestionsContainer = document.getElementById(`osm-suggestions-${prefix}`);
    
    // Mostrar indicador de carga
    suggestionsContainer.innerHTML = '<div class="osm-loading">🔍 Buscando hospitales y clínicas...</div>';
    suggestionsContainer.style.display = 'block';

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `format=json&` +
            `q=${encodeURIComponent(query)}&` +
            `countrycodes=ve&` +
            `limit=20&` +
            `addressdetails=1&` +
            `extratags=1`,
            {
                headers: {
                    'Accept-Language': 'es'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Error en la búsqueda');
        }

        let places = await response.json();
        
        // Filtrar SOLO hospitales, clínicas y centros de salud
        places = places.filter(place => {
            const name = (place.display_name || '').toLowerCase();
            const type = (place.type || '').toLowerCase();
            const placeClass = (place.class || '').toLowerCase();
            
            const isHealthcare = 
                type === 'hospital' ||
                type === 'clinic' ||
                type === 'doctors' ||
                placeClass === 'amenity' && (type === 'hospital' || type === 'clinic' || type === 'pharmacy' || type === 'doctors') ||
                name.includes('hospital') ||
                name.includes('clínica') ||
                name.includes('clinica') ||
                name.includes('ambulatorio') ||
                name.includes('centro de salud') ||
                name.includes('centro médico') ||
                name.includes('centro medico') ||
                name.includes('policlínica') ||
                name.includes('policlinica') ||
                name.includes('sanatorio') ||
                name.includes('dispensario');
            
            return isHealthcare;
        });
        
        places = places.slice(0, 10);
        
        if (places.length > 0) {
            displaySuggestionsOSM(places, prefix);
        } else {
            await searchHospitalsDirectlyOSM(query, prefix);
        }

    } catch (error) {
        suggestionsContainer.innerHTML = '<div class="osm-error">⚠️ Error al buscar. Intente de nuevo.</div>';
    }
}

/**
 * Búsqueda directa de hospitales cuando el filtro estricto no da resultados
 */
async function searchHospitalsDirectlyOSM(query, prefix) {
    const suggestionsContainer = document.getElementById(`osm-suggestions-${prefix}`);
    
    try {
        const searchTerms = [
            `hospital ${query}`,
            `clínica ${query}`,
            `centro de salud ${query}`
        ];
        
        let allPlaces = [];
        
        for (const term of searchTerms) {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `format=json&` +
                `q=${encodeURIComponent(term + ' Venezuela')}&` +
                `countrycodes=ve&` +
                `limit=5&` +
                `addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'es'
                    }
                }
            );
            
            if (response.ok) {
                const places = await response.json();
                
                const healthcarePlaces = places.filter(place => {
                    const name = (place.display_name || '').toLowerCase();
                    return name.includes('hospital') || 
                           name.includes('clínica') || 
                           name.includes('clinica') ||
                           name.includes('centro de salud') ||
                           name.includes('ambulatorio');
                });
                
                allPlaces = allPlaces.concat(healthcarePlaces);
            }
        }
        
        const uniquePlaces = [];
        const seenIds = new Set();
        
        for (const place of allPlaces) {
            if (!seenIds.has(place.place_id)) {
                seenIds.add(place.place_id);
                uniquePlaces.push(place);
            }
        }
        
        if (uniquePlaces.length > 0) {
            displaySuggestionsOSM(uniquePlaces.slice(0, 10), prefix);
        } else {
            suggestionsContainer.innerHTML = '<div class="osm-no-results">🏥 No se encontraron hospitales o clínicas.<br>Intente buscar por ciudad (ej: "caracas")</div>';
        }

    } catch (error) {
        suggestionsContainer.innerHTML = '<div class="osm-error">⚠️ Error al buscar</div>';
    }
}

/**
 * Muestra las sugerencias de lugares
 */
function displaySuggestionsOSM(places, prefix) {
    const suggestionsContainer = document.getElementById(`osm-suggestions-${prefix}`);
    
    suggestionsContainer.innerHTML = '';
    
    places.forEach((place, index) => {
        const item = createSuggestionItemOSM(place, index, prefix);
        suggestionsContainer.appendChild(item);
    });
    
    suggestionsContainer.style.display = 'block';
}

/**
 * Crea un elemento de sugerencia
 */
function createSuggestionItemOSM(place, index, prefix) {
    const item = document.createElement('div');
    item.className = 'osm-suggestion-item';
    item.setAttribute('data-index', index);
    
    const icon = getPlaceIcon(place);
    const name = place.display_name.split(',')[0];
    const address = formatAddress(place);
    
    item.innerHTML = `
        <div class="osm-suggestion-icon">${icon}</div>
        <div class="osm-suggestion-content">
            <div class="osm-suggestion-name">${escapeHtmlOSM(name)}</div>
            <div class="osm-suggestion-address">${escapeHtmlOSM(address)}</div>
        </div>
    `;
    
    item.addEventListener('click', () => {
        selectPlaceOSM(place, prefix);
    });
    
    item.addEventListener('mouseenter', () => {
        item.classList.add('osm-suggestion-hover');
    });
    item.addEventListener('mouseleave', () => {
        item.classList.remove('osm-suggestion-hover');
    });
    
    return item;
}

/**
 * Obtiene el icono apropiado para el tipo de lugar
 */
function getPlaceIcon(place) {
    const type = place.type || place.class || '';
    const name = (place.display_name || '').toLowerCase();
    
    if (name.includes('hospital') || type.includes('hospital') || type.includes('clinic')) {
        return '🏥';
    }
    
    if (name.includes('clínica') || name.includes('clinic') || name.includes('clinica')) {
        return '🏥';
    }
    
    if (name.includes('farmacia') || name.includes('pharmacy')) {
        return '💊';
    }
    
    if (name.includes('centro de salud') || name.includes('health') || name.includes('ambulatorio')) {
        return '🏥';
    }
    
    if (name.includes('refugio') || name.includes('albergue') || name.includes('shelter')) {
        return '🏕️';
    }
    
    return '📍';
}

/**
 * Formatea la dirección del lugar
 */
function formatAddress(place) {
    if (!place.address) {
        return place.display_name;
    }
    
    const parts = [];
    
    if (place.address.road) parts.push(place.address.road);
    if (place.address.city) parts.push(place.address.city);
    if (place.address.town) parts.push(place.address.town);
    if (place.address.village) parts.push(place.address.village);
    if (place.address.municipality) parts.push(place.address.municipality);
    if (place.address.state) parts.push(place.address.state);
    
    return parts.length > 0 ? parts.join(', ') : place.display_name;
}

/**
 * Selecciona un lugar y lo pone en el input
 */
function selectPlaceOSM(place, prefix) {
    const input = document.getElementById(prefix === 'reg' ? 'regUbicacion' : 'searchUbicacion');
    
    const name = place.display_name.split(',')[0];
    const address = formatAddress(place);
    
    let fullLocation = name;
    if (address && address !== place.display_name) {
        fullLocation = `${name} - ${address}`;
    }
    
    if (fullLocation.length > 300) {
        fullLocation = fullLocation.substring(0, 297) + '...';
    }
    
    input.value = fullLocation;
    selectedPlace = place;
    
    hideSuggestionsOSM(prefix);
    
    input.classList.add('place-selected');
    setTimeout(() => {
        input.classList.remove('place-selected');
    }, 600);
}

/**
 * Oculta las sugerencias
 */
function hideSuggestionsOSM(prefix) {
    const suggestionsContainer = document.getElementById(`osm-suggestions-${prefix}`);
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }
}

/**
 * Limpia el autocompletado
 */
function clearAutocomplete() {
    const inputReg = document.getElementById('regUbicacion');
    const inputSearch = document.getElementById('searchUbicacion');
    
    if (inputReg) {
        inputReg.value = '';
    }
    if (inputSearch) {
        inputSearch.value = '';
    }
    
    selectedPlace = null;
    hideSuggestionsOSM('reg');
    hideSuggestionsOSM('search');
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtmlOSM(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initOpenStreetMapAutocomplete);

// Exportar funciones si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initOpenStreetMapAutocomplete,
        searchPlacesOSM,
        clearAutocomplete
    };
}
