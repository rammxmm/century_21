import { auth, db, googleProvider, storage } from './firebase-init.js';
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, collection, getDocs, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.Account = (() => {

    let currentUserData = null;

    function getSession() {
        return currentUserData;
    }

    async function setSession(user) {
        if (!user) return;
        if (!user.favoritos) user.favoritos = [];
        if (!user.propiedades) user.propiedades = [];
        if (!user.clientes) user.clientes = [];
        if (!user.historial) user.historial = [];
        if (!user.busquedasGuardadas) user.busquedasGuardadas = [];

        currentUserData = user;

        if (auth.currentUser) {
            try {
                await setDoc(doc(db, "usuarios", auth.currentUser.uid), user);
            } catch (e) {
                console.error("Error saving session to Firebase", e);
            }
        }
    }

    const CONFIG = {
        comprador: {
            btnLabel: 'Explorar Propiedades',
            btnAction: () => document.querySelector('.featured-section')?.scrollIntoView({ behavior: 'smooth' }),
            greeting: 'Bienvenido de vuelta',
            badgeColor: '#3498db',
            badgeLabel: 'COMPRADOR',
        },
        vendedor: {
            btnLabel: 'Publicar Propiedad',
            btnAction: () => document.getElementById('publish-modal')?.classList.remove('hidden'),
            greeting: 'Tu portafolio te espera',
            badgeColor: '#27ae60',
            badgeLabel: 'VENDEDOR',
        },
        agente: {
            btnLabel: 'Nueva Propiedad',
            btnAction: () => document.getElementById('publish-modal')?.classList.remove('hidden'),
            greeting: 'Gestiona tu cartera',
            badgeColor: '#8e44ad',
            badgeLabel: 'AGENTE',
        },
        inversionista: {
            btnLabel: 'Ver Análisis',
            btnAction: () => document.getElementById('account-panel')?.scrollIntoView({ behavior: 'smooth' }),
            greeting: 'El mercado te habla',
            badgeColor: '#B79860',
            badgeLabel: 'INVERSIONISTA',
        },
    };

    function applySession() {
        const user = getSession();

        document.body.classList.remove(
            'cuenta-comprador', 'cuenta-vendedor',
            'cuenta-agente', 'cuenta-inversionista', 'sin-sesion'
        );

        if (!user) {
            document.body.classList.add('sin-sesion');
            renderNavGuest();
            document.getElementById('account-banner')?.remove();
            document.getElementById('account-panel')?.remove();
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

    function renderNavGuest() {
        const actionsEl = document.querySelector('.nav-actions');
        if (!actionsEl) return;
        actionsEl.innerHTML = `
            <button class="btn-gold" onclick="window.location.href='login.html'">Iniciar Sesión</button>
            <a href="register.html" class="btn-register-nav">Crear Cuenta</a>
        `;
    }

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
                    <a href="#" onclick="Account.openProfile()" class="dropdown-link">👤 Mi Perfil</a>
                    <div class="dropdown-divider"></div>
                    <a href="#" onclick="Account.logout()" class="logout-link">Cerrar Sesión</a>
                </div>
            </div>
        `;

        document.querySelector('.btn-cuenta-action')
            ?.addEventListener('click', cfg.btnAction);

        document.querySelector('.user-avatar')
            ?.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelector('.user-dropdown')?.classList.toggle('open');
            });

        document.addEventListener('click', () => {
            document.querySelector('.user-dropdown')?.classList.remove('open');
        });
    }

    function renderAccountBanner(user, cfg) {
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

        const navbar = document.querySelector('.navbar-light');
        navbar?.insertAdjacentElement('afterend', banner);

        renderBannerStats(user.tipo);
    }

    function renderBannerStats(tipo) {
        const statsEl = document.getElementById('banner-stats');
        if (!statsEl) return;

        const sess = getSession();
        const favLength = (sess.favoritos || []).length;
        const propLength = (sess.propiedades || []).length;
        const clientLength = (sess.clientes || []).length;
        const savedLength = (sess.busquedasGuardadas || []).length;
        const visitasLength = (sess.visitas || []).length;
        const historialLength = (sess.historial || []).length;

        // Calcular valor total del portafolio del inversionista desde favoritos
        const allProps = window.allProperties || [];
        const favProps = (sess.favoritos || []).map(id => allProps.find(p => String(p.id) === String(id))).filter(Boolean);
        const totalVal = favProps.reduce((sum, p) => sum + (parseFloat((p.price || '').replace(/[^0-9.]/g, '')) || 0), 0);
        const totalValStr = totalVal > 0 ? '$' + Math.round(totalVal / 1e6 * 10) / 10 + 'M' : '$0';

        // Propiedades publicadas globalmente por este vendedor
        const globalProps = window.globalPublishedProps || [];
        const myPublished = auth.currentUser ? globalProps.filter(p => p.vendedorId === auth.currentUser.uid) : [];
        const publishedCnt = myPublished.length || propLength;

        const stats = {
            comprador: `
                <div class="stat-item"><span class="stat-num">${favLength}</span><span class="stat-label">Favoritos</span></div>
                <div class="stat-item"><span class="stat-num">${visitasLength}</span><span class="stat-label">Citas agendadas</span></div>
                <div class="stat-item"><span class="stat-num">${savedLength}</span><span class="stat-label">Búsquedas guardadas</span></div>
                <div class="stat-item"><span class="stat-num">${historialLength}</span><span class="stat-label">Vistas</span></div>
            `,
            vendedor: `
                <div class="stat-item"><span class="stat-num">${publishedCnt}</span><span class="stat-label">Publicaciones activas</span></div>
                <div class="stat-item"><span class="stat-num">${visitasLength}</span><span class="stat-label">Visitas recibidas</span></div>
                <div class="stat-item"><span class="stat-num">${globalProps.length}</span><span class="stat-label">Propiedades en mercado</span></div>
            `,
            agente: `
                <div class="stat-item"><span class="stat-num">${(window.globalPublishedProps || []).length}</span><span class="stat-label">Listings disponibles</span></div>
                <div class="stat-item"><span class="stat-num">${clientLength}</span><span class="stat-label">Clientes activos</span></div>
                <div class="stat-item"><span class="stat-num">${visitasLength}</span><span class="stat-label">Visitas coordinadas</span></div>
            `,
            inversionista: `
                <div class="stat-item"><span class="stat-num">${favLength}</span><span class="stat-label">En portafolio</span></div>
                <div class="stat-item"><span class="stat-num">${totalValStr}</span><span class="stat-label">Valor estimado</span></div>
                <div class="stat-item"><span class="stat-num">+12%</span><span class="stat-label">Plusvalía anual</span></div>
            `,
        };

        statsEl.innerHTML = stats[tipo] || '';
    }

    function renderAccountPanel(tipo) {
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

        const footer = document.querySelector('.footer-dark');
        footer?.insertAdjacentElement('beforebegin', panel);
    }

    function renderPropCard(prop) {
        const safeId = String(prop.id);
        return `
            <div class="property-card-small" style="cursor:pointer;" onclick="window.openDetailsModal('${safeId}')">
                <div class="card-img-small" style="height:150px;">
                    <img src="${prop.image}" alt="${prop.title}">
                </div>
                <div class="card-info-small">
                    <h3 style="font-size:1rem; margin-bottom:0.2rem;">${prop.price}</h3>
                    <p style="font-size:0.85rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${prop.title}</p>
                    <div class="card-amenities" style="font-size:0.8rem;">
                        <span>🛏 ${prop.bedrooms}</span>
                        <span>🚿 ${prop.bathrooms}</span>
                        <span>📐 ${prop.area}m²</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderPanelComprador() {
        const user = getSession();
        const favs = user.favoritos || [];
        const visitas = user.visitas || [];
        const guardadas = user.busquedasGuardadas || [];
        const allProps = window.allProperties || [];

        // --- FAVORITOS ---
        const favsHtml = favs.length > 0 && allProps.length > 0
            ? favs.map(id => { const p = allProps.find(x => x.id === id); return p ? renderPropCard(p) : ''; }).join('')
            : `<div class="favorito-empty" style="grid-column:span 2;"><span>🏡</span><p>Aún no tienes favoritos.</p></div>`;

        // --- VISITAS ---
        let visitasHtml = `<div class="favorito-empty"><span>🗓</span><p>Aún no tienes visitas agendadas.</p></div>`;
        if (visitas.length > 0 && allProps.length > 0) {
            visitasHtml = visitas.map((v, idx) => {
                const prop = allProps.find(p => p.id === parseInt(v.propertyId));
                const title = prop ? prop.title : `Propiedad #${v.propertyId}`;
                const img = prop ? prop.image : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=200&q=80';
                return `
                    <div class="visita-card">
                        <img src="${img}" style="width:80px;height:80px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="window.openDetailsModal(${v.propertyId})">
                        <div style="flex:1">
                            <h4 style="margin:0 0 0.3rem 0;cursor:pointer;" onclick="window.openDetailsModal(${v.propertyId})">${title}</h4>
                            <p style="margin:0;color:#aaa;font-size:0.9rem">📅 ${v.date} ⏰ ${v.time}</p>
                            <span class="visita-status" style="background:${v.status === 'Cancelada' ? '#550000' : '#B79860'};color:${v.status === 'Cancelada' ? '#fff' : '#000'}">${v.status || 'Confirmada'}</span>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:0.5rem;">
                            ${v.status !== 'Cancelada' ? `<button class="btn-mp" onclick="window.Account.cancelVisit(${idx})" style="background:#550000;color:white;border:none">Cancelar</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        // --- BÚSOUEDAS GUARDADAS ---
        const savedHtml = guardadas.length > 0
            ? guardadas.map((q, i) => `
                <div class="saved-search-item">
                    <span class="saved-query">🔍 &ldquo;${q}&rdquo;</span>
                    <div style="display:flex;gap:0.5rem;">
                        <button class="btn-mp" onclick="document.getElementById('semantic-search').value='${q.replace(/'/g, "\\'")}';
                            document.getElementById('ai-modal').classList.remove('hidden');
                            document.getElementById('btn-search-ai').click();">
                            Buscar
                        </button>
                        <button class="btn-mp" style="background:#550000;color:white;border:none;"
                            onclick="window.Account.deleteSearch(${i})">&#10005;</button>
                    </div>
                </div>
            `).join('')
            : `<p style="color:#666;">Guarda una búsqueda desde el modal de IA para verla aquí.</p>`;

        // --- RECOMENDACIONES IA ---
        const recs = typeof window.getRecommendations === 'function' ? window.getRecommendations() : [];
        const recsHtml = recs.length > 0
            ? `<div class="panel-header" style="margin-top:2.5rem;">
                    <h2>🧠 RECOMENDADO PARA TI</h2>
                    <p>Basado en tus favoritos e historial de visualización.</p>
               </div>
               <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem;">
                   ${recs.map(p => `
                       <div onclick="window.openDetailsModal(${p.id})" style="cursor:pointer;position:relative;">
                           ${renderPropCard(p)}
                           <div class="rec-badge">🧠 ${p.matchPercent}% match</div>
                       </div>
                   `).join('')}
               </div>`
            : '';

        return `
            <div class="comprador-panel-grid">
                <div class="comprador-col">
                    <div class="panel-header">
                        <h2>MIS VISITAS</h2>
                        <p>Tus citas programadas con agentes.</p>
                    </div>
                    <div class="panel-visitas">${visitasHtml}</div>
                </div>
                <div class="comprador-col">
                    <div class="panel-header">
                        <h2>MIS FAVORITOS</h2>
                        <p>Propiedades que has guardado para revisitar.</p>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:start;">${favsHtml}</div>
                </div>
            </div>
            <div class="panel-header" style="margin-top:2.5rem;">
                <h2>🔖 MIS BÚSQUEDAS GUARDADAS</h2>
                <p>Tus consultas de IA para retomar cuando quieras.</p>
            </div>
            <div class="saved-searches-list">${savedHtml}</div>
            ${recsHtml}

            <div style="margin-top:4rem; padding:2rem; background:linear-gradient(135deg, #1a1a1a 0%, #000 100%); color:white; border-radius:12px; text-align:center;">
                <h2 style="color:var(--gold); margin-bottom:1rem;">¿Quieres llevar tus inversiones al siguiente nivel?</h2>
                <p style="margin-bottom:1.5rem; color:#ccc;">Postúlate como Inversionista y accede a análisis de mercado avanzado, proyecciones de ROI y plusvalía en tiempo real para todas las propiedades de nuestro catálogo.</p>
                <button class="btn-gold" onclick="window.Account.postularInversionista()">Postularme como Inversionista</button>
            </div>
        `;
    }

    function renderPanelVendedor() {
        const user = getSession();
        const propiedades = user.propiedades || [];

        const propsHtml = propiedades.length > 0 ? propiedades.map(p => `
            <div class="mi-propiedad-card" style="padding:0; overflow:hidden;">
                <div style="height:140px; background:url('${p.image || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=600'}') center/cover;"></div>
                <div style="padding:1.5rem;">
                    <div class="mp-header">
                        <h4 style="font-size:1.1rem; font-weight:600; line-height:1.2; max-width:70%;">${p.titulo}</h4>
                        <span class="mp-status status-activo">${p.status === 'rent' ? 'En Renta' : 'En Venta'}</span>
                    </div>
                    <div class="mp-precio">${p.precio}</div>
                    <div class="mp-stats">
                        <div><span>0</span> Vistas</div>
                        <div><span>0</span> Interesados</div>
                    </div>
                    <div class="mp-actions">
                        <button class="btn-mp" onclick="alert('Editando...')">✏ Editar</button>
                    </div>
                </div>
            </div>
        `).join('') : '<p style="grid-column:1/-1;color:#666;">No tienes propiedades publicadas aún.</p>';

        return `
            <div class="panel-header">
                <h2>MIS PROPIEDADES</h2>
                <button class="btn-gold btn-sm" onclick="document.getElementById('publish-modal')?.classList.remove('hidden')">+ Publicar Nueva</button>
            </div>
            <div class="mis-propiedades-grid" id="mis-propiedades-grid">
                ${propsHtml}
                <div class="mi-propiedad-card mp-nueva" onclick="document.getElementById('publish-modal')?.classList.remove('hidden')">
                    <span>+</span>
                    <p>Publicar nueva propiedad</p>
                </div>
            </div>
        `;
    }

    function renderPanelAgente() {
        const user = getSession();
        const clientes = user.clientes || [];

        const clientsHtml = clientes.length > 0 ? clientes.map(c => `
            <div class="cliente-card">
                <div class="cliente-avatar">${c.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}</div>
                <div class="cliente-info">
                    <strong>${c.nombre}</strong>
                    <span class="cliente-tipo">${c.tipo}</span>
                </div>
                <span class="cliente-estado estado-${c.estado.toLowerCase().replace(' ', '-')}">${c.estado}</span>
            </div>
        `).join('') : '<p>Aún no tienes clientes.</p>';

        return `
            <div class="panel-header">
                <h2>MI CARTERA DE CLIENTES</h2>
                <button class="btn-gold btn-sm" onclick="document.getElementById('client-modal')?.classList.remove('hidden')">+ Agregar Cliente</button>
            </div>
            <div class="clientes-grid" id="clientes-grid">
                ${clientsHtml}
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
                        <button class="btn-mp" onclick="document.getElementById('trigger-ai-modal')?.click(); document.getElementById('semantic-search').value = 'Departamentos en ${z.zona} con alto ROI'; setTimeout(() => document.getElementById('btn-search-ai')?.click(), 300);">Ver oportunidades →</button>
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

    function showPanel(panelId) {
        const el = document.getElementById(panelId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else document.getElementById('account-panel')?.scrollIntoView({ behavior: 'smooth' });
    }

    function openProfile() {
        const user = getSession();
        if (!user) return;
        document.getElementById('profile-name').value = user.nombre || '';
        document.getElementById('profile-email').value = user.correo || '';
        document.getElementById('profile-phone').value = user.telefono || '';

        // Poblar header del modal rediseñado
        const avatarEl = document.getElementById('profile-avatar-display');
        if (avatarEl) {
            avatarEl.textContent = user.avatar || 'U';
            const cfg = CONFIG[user.tipo];
            if (cfg) avatarEl.style.background = cfg.badgeColor;
        }
        const labelEl = document.getElementById('profile-account-label');
        if (labelEl) {
            const cfg = CONFIG[user.tipo];
            labelEl.textContent = cfg ? cfg.badgeLabel : 'CUENTA';
        }

        document.getElementById('profile-modal')?.classList.remove('hidden');
        document.querySelector('.user-dropdown')?.classList.remove('open');
    }

    async function loginWithEmail(email, password) {
        try {
            window.isLoggingIn = true;
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'index.html';
        } catch (error) {
            window.isLoggingIn = false;
            alert('Error al iniciar sesión: ' + error.message);
        }
    }

    async function registerWithEmail(email, password, nombre, tipo) {
        try {
            window.isLoggingIn = true;
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            const userData = {
                nombre: nombre,
                correo: email,
                tipo: tipo,
                avatar: nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
                favoritos: [],
                propiedades: [],
                clientes: [],
                historial: [],
                busquedasGuardadas: []
            };
            await setDoc(doc(db, "usuarios", user.uid), userData);
            window.location.href = 'index.html';
        } catch (error) {
            window.isLoggingIn = false;
            const FIREBASE_ERRORS = {
                'auth/email-already-in-use': 'Este correo ya está asociado a una cuenta. ¿Quieres iniciar sesión?',
                'auth/invalid-email': 'El formato del correo no es válido.',
                'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
                'auth/operation-not-allowed': 'El registro con correo está deshabilitado temporalmente.',
                'auth/network-request-failed': 'Sin conexión. Verifica tu internet e inténtalo de nuevo.',
            };
            const msg = FIREBASE_ERRORS[error.code] || 'Ocurrió un error inesperado. Inténtalo más tarde.';
            // Si la página define showRegisterError(), usarla; si no, fallback a alert
            if (typeof window.showRegisterError === 'function') {
                window.showRegisterError(msg, error.code);
            } else {
                alert(msg);
            }
        }
    }

    async function loginWithGoogle(defaultTipo = 'comprador') {
        try {
            window.isLoggingIn = true;
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;

            const docRef = doc(db, "usuarios", user.uid);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                const userData = {
                    nombre: user.displayName || 'Usuario',
                    correo: user.email,
                    tipo: defaultTipo,
                    avatar: (user.displayName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
                    favoritos: [],
                    propiedades: [],
                    clientes: [],
                    historial: [],
                    busquedasGuardadas: []
                };
                await setDoc(docRef, userData);
            }
            window.location.href = 'index.html';
        } catch (error) {
            window.isLoggingIn = false;
            alert('Error con Google Sign-In: ' + error.message);
        }
    }

    function logout() {
        signOut(auth).then(() => {
            window.location.href = 'index.html'; // Redirect to home
        }).catch((error) => {
            console.error(error);
        });
    }

    function initModals() {
        document.getElementById('close-profile-modal')?.addEventListener('click', () => {
            document.getElementById('profile-modal').classList.add('hidden');
        });
        document.getElementById('profile-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getSession();
            if (user) {
                const now = Date.now();
                // 30 días = 30 * 24 * 60 * 60 * 1000 = 2592000000 ms
                if (user.lastProfileUpdate && (now - user.lastProfileUpdate < 2592000000)) {
                    alert('Solo puedes modificar tus datos personales una vez cada 30 días por seguridad.');
                    return;
                }

                user.nombre = document.getElementById('profile-name').value;
                user.correo = document.getElementById('profile-email').value;
                user.telefono = document.getElementById('profile-phone').value;
                user.avatar = user.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                user.lastProfileUpdate = now;

                setSession(user);
                applySession();
                document.getElementById('profile-modal').classList.add('hidden');
                alert('Perfil actualizado con éxito.');
            }
        });

        document.getElementById('close-publish-modal')?.addEventListener('click', () => {
            document.getElementById('publish-modal').classList.add('hidden');
        });
        document.getElementById('publish-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = getSession();
            if (!user) { alert('Debes iniciar sesión para publicar.'); return; }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Publicando...';
            submitBtn.disabled = true;

            try {
                const rawPrice = document.getElementById('pub-price').value;
                const numericPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
                const formattedPrice = isNaN(numericPrice)
                    ? rawPrice
                    : '$' + numericPrice.toLocaleString('es-MX');

                const nuevaPropiedad = {
                    id: Date.now(),
                    titulo: document.getElementById('pub-title').value,
                    title: document.getElementById('pub-title').value,
                    precio: formattedPrice,
                    price: formattedPrice,
                    ubicacion: document.getElementById('pub-location').value,
                    location: document.getElementById('pub-location').value,
                    status: document.getElementById('pub-status').value,
                    type: document.getElementById('pub-type').value,
                    bedrooms: parseInt(document.getElementById('pub-beds').value) || 0,
                    bathrooms: parseFloat(document.getElementById('pub-baths').value) || 0,
                    area: parseInt(document.getElementById('pub-area').value) || 0,
                    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
                    vendedorId: auth.currentUser ? auth.currentUser.uid : 'anon',
                    description: 'Propiedad publicada recientemente por un agente o vendedor.',
                    createdAt: new Date().toISOString()
                };

                // Convertir imagen a base64 localmente (sin depender de Firebase Storage)
                const fileInput = document.getElementById('pub-image');
                if (fileInput.files && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    nuevaPropiedad.image = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (ev) => resolve(ev.target.result);
                        reader.onerror = () => resolve('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80');
                        reader.readAsDataURL(file);
                    });
                }

                if (!user.propiedades) user.propiedades = [];
                user.propiedades.push(nuevaPropiedad);
                await setSession(user);
                applySession();

                // Guardar en la colección global de Firestore
                try {
                    await addDoc(collection(db, "global_properties"), nuevaPropiedad);
                } catch (err) {
                    console.warn("Firestore global save failed:", err.message);
                }

                // Disparar recarga de propiedades globales en App.js
                if (typeof window.appLoadProperties === 'function') window.appLoadProperties();

                document.getElementById('publish-modal').classList.add('hidden');
                e.target.reset();
                alert('¡Propiedad publicada con éxito! Ahora es visible para todos los compradores.');
            } catch (err) {
                console.error('Error al publicar propiedad:', err);
                alert('Ocurrió un error al publicar: ' + err.message);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });

        document.getElementById('close-client-modal')?.addEventListener('click', () => {
            document.getElementById('client-modal').classList.add('hidden');
        });
        document.getElementById('client-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getSession();
            if (user) {
                const nuevoCliente = {
                    id: 'client_' + Date.now(),
                    nombre: document.getElementById('client-name').value,
                    tipo: document.getElementById('client-type').value,
                    estado: document.getElementById('client-status').value
                };
                user.clientes.push(nuevoCliente);
                setSession(user);
                applySession();
                document.getElementById('client-modal').classList.add('hidden');
                e.target.reset();
            }
        });

        // Lógica de Visitas
        document.getElementById('close-visit-modal')?.addEventListener('click', () => {
            document.getElementById('visit-modal').classList.add('hidden');
        });
        document.getElementById('visit-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getSession();
            if (user) {
                if (!user.visitas) user.visitas = [];
                const nuevaVisita = {
                    propertyId: document.getElementById('visit-property-id').value,
                    date: document.getElementById('visit-date').value,
                    time: document.getElementById('visit-time').value,
                    status: 'Confirmada'
                };
                user.visitas.push(nuevaVisita);
                setSession(user);
                applySession();
                document.getElementById('visit-modal').classList.add('hidden');
                alert('¡Visita agendada exitosamente!');
                e.target.reset();
            }
        });
    }

    async function cancelVisit(index) {
        if (!confirm('¿Estás seguro de cancelar esta visita?')) return;
        const user = getSession();
        if (user && user.visitas && user.visitas[index]) {
            user.visitas[index].status = 'Cancelada';
            await setSession(user);
            applySession();
        }
    }

    async function saveSearch(query) {
        const user = getSession();
        if (!user || !query.trim()) return;
        if (!user.busquedasGuardadas) user.busquedasGuardadas = [];
        if (!user.busquedasGuardadas.includes(query)) {
            user.busquedasGuardadas.push(query);
            await setSession(user);
            applySession();
        }
        // Actualizar botón visualmente
        const btn = document.getElementById('btn-save-search');
        if (btn) { btn.textContent = '✅ Guardada'; btn.disabled = true; }
    }

    async function deleteSearch(index) {
        const user = getSession();
        if (!user || !user.busquedasGuardadas) return;
        user.busquedasGuardadas.splice(index, 1);
        await setSession(user);
        applySession();
    }

    async function postularInversionista() {
        const user = getSession();
        if (user) {
            if (confirm('¿Deseas postularte y cambiar tu cuenta a Inversionista? Tendrás acceso a herramientas de análisis de mercado y ROI.')) {
                user.tipo = 'inversionista';
                await setSession(user);
                applySession();
                alert('¡Felicidades! Ahora eres Inversionista. Disfruta de las nuevas herramientas de análisis.');
                window.location.reload(); // Recargar para que App.js redibuje las tarjetas con ROI
            }
        }
    }

    function init() {
        onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    const docRef = doc(db, "usuarios", user.uid);
                    let docSnap = null;
                    try {
                        docSnap = await getDoc(docRef);
                    } catch (e) {
                        console.error("Error fetching user data:", e);
                    }

                    if (docSnap && docSnap.exists()) {
                        currentUserData = docSnap.data();
                    } else {
                        // User exists in Auth but not in Firestore.
                        // Create a default session in memory so UI doesn't crash
                        currentUserData = {
                            nombre: user.displayName || 'Usuario',
                            correo: user.email,
                            tipo: 'comprador',
                            avatar: (user.displayName || 'U').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
                            favoritos: [],
                            propiedades: [],
                            clientes: []
                        };
                    }

                    const path = window.location.pathname;
                    if ((path.includes('login') || path.includes('register')) && !window.isLoggingIn) {
                        window.location.href = 'index.html';
                    } else if (document.querySelector('.nav-actions') && !window.isLoggingIn) {
                        applySession();
                        if (window.appLoadProperties) window.appLoadProperties();
                    }
                } else {
                    currentUserData = null;
                    if (document.querySelector('.nav-actions')) {
                        applySession();
                    }
                }
            } catch (err) {
                console.error("Error in onAuthStateChanged:", err);
            }
        });

        initModals();
    }

    return {
        init,
        logout,
        getSession,
        setSession,
        applySession,
        openProfile,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        cancelVisit,
        saveSearch,
        deleteSearch,
        postularInversionista
    };

})();

document.addEventListener('DOMContentLoaded', () => window.Account.init());