import { db } from './firebase-init.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // ELEMENTOS DEL HOME
    // ==========================================
    const propertiesContainer = document.getElementById('properties-container');
    const aiModalTrigger = document.getElementById('trigger-ai-modal');
    const featuredSection = document.querySelector('.featured-section');

    // Sección de todas las propiedades
    const allPropertiesSection = document.getElementById('all-properties-section');
    const fullPropertiesGrid = document.getElementById('full-properties-grid');
    const propertiesSectionTitle = document.getElementById('properties-section-title');
    const btnBackFeatured = document.getElementById('btn-back-featured');

    // Filtros avanzados
    const filterLocation = document.getElementById('filter-location');
    const filterType = document.getElementById('filter-type');
    const filterPriceMin = document.getElementById('filter-price');
    const filterPriceMax = document.getElementById('filter-price-max');
    const btnApplyFilters = document.getElementById('btn-apply-filters');

    // Botones de filtro
    const btnBuy = document.getElementById('btn-buy');
    const btnRent = document.getElementById('btn-rent');
    const btnExplore = document.getElementById('btn-explore');
    const navBuy = document.getElementById('nav-buy');
    const navRent = document.getElementById('nav-rent');
    const navExplore = document.getElementById('nav-explore');

    // Modal de detalles
    const detailsModal = document.getElementById('property-details-modal');
    const closeDetailsModal = document.getElementById('close-details-modal');
    const detailImage = document.getElementById('detail-image');
    const detailStatus = document.getElementById('detail-status');
    const detailType = document.getElementById('detail-type');
    const detailTitle = document.getElementById('detail-title');
    const detailLocation = document.getElementById('detail-location');
    const detailPrice = document.getElementById('detail-price');
    const detailBeds = document.getElementById('detail-beds');
    const detailBaths = document.getElementById('detail-baths');
    const detailArea = document.getElementById('detail-area');
    const detailDesc = document.getElementById('detail-desc');
    const detailTags = document.getElementById('detail-tags');

    // Modal IA
    const aiModal = document.getElementById('ai-modal');
    const closeAiModalBtn = document.getElementById('close-ai-modal');
    const aiSearchInput = document.getElementById('semantic-search');
    const aiSearchBtn = document.getElementById('btn-search-ai');
    const aiResultsContainer = document.getElementById('ai-results-container');

    let allProperties = [];
    let viewTimer = null;
    let currentViewedId = null;

    // ==========================================
    // MAPA SEMÁNTICO — lenguaje natural → tags
    // ==========================================
    const SEMANTIC_MAP = {
        'metro': ['céntrico', 'central'],
        'tranquil': ['tranquilo', 'arbolado', 'familiar'],
        'luz': ['iluminado', 'ventanales'],
        'natural': ['iluminado', 'jardín', 'parques', 'arbolado'],
        'tarde': ['iluminado', 'ventanales'],
        'parque': ['parques', 'jardín', 'arbolado'],
        'familia': ['familia', 'jardín', 'pet friendly', 'tranquilo'],
        'niño': ['familia', 'jardín', 'pet friendly'],
        'mascota': ['pet friendly', 'jardín'],
        'lujo': ['lujo', 'exclusivo', 'minimalista'],
        'modern': ['minimalista', 'domótica', 'inteligente'],
        'inteligent': ['domótica', 'inteligente'],
        'terraza': ['terraza', 'balcón', 'vista'],
        'balcon': ['balcón', 'terraza'],
        'vista': ['vista', 'penthouse', 'lujo'],
        'trabajo': ['coworking', 'estudio', 'céntrico'],
        'nomada': ['nómada', 'coworking', 'amueblado'],
        'amueblad': ['amueblado'],
        'alberca': ['alberca', 'lujo'],
        'pool': ['alberca', 'lujo'],
        'sustentable': ['sustentable'],
        'ecologic': ['sustentable'],
        'industrial': ['industrial', 'loft'],
        'loft': ['loft', 'industrial'],
        'colonial': ['colonial'],
        'seguridad': ['seguridad', 'exclusivo'],
        'privada': ['exclusivo', 'seguridad'],
        'joven': ['joven', 'loft', 'céntrico'],
        'pareja': ['parejas', 'acogedor'],
        'acogedor': ['acogedor', 'parejas'],
        'iluminacion': ['iluminado', 'ventanales'],
        'exclusiv': ['exclusivo', 'lujo', 'seguridad'],
        'minimalista': ['minimalista'],
        'domotica': ['domótica', 'inteligente'],
        'remodelad': ['remodelado'],
        'estudio': ['estudio', 'coworking'],
        'departament': ['departamento'],
        'penthouse': ['penthouse', 'lujo', 'vista'],
        'amplio': ['jardín', 'área'],
        'cocina': ['cocina abierta', 'integral'],
    };

    // ==========================================
    // CARGAR PROPIEDADES
    // ==========================================
    async function loadProperties() {
        try {
            const response = await fetch('properties.json');
            let baseProps = await response.json();

            // Cargar propiedades de la base de datos global de Firestore
            try {
                const globalSnapshot = await getDocs(collection(db, "global_properties"));
                const globalProps = [];
                globalSnapshot.forEach((doc) => {
                    const data = doc.data();
                    globalProps.push({
                        id: data.id || Date.now(),
                        title: data.titulo,
                        price: data.precio,
                        location: data.ubicacion,
                        image: data.image || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
                        status: data.status || 'buy',
                        type: data.type || 'casa',
                        bedrooms: data.bedrooms || 3,
                        bathrooms: data.bathrooms || 2,
                        area: data.area || 250,
                        description: data.description || 'Propiedad publicada recientemente.',
                        tags: ['Nueva', 'Global'],
                        vendedorId: data.vendedorId
                    });
                });

                // Exponer globalProps para stats en Account.js
                window.globalPublishedProps = globalProps;

                // Combinar catálogo con propiedades globales
                baseProps = [...globalProps, ...baseProps];
            } catch (fsErr) {
                console.error("Error al cargar global_properties de Firestore:", fsErr);
            }

            allProperties = baseProps;
            window.allProperties = allProperties;
            renderFeaturedCollection(allProperties);
        } catch (error) {
            console.error("Error al cargar propiedades:", error);
        }
    }

    // Exponer para que account.js pueda llamarlo al resolver el Auth
    window.appLoadProperties = loadProperties;

    // ==========================================
    // COLECCIÓN DESTACADA (1 grande + 2 pequeñas)
    // ==========================================
    function renderFeaturedCollection(properties) {
        if (!propertiesContainer) return;
        propertiesContainer.innerHTML = '';
        if (properties.length < 3) return;

        const featured = properties[0];
        const small1 = properties[1];
        const small2 = properties[2];

        // Verificar si el usuario es agente para mostrar controles extra en tarjetas
        const isAgente = document.body.classList.contains('cuenta-agente');
        const isVendedor = document.body.classList.contains('cuenta-vendedor');
        const session = typeof Account !== 'undefined' ? Account.getSession() : null;

        propertiesContainer.innerHTML = `
            <div class="property-card-large" data-id="${featured.id}" style="cursor:pointer">
                <div class="card-img-large">
                    <div class="badge-black">RECIÉN LISTADA</div>
                    <img src="${featured.image}" alt="${featured.title}">
                    ${isAgente ? `<div class="agente-overlay-btns">
                        <button class="btn-agente-card" onclick="event.stopPropagation();alert('Editando...')">✏ Editar</button>
                        <button class="btn-agente-card" onclick="event.stopPropagation();alert('Ver interesados...')">👥 Interesados</button>
                    </div>` : ''}
                </div>
                <div class="card-info-large">
                    <div class="card-price-row">
                        <h3>${featured.price}</h3>
                        <svg class="heart-icon" viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"
                             onclick="event.stopPropagation(); toggleFavorito(this, ${featured.id})">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </div>
                    <p>${featured.title}, ${featured.location}</p>
                    ${renderInversionistaExtra(featured)}
                    <div class="card-amenities">
                        <span>🛏 ${featured.bedrooms} CAMAS</span>
                        <span>🚿 ${featured.bathrooms} BAÑOS</span>
                        <span>📐 ${featured.area} m²</span>
                    </div>
                </div>
            </div>

            <div class="small-cards-wrapper">
                ${renderSmallCard(small1, isAgente)}
                ${renderSmallCard(small2, isAgente)}
            </div>
        `;

        // Banner de publicar (solo vendedor)
        if (isVendedor) {
            const publishBanner = document.createElement('div');
            publishBanner.className = 'publish-banner';
            publishBanner.innerHTML = `
                <div class="publish-banner-inner">
                    <div>
                        <strong>¿Tienes una propiedad para vender o rentar?</strong>
                        <span>Publica gratis y llega a miles de compradores calificados.</span>
                    </div>
                    <button class="btn-gold" onclick="alert('Abriendo formulario de publicación...')">+ Publicar Propiedad</button>
                </div>
            `;
            propertiesContainer.insertAdjacentElement('afterend', publishBanner);
        }

        attachCardListeners();
    }

    // Tarjeta pequeña con opción de controles de agente
    function renderSmallCard(prop, isAgente) {
        return `
            <div class="property-card-small" data-id="${prop.id}" style="cursor:pointer">
                <div class="card-img-small">
                    <div class="badge-gold">DESTACADA</div>
                    <img src="${prop.image}" alt="${prop.title}">
                    ${isAgente ? `<div class="agente-overlay-btns agente-overlay-sm">
                        <button class="btn-agente-card btn-agente-sm" onclick="event.stopPropagation();alert('Editando...')">✏</button>
                        <button class="btn-agente-card btn-agente-sm" onclick="event.stopPropagation();alert('Interesados...')">👥</button>
                    </div>` : ''}
                </div>
                <div class="card-info-small">
                    <div class="card-price-row">
                        <h4>${prop.price}</h4>
                        <svg class="heart-icon heart-icon-sm" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"
                             onclick="event.stopPropagation(); toggleFavorito(this, ${prop.id})">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                    </div>
                    <p>${prop.title}</p>
                    ${renderInversionistaExtra(prop, true)}
                    <div class="card-amenities-small">
                        <span>${prop.bedrooms} CAMAS</span> • <span>${prop.bathrooms} BAÑOS</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Datos extra visibles solo para inversionistas
    function renderInversionistaExtra(prop, small = false) {
        if (!document.body.classList.contains('cuenta-inversionista')) return '';
        const roi = (6 + Math.random() * 4).toFixed(1);
        const plusvalia = (8 + Math.random() * 8).toFixed(0);
        return `
            <div class="inv-extra ${small ? 'inv-extra-sm' : ''}">
                <span class="inv-tag">ROI est. ${roi}%</span>
                <span class="inv-tag trend-up">+${plusvalia}% plusvalía</span>
                <span class="inv-tag">${formatPrecioM2(prop)} / m²</span>
            </div>
        `;
    }

    function formatPrecioM2(prop) {
        // Extraer número del precio (puede venir como "$4,200,000")
        const num = parseFloat((prop.price || '').replace(/[^0-9.]/g, ''));
        if (!num || !prop.area) return 'N/D';
        return '$' + Math.round(num / prop.area).toLocaleString('es-MX');
    }

    // ==========================================
    // FAVORITOS (solo comprador)
    // ==========================================
    function toggleFavorito(el, id) {
        const accountApi = window.Account || (typeof Account !== 'undefined' ? Account : null);
        const session = accountApi ? accountApi.getSession() : null;
        if (!session) {
            alert('Inicia sesión para guardar favoritos.');
            return;
        }

        if (!session.favoritos) session.favoritos = [];
        const index = session.favoritos.indexOf(id);
        if (index === -1) {
            session.favoritos.push(id);
            el.classList.add('favorited');
            el.style.fill = '#B79860';
            el.style.stroke = '#B79860';
        } else {
            session.favoritos.splice(index, 1);
            el.classList.remove('favorited');
            el.style.fill = 'none';
            el.style.stroke = 'currentColor';
        }

        accountApi.setSession(session);
        accountApi.applySession(); // Re-render stats and panel
    }
    window.toggleFavorito = toggleFavorito;

    // ==========================================
    // SECCIÓN COMPRAR / RENTAR / EXPLORAR
    // ==========================================
    function showSection(type) {
        if (!allPropertiesSection) return;

        [btnBuy, btnRent, btnExplore].forEach(btn => btn?.classList.remove('active'));

        featuredSection.style.display = 'none';
        allPropertiesSection.classList.remove('hidden');

        let filteredProperties = [];

        if (type === 'buy') {
            btnBuy?.classList.add('active');
            propertiesSectionTitle.textContent = "PROPIEDADES EN VENTA";
            filteredProperties = allProperties.filter(p => p.status === 'buy');
        } else if (type === 'rent') {
            btnRent?.classList.add('active');
            propertiesSectionTitle.textContent = "PROPIEDADES EN RENTA";
            filteredProperties = allProperties.filter(p => p.status === 'rent');
        } else {
            btnExplore?.classList.add('active');
            propertiesSectionTitle.textContent = "TODAS LAS PROPIEDADES";
            filteredProperties = allProperties;
        }

        renderFullProperties(filteredProperties);
    }

    // Mapa de propiedades simuladas para poder abrirlas desde click
    const _simPropsMap = {};

    function renderFullProperties(properties) {
        fullPropertiesGrid.innerHTML = '';
        const isAgente = document.body.classList.contains('cuenta-agente');

        properties.forEach(prop => {
            const isSim = prop.isSimulated;
            // Guardar simuladas para poder abrirlas por ID
            if (isSim) _simPropsMap[String(prop.id)] = prop;

            const simBadge = isSim
                ? `<div class="badge-sim-ai">✦ IA</div>`
                : `<div class="badge-${prop.status === 'buy' ? 'gold' : 'black'}">${prop.status === 'buy' ? 'EN VENTA' : 'EN RENTA'}</div>`;

            fullPropertiesGrid.innerHTML += `
                <div class="property-card-small" data-id="${prop.id}" data-sim="${isSim ? '1' : '0'}" style="cursor:pointer">
                    <div class="card-img-small">
                        ${simBadge}
                        <img src="${prop.image}" alt="${prop.title}">
                        ${isAgente && !isSim ? `<div class="agente-overlay-btns agente-overlay-sm">
                            <button class="btn-agente-card btn-agente-sm" onclick="event.stopPropagation();alert('Editando...')">✏</button>
                            <button class="btn-agente-card btn-agente-sm" onclick="event.stopPropagation();alert('Interesados...')">👥</button>
                        </div>` : ''}
                    </div>
                    <div class="card-info-small">
                        <div class="card-price-row">
                            <h4>${prop.price}</h4>
                            ${!isSim ? `<svg class="heart-icon heart-icon-sm" viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"
                                 onclick="event.stopPropagation(); toggleFavorito(this, ${prop.id})">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>` : ''}
                        </div>
                        <p>${prop.title}</p>
                        ${!isSim ? renderInversionistaExtra(prop, true) : ''}
                        <div class="card-amenities-small">
                            <span>${prop.bedrooms} CAMAS</span> • <span>${prop.bathrooms} BAÑOS</span>
                            ${prop.area ? ` • <span>${prop.area} m²</span>` : ''}
                        </div>
                        ${isSim ? `<p class="sim-location-tag">📍 ${prop.location}</p>` : ''}
                    </div>
                </div>
            `;
        });

        // Listeners: real → openDetailsModal, simulada → showSimulatedDetail
        fullPropertiesGrid.querySelectorAll('.property-card-small').forEach(card => {
            card.onclick = () => {
                const id = card.dataset.id;
                const sim = card.dataset.sim === '1';
                if (sim) {
                    const prop = _simPropsMap[id];
                    if (prop) {
                        window._setOpenedFromAI?.(false); // venimos de la sección normal, no del modal IA
                        showSimulatedDetail(prop);
                    }
                } else {
                    openDetailsModal(Number(id));
                }
            };
        });
    }

    function showFeaturedSection() {
        allPropertiesSection.classList.add('hidden');
        featuredSection.style.display = 'block';
        [btnBuy, btnRent, btnExplore].forEach(btn => btn?.classList.remove('active'));
        btnBuy?.classList.add('active');
    }

    // Event listeners de filtros
    btnBuy?.addEventListener('click', () => showSection('buy'));
    btnRent?.addEventListener('click', () => showSection('rent'));
    btnExplore?.addEventListener('click', () => showSection('explore'));
    navBuy?.addEventListener('click', (e) => { e.preventDefault(); showSection('buy'); });
    navRent?.addEventListener('click', (e) => { e.preventDefault(); showSection('rent'); });
    navExplore?.addEventListener('click', (e) => { e.preventDefault(); showSection('explore'); });
    btnBackFeatured?.addEventListener('click', showFeaturedSection);

    // Lógica de Filtros Avanzados
    btnApplyFilters?.addEventListener('click', () => {
        const locValue = filterLocation?.value || '';
        const typeValue = filterType?.value || '';
        const minPrice = parseFloat(filterPriceMin?.value) || 0;
        const maxPrice = parseFloat(filterPriceMax?.value) || Infinity;

        const loc = locValue.toLowerCase();
        const type = typeValue.toLowerCase();

        // Ocultar destacadas y mostrar sección de resultados
        featuredSection.style.display = 'none';
        allPropertiesSection.classList.remove('hidden');
        propertiesSectionTitle.textContent = 'RESULTADOS DE BÚSQUEDA';
        [btnBuy, btnRent, btnExplore].forEach(btn => btn?.classList.remove('active'));

        // --- Alias de ubicaciones ---
        const LOCATION_ALIASES = {
            'cdmx': ['cdmx', 'ciudad de méxico', 'ciudad de mexico'],
            'monterrey': ['monterrey'],
            'guadalajara': ['guadalajara'],
            'tijuana': ['tijuana'],
            'puebla': ['puebla'],
            'querétaro': ['querétaro', 'queretaro'],
            'mérida': ['mérida', 'merida'],
            'león': ['león', 'leon'],
            'cancún': ['cancún', 'cancun'],
            'san luis potosí': ['san luis potosí', 'san luis potosi'],
            'aguascalientes': ['aguascalientes'],
            'hermosillo': ['hermosillo'],
            'chihuahua': ['chihuahua'],
            'saltillo': ['saltillo'],
            'morelia': ['morelia'],
            'culiacán': ['culiacán', 'culiacan'],
            'veracruz': ['veracruz'],
            'oaxaca': ['oaxaca'],
        };

        // --- Filtrar propiedades reales del catálogo ---
        const realMatches = allProperties.filter(prop => {
            const propLoc = (prop.location || '').toLowerCase();
            const propType = (prop.type || '').toLowerCase();
            const propPrice = parseFloat((prop.price || '').replace(/[^0-9.]/g, '')) || 0;

            if (loc) {
                const aliases = LOCATION_ALIASES[loc] || [loc];
                const locMatch = aliases.some(alias => propLoc.includes(alias));
                if (!locMatch) return false;
            }
            if (type && !propType.includes(type)) return false;
            if (propPrice < minPrice || propPrice > maxPrice) return false;
            return true;
        });

        // --- Generar propiedades simuladas con los mismos filtros ---
        // Construir query en lenguaje natural a partir de los selects
        const cityLabel = filterLocation?.options[filterLocation.selectedIndex]?.text || locValue;
        const typeLabel = typeValue || 'propiedad';
        const priceLabel = minPrice > 0 ? `precio entre $${minPrice.toLocaleString('es-MX')} y $${maxPrice === Infinity ? '∞' : maxPrice.toLocaleString('es-MX')} MXN` : '';
        const queryStr = [typeLabel, cityLabel ? `en ${cityLabel}` : '', priceLabel].filter(Boolean).join(' ');

        let simulated = generateSimulatedProperties(queryStr);

        // Filtrar simuladas por precio (si hay límites)
        simulated = simulated.filter(prop => {
            const propPrice = parseFloat((prop.price || '').replace(/[^0-9.]/g, '')) || 0;
            if (minPrice > 0 && propPrice < minPrice) return false;
            if (maxPrice < Infinity && propPrice > maxPrice) return false;
            return true;
        });

        // Ajustar la cantidad de simuladas: si ya hay reales, agregar solo 4 sim; si no hay, agregar 6
        const simCount = realMatches.length > 0 ? 4 : 6;
        const combined = [...realMatches, ...simulated.slice(0, simCount)];

        if (combined.length === 0) {
            fullPropertiesGrid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:3rem;color:#aaa;">
                    <p style="font-size:1.1rem;">No encontramos propiedades con esos filtros.</p>
                    <p style="font-size:0.85rem;margin-top:0.5rem;">Intenta cambiar la ciudad o el rango de precio.</p>
                </div>`;
            allPropertiesSection.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        renderFullProperties(combined);
        allPropertiesSection.scrollIntoView({ behavior: 'smooth' });
    });

    // ==========================================
    // MODAL DE DETALLES
    // ==========================================
    function attachCardListeners() {
        const cards = document.querySelectorAll('.property-card-large, .property-card-small, .match-card');
        cards.forEach(card => {
            // Usar onclick para evitar duplicados si se llama múltiples veces
            card.onclick = () => {
                const id = parseInt(card.getAttribute('data-id'));
                if (id) openDetailsModal(id);
            };
        });
    }

    // Exponer para que account.js pueda abrir el modal
    window.openDetailsModal = openDetailsModal;

    function openDetailsModal(id) {
        const prop = allProperties.find(p => p.id === id);
        if (!prop) return;

        detailImage.src = prop.image;
        detailStatus.textContent = prop.status === 'buy' ? 'EN VENTA' : 'EN RENTA';
        detailStatus.className = prop.status === 'buy' ? 'badge-gold' : 'badge-black';
        detailType.textContent = prop.type?.toUpperCase() || '';
        detailTitle.textContent = prop.title;
        detailLocation.textContent = prop.location;
        detailPrice.textContent = prop.price;
        detailBeds.textContent = prop.bedrooms;
        detailBaths.textContent = prop.bathrooms;
        detailArea.textContent = prop.area;
        detailDesc.textContent = prop.description;
        detailTags.innerHTML = (prop.tags || []).map(tag => `<span>${tag}</span>`).join('');

        // Botón de acción varía por tipo de cuenta
        const actionBtn = document.querySelector('.detail-action-btn');
        if (actionBtn) {
            const isAgente = document.body.classList.contains('cuenta-agente');
            const isVendedor = document.body.classList.contains('cuenta-vendedor');
            const session = window.Account ? window.Account.getSession() : null;

            if (isAgente) {
                actionBtn.textContent = 'Gestionar Propiedad';
                actionBtn.onclick = () => alert('Panel de gestión...');
            } else if (isVendedor) {
                actionBtn.textContent = 'Editar Publicación';
                actionBtn.onclick = () => alert('Editando publicación...');
            } else {
                actionBtn.textContent = '🗓 Agendar Cita';
                actionBtn.onclick = () => {
                    if (!session) {
                        alert('Por favor, inicia sesión para agendar una cita.');
                        window.location.href = 'login.html';
                        return;
                    }
                    // Poblar el modal con datos de la propiedad
                    document.getElementById('visit-property-id').value = id;
                    document.getElementById('visit-property-title').textContent = prop.title;
                    const imgEl = document.getElementById('visit-property-img');
                    if (imgEl) imgEl.src = prop.image;
                    const priceEl = document.getElementById('visit-property-price');
                    if (priceEl) priceEl.textContent = prop.price;
                    // Resetear selección previa
                    document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
                    document.getElementById('visit-time').value = '';
                    document.getElementById('visit-date').value = '';
                    const confirmBtn = document.getElementById('btn-confirm-visit');
                    if (confirmBtn) confirmBtn.disabled = true;
                    // Mostrar modal
                    document.getElementById('visit-modal').classList.remove('hidden');
                    detailsModal.classList.add('hidden');
                };
            }
        }

        startViewTimer(id);
        detailsModal.classList.remove('hidden');
    }

    // Flag: se abrió el detalle desde el modal de IA?
    let _openedFromAI = false;

    closeDetailsModal?.addEventListener('click', () => {
        clearViewTimer();
        detailsModal.classList.add('hidden');
        // Si el detalle se abrió desde la búsqueda IA, regresa a ella
        if (_openedFromAI) {
            _openedFromAI = false;
            aiModal?.classList.remove('hidden');
        }
    });

    // Exportar el flag para que showSimulatedDetail pueda activarlo
    window._setOpenedFromAI = (val) => { _openedFromAI = val; };

    // ==========================================
    // MODAL DE BÚSQUEDA IA
    // ==========================================
    if (aiModalTrigger && aiModal) {
        aiModalTrigger.addEventListener('click', () => {
            aiModal.classList.remove('hidden');
            setTimeout(() => aiSearchInput?.focus(), 100);
            if (aiResultsContainer) {
                aiResultsContainer.innerHTML = `
                    <div style="padding:2rem;color:#666;grid-column:span 2;">
                        Escribe una descripción para ver coincidencias con IA...
                    </div>
                `;
            }
        });

        closeAiModalBtn?.addEventListener('click', () => aiModal.classList.add('hidden'));
    }

    function normalize(str) {
        return (str || '').toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    // ==========================================
    // GENERADOR DE PROPIEDADES SIMULADAS
    // ==========================================
    function generateSimulatedProperties(query) {
        const q = normalize(query);

        // --- Ciudades con colonias y multiplicador de precio ---
        const CITY_DATA = {
            'cdmx': { name: 'CDMX', neighborhoods: ['Polanco', 'Condesa', 'Roma Norte', 'Santa Fe', 'Lomas de Chapultepec', 'Del Valle', 'Narvarte', 'Interlomas'], m: 1.25 },
            'ciudad de mexic': { name: 'CDMX', neighborhoods: ['Polanco', 'Condesa', 'Roma Norte', 'Santa Fe', 'Lomas de Chapultepec', 'Del Valle'], m: 1.25 },
            'monterrey': { name: 'Monterrey', neighborhoods: ['San Pedro', 'Cumbres', 'Valle', 'Zona Tec', 'Contry', 'Cintermex', 'Chipinque'], m: 1.05 },
            'guadalajara': { name: 'Guadalajara', neighborhoods: ['Zapopan', 'Chapalita', 'Puerta de Hierro', 'Andares', 'Providencia', 'Tlaquepaque'], m: 0.95 },
            'cancun': { name: 'Cancún', neighborhoods: ['Zona Hotelera', 'Puerto Cancún', 'Pok-Ta-Pok', 'El Naranjal', 'SM 35'], m: 1.15 },
            'queretaro': { name: 'Querétaro', neighborhoods: ['Juriquilla', 'El Campanario', 'Zibatá', 'Centro Histórico', 'Américas'], m: 0.88 },
            'merida': { name: 'Mérida', neighborhoods: ['Altabrisa', 'Norte', 'Santa Gertrudis', 'Montejo', 'Itzimná'], m: 0.82 },
            'tijuana': { name: 'Tijuana', neighborhoods: ['Zona Río', 'Playas de Tijuana', 'Otay', 'Las Lomas', 'Cañadas'], m: 0.90 },
            'puebla': { name: 'Puebla', neighborhoods: ['Angelópolis', 'Lomas de Angelópolis', 'Centro', 'San Andrés Cholula'], m: 0.82 },
            'leon': { name: 'León', neighborhoods: ['Campestre', 'La Cañada', 'Jardines del Moral', 'Lomas del Campestre'], m: 0.85 },
            'oaxaca': { name: 'Oaxaca', neighborhoods: ['Jalatlaco', 'San Felipe del Agua', 'Centro Histórico', 'Reforma'], m: 0.78 },
            'veracruz': { name: 'Veracruz', neighborhoods: ['Boca del Río', 'Costa de Oro', 'Fracc. Geranios', 'Puerto'], m: 0.72 },
        };

        let city = CITY_DATA['cdmx']; // default
        for (const [key, val] of Object.entries(CITY_DATA)) {
            if (q.includes(key)) { city = val; break; }
        }

        // --- Tipo de propiedad ---
        let pType = 'Departamento';
        if (q.includes('casa') || q.includes('chalet')) pType = 'Casa';
        else if (q.includes('penthouse') || q.includes('atico')) pType = 'Penthouse';
        else if (q.includes('villa')) pType = 'Villa';
        else if (q.includes('loft')) pType = 'Loft';
        else if (q.includes('estudio')) pType = 'Estudio';

        // --- Features detectadas ---
        const f = {
            lujo: q.includes('lujo') || q.includes('exclusiv') || q.includes('premium'),
            moderno: q.includes('modern') || q.includes('contemporan') || q.includes('minimalista'),
            colonial: q.includes('colonial') || q.includes('historic') || q.includes('tradicional'),
            alberca: q.includes('alberca') || q.includes('piscina') || q.includes('pool'),
            jardin: q.includes('jardin') || q.includes('garden') || q.includes('patio'),
            terraza: q.includes('terraza') || q.includes('balcon') || q.includes('rooftop'),
            luz: q.includes('luz') || q.includes('iluminad') || q.includes('ventanal'),
            familiar: q.includes('famil') || q.includes('nino') || q.includes('hijo'),
            pet: q.includes('mascota') || q.includes('perro') || q.includes('pet'),
            centrico: q.includes('metro') || q.includes('centrico') || q.includes('transport'),
            tranquil: q.includes('tranquil') || q.includes('silencio') || q.includes('arbolad'),
            nomada: q.includes('nomada') || q.includes('remoto') || q.includes('coworking'),
        };
        const isRent = q.includes('rent') || q.includes('alquil') || q.includes('arriend') || q.includes('/mes');

        // --- Pool de imágenes según tipo y estilo ---
        const IMG = {
            lujo: [
                'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1613490493576-7fde63acd811?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop',
            ],
            casa: [
                'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1598228723793-52759bba239c?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=1200&auto=format&fit=crop',
            ],
            departamento: [
                'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1502672260266-1c1e5250ad11?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?q=80&w=1200&auto=format&fit=crop',
            ],
            loft: [
                'https://images.unsplash.com/photo-1536376517310-b40a49e74f5c?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1200&auto=format&fit=crop',
            ],
            colonial: [
                'https://images.unsplash.com/photo-1599427303058-f04cbcf4756f?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1596436889106-be35e843f974?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?q=80&w=1200&auto=format&fit=crop',
            ],
            playa: [
                'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1200&auto=format&fit=crop',
                'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?q=80&w=1200&auto=format&fit=crop',
            ],
        };

        // Elegir pool de imágenes
        let imgPool = IMG.departamento;
        if (f.lujo || pType === 'Penthouse' || pType === 'Villa') imgPool = IMG.lujo;
        else if (pType === 'Casa') imgPool = IMG.casa;
        else if (pType === 'Loft' || pType === 'Estudio') imgPool = IMG.loft;
        else if (f.colonial) imgPool = IMG.colonial;
        else if (normalize(city.name).includes('cancun') || normalize(city.name).includes('veracruz')) imgPool = IMG.playa;

        // --- Utilidades ---
        const rand = arr => arr[Math.floor(Math.random() * arr.length)];
        const rInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
        const fmtMX = n => '$' + Math.round(n).toLocaleString('es-MX') + ' MXN';

        // --- Tamaños / cuartos según tipo ---
        const SIZES = {
            'Departamento': { beds: [2, 3], baths: [2, 2.5], area: [80, 150] },
            'Casa': { beds: [3, 4, 5], baths: [3, 4], area: [180, 380] },
            'Penthouse': { beds: [3, 4], baths: [3, 4], area: [200, 320] },
            'Villa': { beds: [4, 5, 6], baths: [4, 5], area: [350, 700] },
            'Loft': { beds: [1], baths: [1, 1.5], area: [50, 95] },
            'Estudio': { beds: [1], baths: [1], area: [35, 65] },
        };
        const sz = SIZES[pType] || SIZES['Departamento'];

        // --- Precios base ---
        const BASE = {
            'Departamento': { buy: 2_800_000, rent: 18_000 },
            'Casa': { buy: 4_800_000, rent: 35_000 },
            'Penthouse': { buy: 6_500_000, rent: 58_000 },
            'Villa': { buy: 9_000_000, rent: 80_000 },
            'Loft': { buy: 2_200_000, rent: 15_000 },
            'Estudio': { buy: 1_500_000, rent: 11_000 },
        };
        const baseP = BASE[pType] || BASE['Departamento'];
        const luxMult = f.lujo ? 1.55 : 1;

        // --- Adjetivos y descriptores ---
        const ADJS = f.lujo ? ['Exclusivo', 'Premium', 'De Lujo', 'Elite', 'Espectacular']
            : f.moderno ? ['Moderno', 'Contemporáneo', 'Minimalista', 'Vanguardista']
                : f.colonial ? ['Colonial', 'Clásico', 'Histórico', 'Patrimonial']
                    : f.tranquil ? ['Acogedor', 'Tranquilo', 'Privado', 'Sereno']
                        : ['Luminoso', 'Elegante', 'Cómodo', 'Sofisticado'];

        // --- Tags ---
        const tags = [];
        if (f.lujo) tags.push('lujo', 'exclusivo');
        if (f.moderno) tags.push('moderno', 'minimalista');
        if (f.colonial) tags.push('colonial');
        if (f.alberca) tags.push('alberca');
        if (f.jardin) tags.push('jardín');
        if (f.terraza) tags.push('terraza');
        if (f.luz) tags.push('iluminado', 'ventanales');
        if (f.familiar) tags.push('familia', 'pet friendly');
        if (f.pet) tags.push('pet friendly');
        if (f.centrico) tags.push('céntrico');
        if (f.tranquil) tags.push('tranquilo', 'arbolado');
        if (f.nomada) tags.push('amueblado', 'coworking');
        if (!tags.length) tags.push('moderno', 'iluminado');

        // --- Generar 4 propiedades ---
        const results = [];
        const usedNeighborhoods = new Set();
        const usedImages = new Set();

        for (let i = 0; i < 4; i++) {
            // Colonia única
            const available = city.neighborhoods.filter(n => !usedNeighborhoods.has(n));
            const hood = available.length ? rand(available) : rand(city.neighborhoods);
            usedNeighborhoods.add(hood);

            // Imagen única dentro del pool
            const availImgs = imgPool.filter(im => !usedImages.has(im));
            const img = availImgs.length ? rand(availImgs) : rand(imgPool);
            usedImages.add(img);

            const adj = rand(ADJS);
            const beds = rand(sz.beds);
            const baths = rand(sz.baths);
            const area = rInt(sz.area[0], sz.area[1]);
            const variance = 0.88 + Math.random() * 0.24;
            const rawP = baseP[isRent ? 'rent' : 'buy'] * city.m * luxMult * variance;
            const price = isRent ? `${fmtMX(rawP)} / mes` : fmtMX(rawP);
            const matchPercent = Math.max(72, 98 - i * 6 - rInt(0, 4));

            // Descripción dinámica
            const featurePhrases = [
                f.alberca ? 'alberca privada' : null,
                f.jardin ? 'jardín amplio' : null,
                f.terraza ? 'terraza panorámica' : null,
                f.luz ? 'excepcional iluminación natural' : null,
                f.centrico ? 'acceso inmediato al transporte' : null,
                f.tranquil ? 'calle tranquila y arbolada' : null,
                f.nomada ? 'amueblado y con coworking' : null,
                f.pet ? 'pet friendly' : null,
            ].filter(Boolean);
            const featStr = featurePhrases.length
                ? featurePhrases.slice(0, 2).join(', ') + '. '
                : '';
            const descs = [
                `${adj} ${pType.toLowerCase()} en ${hood}, ${city.name}. ${featStr}Acabados de primer nivel y diseño ${f.moderno ? 'contemporáneo' : f.colonial ? 'colonial restaurado' : 'sofisticado'}. Seguridad 24/7.`,
                `Impresionante ${pType.toLowerCase()} ${adj.toLowerCase()} en la zona de ${hood}. ${featStr}Ideal para ${f.familiar ? 'familias' : f.nomada ? 'nómadas digitales' : 'profesionales exigentes'}. Amenidades completas.`,
                `${pType} ${adj.toLowerCase()} con ${area} m² en ${hood}, ${city.name}. ${featStr}Diseño ${f.lujo ? 'de lujo con materiales importados' : 'funcional y moderno'}. Lista para habitar.`,
                `Exclusiva oportunidad en ${hood}: ${pType.toLowerCase()} ${adj.toLowerCase()} con ${beds} recámara${beds > 1 ? 's' : ''} y ${area} m². ${featStr}Ubicación privilegiada en ${city.name}.`,
            ];

            results.push({
                id: `sim_${Date.now()}_${i}`,
                title: `${adj} ${pType} en ${hood}`,
                type: pType,
                price,
                status: isRent ? 'rent' : 'buy',
                location: `${hood}, ${city.name}`,
                bedrooms: beds,
                bathrooms: baths,
                area,
                image: img,
                description: descs[i],
                tags: [...tags],
                matchPercent,
                isSimulated: true,
            });
        }
        return results;
    }

    // ==========================================
    // BÚSQUEDA SEMÁNTICA (mejorada con simulación)
    // ==========================================
    function performAISearch(query) {
        if (!query.trim()) return;

        const normQuery = normalize(query);
        const words = normQuery.split(/\s+/).filter(w => w.length > 2);

        // Expandir con mapa semántico
        const expandedTags = new Set(words);
        words.forEach(word => {
            Object.keys(SEMANTIC_MAP).forEach(key => {
                if (normalize(key).includes(word) || word.includes(normalize(key))) {
                    SEMANTIC_MAP[key].forEach(tag => expandedTags.add(normalize(tag)));
                }
            });
        });

        // Buscar coincidencias reales del catálogo
        const realMatches = allProperties.map(prop => {
            const searchSpace = normalize(
                `${prop.title} ${prop.description} ${(prop.tags || []).join(' ')} ${prop.location} ${prop.type}`
            );
            let score = 0;
            expandedTags.forEach(tag => { if (tag.length > 2 && searchSpace.includes(tag)) score += 18; });
            words.forEach(word => { if (word.length > 3 && searchSpace.includes(word)) score += 10; });
            return { ...prop, matchPercent: Math.min(95, score) };
        })
            .filter(p => p.matchPercent > 0)
            .sort((a, b) => b.matchPercent - a.matchPercent)
            .slice(0, 2);

        // Generar propiedades simuladas por IA
        const simulated = generateSimulatedProperties(query);

        // Combinar: simuladas primero (más relevantes), luego reales del catálogo
        const combined = [...simulated, ...realMatches];
        renderAIResults(combined, query);
    }

    function renderAIResults(results, query = '') {
        if (!aiResultsContainer) return;
        aiResultsContainer.innerHTML = '';

        results.forEach(prop => {
            const simBadge = prop.isSimulated
                ? `<span class="sim-badge">✦ GENERADO POR IA</span>`
                : `<span class="sim-badge sim-badge-real">✓ CATÁLOGO</span>`;

            aiResultsContainer.innerHTML += `
                <div class="match-card" data-id="${prop.id}">
                    <div class="match-img-wrap">
                        <img src="${prop.image}" alt="${prop.title}" class="match-img">
                        ${simBadge}
                    </div>
                    <div class="match-info">
                        <div class="match-percent-bar">
                            <div class="match-percent-fill" style="width:${prop.matchPercent}%"></div>
                        </div>
                        <h5>${prop.matchPercent}% COINCIDENCIA</h5>
                        <h4>${prop.title}</h4>
                        <p class="match-location">📍 ${prop.location}</p>
                        <p class="match-price-ai">${prop.price}</p>
                        <p class="match-tags">${(prop.tags || []).slice(0, 3).join(' · ')}</p>
                    </div>
                </div>
            `;
        });

        // Panel visible + ocultar sugerencias
        const panel = document.getElementById('ai-results-panel');
        const suggestions = document.getElementById('ai-suggestions');
        if (panel) panel.style.display = 'block';
        if (suggestions) suggestions.style.display = 'none';

        // Badge ciudad detectada
        const cityTag = document.getElementById('ai-matches-city');
        if (cityTag) {
            const CITIES = ['CDMX', 'Monterrey', 'Guadalajara', 'Cancún', 'Querétaro', 'Mérida', 'Tijuana', 'León', 'Puebla', 'Oaxaca', 'Veracruz'];
            const detected = CITIES.find(c => query.toLowerCase().includes(c.toLowerCase()));
            cityTag.textContent = detected ? `📍 ${detected}` : '';
        }

        // Botón guardar búsqueda
        const saveBtn = document.getElementById('btn-save-search');
        if (saveBtn && query.trim() && results.length > 0) {
            const session = (window.Account || {}).getSession?.();
            if (session) {
                const alreadySaved = (session.busquedasGuardadas || []).includes(query);
                saveBtn.style.display = 'inline-flex';
                saveBtn.textContent = alreadySaved ? '✅ Guardada' : '🔖 Guardar búsqueda';
                saveBtn.disabled = alreadySaved;
                saveBtn.onclick = () => window.Account.saveSearch(query);
            } else {
                if (saveBtn) saveBtn.style.display = 'none';
            }
        }

        // Abrir detalles al hacer clic en una tarjeta del resultado IA
        document.querySelectorAll('.match-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                window._setOpenedFromAI?.(true);   // marcar: venimos del modal IA
                if (String(id).startsWith('sim_')) {
                    const prop = results.find(p => String(p.id) === id);
                    if (prop) showSimulatedDetail(prop);
                } else {
                    aiModal?.classList.add('hidden');
                    openDetailsModal(Number(id));
                }
            });
        });
    }

    // Muestra detalles de una propiedad simulada (reutiliza el modal existente)
    function showSimulatedDetail(prop) {
        const detailsModal = document.getElementById('property-details-modal');
        if (!detailsModal) return;
        document.getElementById('detail-image').src = prop.image;
        document.getElementById('detail-title').textContent = prop.title;
        document.getElementById('detail-location').textContent = prop.location;
        document.getElementById('detail-price').textContent = prop.price;
        document.getElementById('detail-type').textContent = prop.type;
        document.getElementById('detail-status').textContent = prop.status === 'rent' ? 'EN RENTA' : 'EN VENTA';
        document.getElementById('detail-beds').textContent = prop.bedrooms;
        document.getElementById('detail-baths').textContent = prop.bathrooms;
        document.getElementById('detail-area').textContent = prop.area;
        const descEl = document.getElementById('detail-desc');
        if (descEl) descEl.textContent = prop.description;
        const tagsEl = document.getElementById('detail-tags');
        if (tagsEl) tagsEl.innerHTML = (prop.tags || []).map(t => `<span>${t}</span>`).join('');
        // Ocultar modal IA y mostrar detalle
        document.getElementById('ai-modal').classList.add('hidden');
        // El flag _openedFromAI ya fue activado antes de llamar a esta función
        detailsModal.classList.remove('hidden');
    }

    aiSearchBtn?.addEventListener('click', () => performAISearch(aiSearchInput?.value || ''));
    aiSearchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performAISearch(aiSearchInput.value);
    });

    // ==========================================
    // TIMER DE VISUALIZACIÓN (> 30 segundos)
    // ==========================================
    function startViewTimer(id) {
        clearViewTimer();
        currentViewedId = id;
        viewTimer = setTimeout(() => recordView(id), 30000);
    }

    function clearViewTimer() {
        if (viewTimer) { clearTimeout(viewTimer); viewTimer = null; }
        currentViewedId = null;
    }

    async function recordView(id) {
        const accountApi = window.Account || (typeof Account !== 'undefined' ? Account : null);
        const session = accountApi ? accountApi.getSession() : null;
        if (!session) return;
        if (!session.historial) session.historial = [];
        if (!session.historial.includes(id)) {
            session.historial.push(id);
            await accountApi.setSession(session);
            console.log(`[IA] Propiedad ${id} registrada en historial (>30s)`);
        }
    }

    // ==========================================
    // MOTOR DE RECOMENDACIONES (content-based)
    // ==========================================
    function getRecommendations() {
        const session = (window.Account || {}).getSession?.();
        if (!session) return [];

        const seenIds = new Set([
            ...(session.favoritos || []),
            ...(session.historial || [])
        ]);
        if (seenIds.size === 0) return [];

        // Construir perfil de tags del usuario
        const tagFreq = {};
        seenIds.forEach(id => {
            const prop = allProperties.find(p => p.id === id);
            if (!prop) return;
            (prop.tags || []).forEach(tag => {
                const key = normalize(tag);
                tagFreq[key] = (tagFreq[key] || 0) + 1;
            });
        });

        const totalWeight = Object.values(tagFreq).reduce((a, b) => a + b, 0);
        if (totalWeight === 0) return [];

        return allProperties
            .filter(p => !seenIds.has(p.id))
            .map(prop => {
                let score = 0;
                (prop.tags || []).forEach(tag => {
                    score += tagFreq[normalize(tag)] || 0;
                });
                const pct = Math.round((score / totalWeight) * 100);
                return { ...prop, matchPercent: Math.min(98, pct > 0 ? 60 + pct : 0), rawScore: score };
            })
            .filter(p => p.rawScore > 0)
            .sort((a, b) => b.rawScore - a.rawScore)
            .slice(0, 4);
    }
    window.getRecommendations = getRecommendations;

    // ==========================================
    // INICIALIZAR
    // ==========================================
    // Habilitar botón confirmar cuando se seleccione fecha y hora
    document.getElementById('visit-date')?.addEventListener('change', () => {
        const time = document.getElementById('visit-time')?.value;
        const confirmBtn = document.getElementById('btn-confirm-visit');
        if (confirmBtn) confirmBtn.disabled = !time;
    });

    loadProperties();
});

// Fuera del DOMContentLoaded para ser accesible desde onclick en el HTML
window.selectTimeSlot = function (time, btn) {
    document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('visit-time').value = time;
    // Habilitar confirmar solo si también hay fecha
    const date = document.getElementById('visit-date')?.value;
    const confirmBtn = document.getElementById('btn-confirm-visit');
    if (confirmBtn) confirmBtn.disabled = !date;
};

// Agrega la ciudad al campo de búsqueda y activa el chip visualmente
window.appendCityToSearch = function (city) {
    const input = document.getElementById('semantic-search');
    if (!input) return;
    // Quitar ciudad previa si ya hay una
    const CITIES = ['CDMX', 'Monterrey', 'Guadalajara', 'Cancún', 'Querétaro', 'Mérida', 'Tijuana', 'León', 'Puebla', 'Oaxaca', 'Veracruz', 'Puebla', 'San Luis Potosí', 'Aguascalientes', 'Chihuahua', 'Saltillo'];
    let current = input.value;
    CITIES.forEach(c => { current = current.replace(` en ${c}`, '').replace(` ${c}`, '').trim(); });
    input.value = current ? `${current} en ${city}` : `en ${city}`;
    // Marcar chip activo
    document.querySelectorAll('.ai-city-chip').forEach(chip => {
        chip.classList.toggle('active-city', chip.textContent.includes(city));
    });
    input.focus();
};

// Ejecuta una búsqueda de sugerencia directamente
window.runSuggestion = function (btn) {
    const query = btn.textContent.trim();
    const input = document.getElementById('semantic-search');
    if (input) input.value = query;
    // Resaltar ciudad si está en la sugerencia
    const CITIES = ['CDMX', 'Monterrey', 'Guadalajara', 'Cancún', 'Querétaro', 'Mérida', 'Tijuana', 'León'];
    const found = CITIES.find(c => query.toLowerCase().includes(c.toLowerCase()));
    if (found) {
        document.querySelectorAll('.ai-city-chip').forEach(chip => {
            chip.classList.toggle('active-city', chip.textContent.includes(found));
        });
    }
    // Ejecutar búsqueda IA
    if (typeof performAISearch === 'function') {
        performAISearch(query);
    } else {
        document.getElementById('btn-search-ai')?.click();
    }
};