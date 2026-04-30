/* ==========================================================================
   ACCOUNT.JS — Gestión de sesión y diferenciación por tipo de cuenta
   Sin Firebase por ahora: usa localStorage para simular el estado de sesión.
   Cuando integres Firebase, solo reemplaza las funciones getSession/setSession.
   ========================================================================== */

const Account = (() => {

    // ------------------------------------------------------------------
    // SIMULACIÓN DE SESIÓN (reemplazar con Firebase Auth en producción)
    // ------------------------------------------------------------------

    function getSession() {
        try {
            const raw = localStorage.getItem('c21_session');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    function setSession(user) {
        localStorage.setItem('c21_session', JSON.stringify(user));
    }

    function clearSession() {
        localStorage.removeItem('c21_session');
    }

    // Usuario de demo para cada tipo (para poder probar sin backend)
    const DEMO_USERS = {
        comprador: { nombre: 'Ana García', tipo: 'comprador', avatar: 'AG' },
        vendedor: { nombre: 'Carlos Méndez', tipo: 'vendedor', avatar: 'CM' },
        agente: { nombre: 'Sofía Ramírez', tipo: 'agente', avatar: 'SR' },
        inversionista: { nombre: 'Luis Torres', tipo: 'inversionista', avatar: 'LT' },
    };

    // ------------------------------------------------------------------
    // CONFIGURACIÓN POR TIPO DE CUENTA
    // ------------------------------------------------------------------

    const CONFIG = {
        comprador: {
            btnLabel: 'Solicitar una Visita',
            btnAction: () => alert('Abriendo solicitud de visita...'),
            greeting: 'Bienvenido de vuelta',
            badgeColor: '#3498db',
            badgeLabel: 'COMPRADOR',
        },
        vendedor: {
            btnLabel: 'Publicar Propiedad',
            btnAction: () => showPanel('panel-vendedor'),
            greeting: 'Tu portafolio te espera',
            badgeColor: '#27ae60',
            badgeLabel: 'VENDEDOR',
        },
        agente: {
            btnLabel: 'Gestionar Listings',
            btnAction: () => showPanel('panel-agente'),
            greeting: 'Gestiona tu cartera',
            badgeColor: '#8e44ad',
            badgeLabel: 'AGENTE',
        },
        inversionista: {
            btnLabel: 'Análisis de Mercado',
            btnAction: () => showPanel('panel-inversionista'),
            greeting: 'El mercado te habla',
            badgeColor: '#B79860',
            badgeLabel: 'INVERSIONISTA',
        },
    };

    // ------------------------------------------------------------------
    // APLICAR ESTADO DE SESIÓN AL DOM
    // ------------------------------------------------------------------

    function applySession() {
        const user = getSession();

        // Siempre limpiar clases anteriores
        document.body.classList.remove(
            'cuenta-comprador', 'cuenta-vendedor',
            'cuenta-agente', 'cuenta-inversionista', 'sin-sesion'
        );

        if (!user) {
            document.body.classList.add('sin-sesion');
            renderNavGuest();
            return;
        }

        const tipo = user.tipo;
        document.body.classList.add(`cuenta-${tipo}`);

        const cfg = CONFIG[tipo];
        if (!cfg) return;

        renderNavUser(user, cfg);
        renderAccountBanner(user, cfg);
        renderAccountPanel(tipo);
    }

    // Navbar para usuario NO autenticado
    function renderNavGuest() {
        const actionsEl = document.querySelector('.nav-actions');
        if (!actionsEl) return;
        actionsEl.innerHTML = `
            <button class="btn-gold" onclick="window.location.href='login.html'">Iniciar Sesión</button>
            <a href="register.html" class="btn-register-nav">Crear Cuenta</a>
        `;
    }

    // Navbar para usuario autenticado
    function renderNavUser(user, cfg) {
        const actionsEl = document.querySelector('.nav-actions');
        if (!actionsEl) return;

        actionsEl.innerHTML = `
            <button class="btn-gold btn-cuenta-action">${cfg.btnLabel}</button>
            <div class="user-menu-wrapper">
                <div class="user-avatar" title="${user.nombre}" style="background:${cfg.badgeColor}">
                    ${user.avatar}
                </div>
                <div class="user-dropdown">
                    <div class="user-dropdown-header">
                        <strong>${user.nombre}</strong>
                        <span class="account-badge" style="background:${cfg.badgeColor}">${cfg.badgeLabel}</span>
                    </div>
                    <a href="#" onclick="Account.switchDemo('comprador')">🔵 Demo Comprador</a>
                    <a href="#" onclick="Account.switchDemo('vendedor')">🟢 Demo Vendedor</a>
                    <a href="#" onclick="Account.switchDemo('agente')">🟣 Demo Agente</a>
                    <a href="#" onclick="Account.switchDemo('inversionista')">🟡 Demo Inversionista</a>
                    <div class="dropdown-divider"></div>
                    <a href="#" onclick="Account.logout()" class="logout-link">Cerrar Sesión</a>
                </div>
            </div>
        `;

        // Acción del botón principal
        document.querySelector('.btn-cuenta-action')
            ?.addEventListener('click', cfg.btnAction);

        // Toggle dropdown
        document.querySelector('.user-avatar')
            ?.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelector('.user-dropdown')?.classList.toggle('open');
            });

        document.addEventListener('click', () => {
            document.querySelector('.user-dropdown')?.classList.remove('open');
        });
    }

    // Banner de bienvenida debajo del navbar
    function renderAccountBanner(user, cfg) {
        // Eliminar banner anterior si existe
        document.getElementById('account-banner')?.remove();

        const banner = document.createElement('div');
        banner.id = 'account-banner';
        banner.className = `account-banner cuenta-banner-${user.tipo}`;
        banner.innerHTML = `
            <div class="banner-inner">
                <div class="banner-left">
                    <span class="banner-greeting">${cfg.greeting},</span>
                    <span class="banner-name">${user.nombre}</span>
                </div>
                <div class="banner-stats" id="banner-stats">
                    <!-- Llenado por renderBannerStats -->
                </div>
            </div>
        `;

        // Insertar después del navbar
        const navbar = document.querySelector('.navbar-light');
        navbar?.insertAdjacentElement('afterend', banner);

        renderBannerStats(user.tipo);
    }

    // Estadísticas en el banner según tipo
    function renderBannerStats(tipo) {
        const statsEl = document.getElementById('banner-stats');
        if (!statsEl) return;

        const stats = {
            comprador: `
                <div class="stat-item"><span class="stat-num">12</span><span class="stat-label">Favoritos</span></div>
                <div class="stat-item"><span class="stat-num">3</span><span class="stat-label">Visitas agendadas</span></div>
                <div class="stat-item"><span class="stat-num">5</span><span class="stat-label">Búsquedas guardadas</span></div>
            `,
            vendedor: `
                <div class="stat-item"><span class="stat-num">2</span><span class="stat-label">Propiedades activas</span></div>
                <div class="stat-item"><span class="stat-num">18</span><span class="stat-label">Interesados este mes</span></div>
                <div class="stat-item"><span class="stat-num">$4.2M</span><span class="stat-label">Valor en cartera</span></div>
            `,
            agente: `
                <div class="stat-item"><span class="stat-num">7</span><span class="stat-label">Listings activos</span></div>
                <div class="stat-item"><span class="stat-num">34</span><span class="stat-label">Clientes activos</span></div>
                <div class="stat-item"><span class="stat-num">$12.8M</span><span class="stat-label">En gestión</span></div>
            `,
            inversionista: `
                <div class="stat-item"><span class="stat-num">8.4%</span><span class="stat-label">ROI promedio</span></div>
                <div class="stat-item"><span class="stat-num">4</span><span class="stat-label">Propiedades</span></div>
                <div class="stat-item"><span class="stat-num">+12%</span><span class="stat-label">Plusvalía anual</span></div>
            `,
        };

        statsEl.innerHTML = stats[tipo] || '';
    }

    // ------------------------------------------------------------------
    // PANELES ESPECÍFICOS POR TIPO (se insertan debajo de featured)
    // ------------------------------------------------------------------

    function renderAccountPanel(tipo) {
        // Eliminar panel anterior
        document.getElementById('account-panel')?.remove();

        const panel = document.createElement('section');
        panel.id = 'account-panel';
        panel.className = 'account-panel';

        const panels = {
            vendedor: renderPanelVendedor,
            agente: renderPanelAgente,
            inversionista: renderPanelInversionista,
            comprador: renderPanelComprador,
        };

        const renderFn = panels[tipo];
        if (!renderFn) return;

        panel.innerHTML = renderFn();

        // Insertar antes del footer
        const footer = document.querySelector('.footer-dark');
        footer?.insertAdjacentElement('beforebegin', panel);
    }

    function renderPanelComprador() {
        return `
            <div class="panel-header">
                <h2>MIS FAVORITOS</h2>
                <p>Propiedades que has guardado para revisitar.</p>
            </div>
            <div class="panel-favoritos">
                <div class="favorito-empty">
                    <span>🏡</span>
                    <p>Aún no tienes favoritos. Haz clic en el ❤ de cualquier propiedad para guardarla.</p>
                </div>
            </div>
            <div class="panel-header" style="margin-top:3rem">
                <h2>VISITAS AGENDADAS</h2>
            </div>
            <div class="visitas-grid">
                ${['Penthouse Santa Fe · Mié 14 May, 11:00 AM', 'Villa Lomas · Vie 16 May, 3:00 PM', 'Loft Polanco · Lun 19 May, 10:00 AM']
                .map(v => `
                    <div class="visita-card">
                        <div class="visita-icon">📅</div>
                        <div class="visita-info">
                            <strong>${v.split('·')[0]}</strong>
                            <span>${v.split('·')[1]}</span>
                        </div>
                        <button class="btn-visita-cancel">Cancelar</button>
                    </div>`).join('')}
            </div>
        `;
    }

    function renderPanelVendedor() {
        const propiedades = [
            { nombre: 'Penthouse Santa Fe', precio: '$4,200,000', status: 'Activo', interesados: 12, vistas: 340 },
            { nombre: 'Casa Lomas Altas', precio: '$8,500,000', status: 'En revisión', interesados: 6, vistas: 180 },
        ];
        return `
            <div class="panel-header">
                <h2>MIS PROPIEDADES</h2>
                <button class="btn-gold btn-sm" onclick="alert('Formulario de publicación...')">+ Publicar Nueva</button>
            </div>
            <div class="mis-propiedades-grid">
                ${propiedades.map(p => `
                    <div class="mi-propiedad-card">
                        <div class="mp-header">
                            <h4>${p.nombre}</h4>
                            <span class="mp-status status-${p.status === 'Activo' ? 'activo' : 'revision'}">${p.status}</span>
                        </div>
                        <div class="mp-precio">${p.precio}</div>
                        <div class="mp-stats">
                            <div><span>${p.vistas}</span> Vistas</div>
                            <div><span>${p.interesados}</span> Interesados</div>
                        </div>
                        <div class="mp-actions">
                            <button class="btn-mp" onclick="alert('Editando...')">✏ Editar</button>
                            <button class="btn-mp" onclick="alert('Ver interesados...')">👥 Interesados</button>
                            <button class="btn-mp btn-mp-danger" onclick="alert('Pausando...')">⏸ Pausar</button>
                        </div>
                    </div>
                `).join('')}
                <div class="mi-propiedad-card mp-nueva" onclick="alert('Formulario de publicación...')">
                    <span>+</span>
                    <p>Publicar nueva propiedad</p>
                </div>
            </div>
        `;
    }

    function renderPanelAgente() {
        const clientes = [
            { nombre: 'Roberto Sánchez', tipo: 'Comprador', presupuesto: '$3–5M', estado: 'Activo' },
            { nombre: 'Patricia Vega', tipo: 'Vendedor', propiedad: 'Casa Pedregal', estado: 'Negociando' },
            { nombre: 'Marco Herrera', tipo: 'Comprador', presupuesto: '$8–12M', estado: 'Buscando' },
            { nombre: 'Daniela Cruz', tipo: 'Vendedor', propiedad: 'Depto Polanco', estado: 'Activo' },
        ];
        return `
            <div class="panel-header">
                <h2>MI CARTERA DE CLIENTES</h2>
                <button class="btn-gold btn-sm" onclick="alert('Agregar cliente...')">+ Agregar Cliente</button>
            </div>
            <div class="clientes-grid">
                ${clientes.map(c => `
                    <div class="cliente-card">
                        <div class="cliente-avatar">${c.nombre.split(' ').map(n => n[0]).join('')}</div>
                        <div class="cliente-info">
                            <strong>${c.nombre}</strong>
                            <span class="cliente-tipo">${c.tipo}</span>
                            <span class="cliente-detalle">${c.presupuesto || c.propiedad}</span>
                        </div>
                        <span class="cliente-estado estado-${c.estado.toLowerCase().replace(' ', '-')}">${c.estado}</span>
                    </div>
                `).join('')}
            </div>
            <div class="panel-header" style="margin-top:3rem">
                <h2>MIS LISTINGS ACTIVOS</h2>
                <span class="panel-subtitle">7 propiedades en gestión</span>
            </div>
            <div class="agente-listings-note">
                <p>Los listings aparecen en la sección principal de propiedades con tu insignia de agente. Cada tarjeta muestra botones de <strong>Editar</strong> e <strong>Interesados</strong> solo para ti.</p>
                <button class="btn-gold btn-sm" onclick="alert('Ver todos los listings...')">Ver todos mis listings →</button>
            </div>
        `;
    }

    function renderPanelInversionista() {
        const zonas = [
            { zona: 'Polanco', precio_m2: '$85,000', tendencia: '+14%', rentabilidad: '7.2%' },
            { zona: 'Santa Fe', precio_m2: '$72,000', tendencia: '+9%', rentabilidad: '8.1%' },
            { zona: 'Lomas de Chapultepec', precio_m2: '$95,000', tendencia: '+11%', rentabilidad: '6.8%' },
            { zona: 'Condesa', precio_m2: '$68,000', tendencia: '+16%', rentabilidad: '9.3%' },
        ];
        return `
            <div class="panel-header">
                <h2>ANÁLISIS DE MERCADO</h2>
                <p>Datos actualizados de las zonas premium de CDMX.</p>
            </div>
            <div class="mercado-grid">
                ${zonas.map(z => `
                    <div class="mercado-card">
                        <div class="mercado-zona">${z.zona}</div>
                        <div class="mercado-stats">
                            <div class="mercado-stat">
                                <span class="mstat-label">Precio / m²</span>
                                <span class="mstat-val">${z.precio_m2}</span>
                            </div>
                            <div class="mercado-stat">
                                <span class="mstat-label">Plusvalía anual</span>
                                <span class="mstat-val trend-up">${z.tendencia}</span>
                            </div>
                            <div class="mercado-stat">
                                <span class="mstat-label">Rentabilidad</span>
                                <span class="mstat-val">${z.rentabilidad}</span>
                            </div>
                        </div>
                        <button class="btn-mp" onclick="alert('Analizando ${z.zona}...')">Ver oportunidades →</button>
                    </div>
                `).join('')}
            </div>
            <div class="panel-header" style="margin-top:3rem">
                <h2>MI PORTAFOLIO</h2>
            </div>
            <div class="portafolio-resumen">
                <div class="portafolio-stat"><span>$24.5M</span><label>Valor total</label></div>
                <div class="portafolio-stat"><span>8.4%</span><label>ROI promedio</label></div>
                <div class="portafolio-stat"><span>4</span><label>Propiedades</label></div>
                <div class="portafolio-stat trend-up"><span>+12%</span><label>Plusvalía este año</label></div>
            </div>
        `;
    }

    // Mostrar panel por ID (helper para botones)
    function showPanel(panelId) {
        const el = document.getElementById(panelId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else document.getElementById('account-panel')?.scrollIntoView({ behavior: 'smooth' });
    }

    // ------------------------------------------------------------------
    // API PÚBLICA
    // ------------------------------------------------------------------

    function login(tipo) {
        const user = DEMO_USERS[tipo];
        if (!user) return;
        setSession(user);
        applySession();
    }

    function logout() {
        clearSession();
        document.getElementById('account-banner')?.remove();
        document.getElementById('account-panel')?.remove();
        applySession();
    }

    function switchDemo(tipo) {
        login(tipo);
        // Cerrar dropdown
        document.querySelector('.user-dropdown')?.classList.remove('open');
    }

    function init() {
        applySession();
    }

    return { init, login, logout, switchDemo, getSession };

})();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => Account.init());