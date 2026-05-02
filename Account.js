import { auth, db, googleProvider } from './firebase-init.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
            btnLabel: 'Solicitar una Visita',
            btnAction: () => alert('Abriendo solicitud de visita...'),
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
            btnLabel: 'Gestionar Listings',
            btnAction: () => document.getElementById('client-modal')?.classList.remove('hidden'),
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

        const favLength = getSession().favoritos ? getSession().favoritos.length : 0;
        const propLength = getSession().propiedades ? getSession().propiedades.length : 0;
        const clientLength = getSession().clientes ? getSession().clientes.length : 0;

        const stats = {
            comprador: `
                <div class="stat-item"><span class="stat-num">${favLength}</span><span class="stat-label">Favoritos</span></div>
                <div class="stat-item"><span class="stat-num">0</span><span class="stat-label">Visitas agendadas</span></div>
                <div class="stat-item"><span class="stat-num">0</span><span class="stat-label">Búsquedas guardadas</span></div>
            `,
            vendedor: `
                <div class="stat-item"><span class="stat-num">${propLength}</span><span class="stat-label">Propiedades activas</span></div>
                <div class="stat-item"><span class="stat-num">0</span><span class="stat-label">Interesados este mes</span></div>
                <div class="stat-item"><span class="stat-num">$0</span><span class="stat-label">Valor en cartera</span></div>
            `,
            agente: `
                <div class="stat-item"><span class="stat-num">0</span><span class="stat-label">Listings activos</span></div>
                <div class="stat-item"><span class="stat-num">${clientLength}</span><span class="stat-label">Clientes activos</span></div>
                <div class="stat-item"><span class="stat-num">$0</span><span class="stat-label">En gestión</span></div>
            `,
            inversionista: `
                <div class="stat-item"><span class="stat-num">8.4%</span><span class="stat-label">ROI promedio</span></div>
                <div class="stat-item"><span class="stat-num">4</span><span class="stat-label">Propiedades</span></div>
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

    function renderPanelComprador() {
        const user = getSession();
        const favs = user.favoritos || [];
        const visitas = user.visitas || [];
        const allProps = window.allProperties || [];

        let favsHtml = `<div class="favorito-empty" style="grid-column: span 2;"><span>🏡</span><p>Aún no tienes favoritos.</p></div>`;
        
        if (favs.length > 0 && allProps.length > 0) {
            favsHtml = favs.map(id => {
                const prop = allProps.find(p => p.id === id);
                if(!prop) return '';
                return `
                    <div class="property-card-small" style="cursor:pointer; margin-bottom:1rem; width:100%" onclick="window.openDetailsModal(${prop.id})">
                        <div class="card-img-small" style="height:150px;">
                            <img src="${prop.image}" alt="${prop.title}">
                        </div>
                        <div class="card-info-small">
                            <h3 style="font-size:1.1rem; margin-bottom:0.2rem;">${prop.price}</h3>
                            <p style="font-size:0.9rem; margin-bottom:0.5rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${prop.title}</p>
                            <div class="card-amenities" style="font-size:0.8rem;">
                                <span>🛏 ${prop.bedrooms}</span>
                                <span>🚿 ${prop.bathrooms}</span>
                                <span>📐 ${prop.area}m²</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        let visitasHtml = `<div class="favorito-empty"><span>🗓</span><p>Aún no tienes visitas agendadas.</p></div>`;
        if (visitas.length > 0 && allProps.length > 0) {
            visitasHtml = visitas.map((v, idx) => {
                const prop = allProps.find(p => p.id === parseInt(v.propertyId));
                const title = prop ? prop.title : `Propiedad #${v.propertyId}`;
                const img = prop ? prop.image : 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=200&q=80';
                return `
                    <div class="visita-card" style="display:flex; gap:1rem; align-items:center; text-align:left; padding:1rem; background:#111; border:1px solid #333; border-radius:8px; margin-bottom:1rem;">
                        <img src="${img}" style="width:80px; height:80px; object-fit:cover; border-radius:4px; cursor:pointer;" onclick="window.openDetailsModal(${v.propertyId})">
                        <div style="flex:1">
                            <h4 style="margin:0 0 0.3rem 0; cursor:pointer;" onclick="window.openDetailsModal(${v.propertyId})">${title}</h4>
                            <p style="margin:0; color:#aaa; font-size:0.9rem">📅 ${v.date} ⏰ ${v.time}</p>
                            <span style="display:inline-block; margin-top:0.3rem; font-size:0.8rem; padding:0.2rem 0.5rem; background:${v.status === 'Cancelada' ? '#550000' : '#B79860'}; color:${v.status === 'Cancelada' ? '#fff' : '#000'}; border-radius:4px;">${v.status || 'Confirmada'}</span>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:0.5rem;">
                            ${v.status !== 'Cancelada' ? `<button class="btn-mp" onclick="window.Account.cancelVisit(${idx})" style="background:#550000; color:white; border:none">Cancelar</button>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        return `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:2rem; width:100%;">
                <div>
                    <div class="panel-header">
                        <h2>MIS VISITAS</h2>
                        <p>Tus citas programadas con agentes.</p>
                    </div>
                    <div class="panel-visitas">
                        ${visitasHtml}
                    </div>
                </div>
                <div>
                    <div class="panel-header">
                        <h2>MIS FAVORITOS</h2>
                        <p>Propiedades que has guardado para revisitar.</p>
                    </div>
                    <div class="panel-favoritos" style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; align-items:start;">
                        ${favsHtml}
                    </div>
                </div>
            </div>
        `;
    }

    function renderPanelVendedor() {
        const user = getSession();
        const propiedades = user.propiedades || [];
        
        const propsHtml = propiedades.length > 0 ? propiedades.map(p => `
            <div class="mi-propiedad-card">
                <div class="mp-header">
                    <h4>${p.titulo}</h4>
                    <span class="mp-status status-activo">Activo</span>
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
        `).join('') : '<p>No tienes propiedades publicadas aún.</p>';

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

    function showPanel(panelId) {
        const el = document.getElementById(panelId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        else document.getElementById('account-panel')?.scrollIntoView({ behavior: 'smooth' });
    }

    function openProfile() {
        const user = getSession();
        if(!user) return;
        document.getElementById('profile-name').value = user.nombre || '';
        document.getElementById('profile-email').value = user.correo || '';
        document.getElementById('profile-phone').value = user.telefono || '';
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
                avatar: nombre.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase(),
                favoritos: [],
                propiedades: [],
                clientes: []
            };
            await setDoc(doc(db, "usuarios", user.uid), userData);
            window.location.href = 'index.html';
        } catch (error) {
            window.isLoggingIn = false;
            alert('Error al registrarse: ' + error.message);
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
                    avatar: (user.displayName || 'U').split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase(),
                    favoritos: [],
                    propiedades: [],
                    clientes: []
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
            if(user) {
                user.nombre = document.getElementById('profile-name').value;
                user.correo = document.getElementById('profile-email').value;
                user.telefono = document.getElementById('profile-phone').value;
                user.avatar = user.nombre.split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase();
                setSession(user);
                applySession();
                document.getElementById('profile-modal').classList.add('hidden');
            }
        });

        document.getElementById('close-publish-modal')?.addEventListener('click', () => {
            document.getElementById('publish-modal').classList.add('hidden');
        });
        document.getElementById('publish-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getSession();
            if(user) {
                const nuevaPropiedad = {
                    id: 'prop_' + Date.now(),
                    titulo: document.getElementById('pub-title').value,
                    precio: document.getElementById('pub-price').value,
                    ubicacion: document.getElementById('pub-location').value
                };
                user.propiedades.push(nuevaPropiedad);
                setSession(user);
                applySession();
                document.getElementById('publish-modal').classList.add('hidden');
                e.target.reset();
            }
        });

        document.getElementById('close-client-modal')?.addEventListener('click', () => {
            document.getElementById('client-modal').classList.add('hidden');
        });
        document.getElementById('client-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = getSession();
            if(user) {
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
            if(user) {
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
                            avatar: (user.displayName || 'U').split(' ').map(n=>n[0]).join('').substring(0, 2).toUpperCase(),
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
        cancelVisit
    };

})();

document.addEventListener('DOMContentLoaded', () => window.Account.init());