/**
 * Tailwind CSS Helper Functions
 * Manejo de estados activos y estilos dinámicos
 */

// Actualizar estilos de botones del header cuando cambia la sección activa
function updateHeaderButtons(activeSection) {
    const searchBtn = document.getElementById('showSearchBtn');
    const registerBtn = document.getElementById('showRegisterBtn');

    const activeClass   = 'flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-10 px-3 sm:px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow-sm min-w-0';
    const inactiveClass = 'flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-10 px-3 sm:px-5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg font-semibold text-sm transition-all min-w-0';

    if (activeSection === 'search') {
        searchBtn.className = activeClass;
        registerBtn.className = inactiveClass;
    } else {
        searchBtn.className = inactiveClass;
        registerBtn.className = activeClass;
    }
}

// Actualizar estilos de filtros rápidos (pills)
function updateQuickFilterPills(activeFilter) {
    const activeClasses   = 'quick-filter-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 border border-blue-600 text-blue-700 rounded-full text-sm font-semibold cursor-pointer transition-all active';
    const inactiveClasses = 'quick-filter-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-full text-sm font-medium cursor-pointer transition-all';

    document.querySelectorAll('.quick-filter-pill').forEach(pill => {
        const filterType = pill.dataset.filter;
        const icon = pill.querySelector('i[data-lucide="check"]');

        if (filterType === activeFilter) {
            pill.className = activeClasses;
            if (icon) { icon.style.opacity = '1'; icon.style.transform = 'scale(1)'; }
        } else {
            pill.className = inactiveClasses;
            if (icon) { icon.style.opacity = '0'; icon.style.transform = 'scale(0.5)'; }
        }
    });
}

// Exportar funciones para uso global
window.updateHeaderButtons = updateHeaderButtons;
window.updateQuickFilterPills = updateQuickFilterPills;
