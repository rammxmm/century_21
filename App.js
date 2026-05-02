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

    // ==========================================
    // CARGAR PROPIEDADES
    // ==========================================
    async function loadProperties() {
        try {
            const response = await fetch('properties.json');
            let baseProps = await response.json();

            // Usa window.Account si Account no está en el scope local
            const accountApi = window.Account || (typeof Account !== 'undefined' ? Account : null);
            const session = accountApi ? accountApi.getSession() : null;

            if (session && session.propiedades) {
                const extraProps = session.propiedades.map(p => ({
                    id: p.id,
                    title: p.titulo,
                    price: p.precio,
                    location: p.ubicacion,
                    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
                    status: 'buy',
                    type: 'casa',
                    bedrooms: 3,
                    bathrooms: 2,
                    area: 250,
                    description: 'Propiedad publicada recientemente.',
                    tags: ['Nueva', 'Exclusiva']
                }));
                baseProps = [...extraProps, ...baseProps];
            }

            allProperties = baseProps;
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
                    <h4>${prop.price}</h4>
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

    function renderFullProperties(properties) {
        fullPropertiesGrid.innerHTML = '';
        const isAgente = document.body.classList.contains('cuenta-agente');

        properties.forEach(prop => {
            fullPropertiesGrid.innerHTML += `
                <div class="property-card-small" data-id="${prop.id}" style="cursor:pointer">
                    <div class="card-img-small">
                        <div class="badge-${prop.status === 'buy' ? 'gold' : 'black'}">${prop.status === 'buy' ? 'EN VENTA' : 'EN RENTA'}</div>
                        <img src="${prop.image}" alt="${prop.title}">
                        ${isAgente ? `<div class="agente-overlay-btns agente-overlay-sm">
                            <button class="btn-agente-card btn-agente-sm" onclick="event.stopPropagation();alert('Editando...')">✏</button>
                            <button class="btn-agente-card btn-agente-sm" onclick="event.stopPropagation();alert('Interesados...')">👥</button>
                        </div>` : ''}
                    </div>
                    <div class="card-info-small">
                        <h4>${prop.price}</h4>
                        <p>${prop.title}</p>
                        ${renderInversionistaExtra(prop, true)}
                        <div class="card-amenities-small">
                            <span>${prop.bedrooms} CAMAS</span> • <span>${prop.bathrooms} BAÑOS</span>
                        </div>
                    </div>
                </div>
            `;
        });

        attachCardListeners();
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
        const loc = filterLocation?.value.toLowerCase();
        const type = filterType?.value.toLowerCase();
        const minPrice = parseFloat(filterPriceMin?.value) || 0;
        const maxPrice = parseFloat(filterPriceMax?.value) || Infinity;

        // Ocultar sección destacada y mostrar cuadrícula de todas las propiedades
        featuredSection.style.display = 'none';
        allPropertiesSection.classList.remove('hidden');
        propertiesSectionTitle.textContent = "RESULTADOS DE BÚSQUEDA";
        [btnBuy, btnRent, btnExplore].forEach(btn => btn?.classList.remove('active'));

        const filtered = allProperties.filter(prop => {
            const propLoc = (prop.location || '').toLowerCase();
            const propType = (prop.type || '').toLowerCase();
            // Extraer el precio numérico (ej. "$4,200,000" -> 4200000)
            const propPrice = parseFloat((prop.price || '').replace(/[^0-9.]/g, '')) || 0;

            if (loc && !propLoc.includes(loc)) return false;
            if (type && !propType.includes(type)) return false;
            if (propPrice < minPrice || propPrice > maxPrice) return false;
            
            return true;
        });

        renderFullProperties(filtered);
        
        // Hacer scroll a la sección de resultados
        allPropertiesSection.scrollIntoView({ behavior: 'smooth' });
    });

    // ==========================================
    // MODAL DE DETALLES
    // ==========================================
    function attachCardListeners() {
        const cards = document.querySelectorAll('.property-card-large, .property-card-small, .match-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.getAttribute('data-id'));
                if (id) openDetailsModal(id);
            });
        });
    }

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
            if (isAgente) {
                actionBtn.textContent = 'Gestionar Propiedad';
                actionBtn.onclick = () => alert('Panel de gestión...');
            } else if (isVendedor) {
                actionBtn.textContent = 'Editar Publicación';
                actionBtn.onclick = () => alert('Editando publicación...');
            } else {
                actionBtn.textContent = 'Contactar Agente';
                actionBtn.onclick = null;
            }
        }

        detailsModal.classList.remove('hidden');
    }

    closeDetailsModal?.addEventListener('click', () => detailsModal.classList.add('hidden'));

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

    function performAISearch(query) {
        if (!query.trim()) return;

        const normalizedQuery = query.toLowerCase();

        const results = allProperties.map(prop => {
            let matchScore = 50;
            const searchSpace = `${prop.title} ${prop.description} ${(prop.tags || []).join(' ')} ${prop.location}`.toLowerCase();

            query.split(' ').forEach(word => {
                if (word.length > 3 && searchSpace.includes(word)) matchScore += 15;
            });

            matchScore = Math.min(99, matchScore + Math.floor(Math.random() * 10));
            return { ...prop, matchPercent: matchScore };
        }).sort((a, b) => b.matchPercent - a.matchPercent).slice(0, 2);

        renderAIResults(results);
    }

    function renderAIResults(results) {
        if (!aiResultsContainer) return;
        aiResultsContainer.innerHTML = '';

        results.forEach(prop => {
            aiResultsContainer.innerHTML += `
                <div class="match-card" data-id="${prop.id}">
                    <img src="${prop.image}" alt="${prop.title}" class="match-img">
                    <div class="match-info">
                        <h5>${prop.matchPercent}% COINCIDENCIA</h5>
                        <h4>${prop.title}</h4>
                        <p>${(prop.tags || []).slice(0, 2).join(', ')}</p>
                    </div>
                </div>
            `;
        });

        attachCardListeners();
    }

    aiSearchBtn?.addEventListener('click', () => performAISearch(aiSearchInput?.value || ''));
    aiSearchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performAISearch(aiSearchInput.value);
    });

    // ==========================================
    // INICIALIZAR
    // ==========================================
    loadProperties();
});