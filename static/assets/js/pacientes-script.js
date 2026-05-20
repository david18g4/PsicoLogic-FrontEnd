document.addEventListener('DOMContentLoaded', () => {

    // Usamos la constante global para construir la URL de pacientes
    const API_URL = `${API_BASE}/pacientes`;

    const tableBody = document.getElementById('lista-pacientes-body');
    const buscador = document.getElementById('buscador');
    const filterEstado = document.getElementById('filter-estado');
    const sortSelect = document.getElementById('sort-pacientes');

    window.pacientesData = [];

    // Solo calculamos el psicologoId localmente si no existe
    const psicologoId = user?.idPsicologo || user?.id;

    // --- CARGAR PROVINCIAS ---
    async function cargarProvincias() {
        try {
            const res = await fetch(`${API_BASE}/provincias`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                window._provinciasData = await res.json();
                const datalist = document.getElementById('provincias-list-nuevo');
                if (datalist) {
                    datalist.innerHTML = window._provinciasData
                        .map(prov => `<option value="${prov.nombre}" data-id="${prov.id}"></option>`)
                        .join('');
                }
            }
        } catch (e) { console.error("Error provincias:", e); }
    }

    // --- LISTENER PARA CAPTURAR SELECCIÓN DE PROVINCIA ---
    const provinciaSearch = document.getElementById('nuevo-provincia-search');
    const provinciaId = document.getElementById('nuevo-provincia-id');

    if (provinciaSearch && provinciaId) {
        provinciaSearch.addEventListener('change', () => {
            if (window._provinciasData) {
                const provinciaSeleccionada = window._provinciasData.find(p => p.nombre === provinciaSearch.value);
                if (provinciaSeleccionada) {
                    provinciaId.value = provinciaSeleccionada.id;
                } else {
                    provinciaId.value = '';
                }
            }
        });
    }

    // --- 2. LÓGICA DE PACIENTES ---
    async function cargarPacientes() {
        // 'token' y 'psicologoId' ya son accesibles globalmente
        if (!token || !psicologoId) {
            console.warn("Falta token o ID de psicólogo");
            return;
        }

        const search = buscador?.value || '';
        const estado = filterEstado?.value || 'all';
        const sort = sortSelect?.value || '';

        let params = new URLSearchParams();

        if (search.trim() !== "") params.append('search', search.trim());
        if (estado !== 'all') params.append('estado', estado);
        if (sort) params.append('sort', sort);

        try {
            const response = await fetch(`${API_URL}?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) return;

            const pacientes = await response.json();
            window.pacientesData = pacientes;
            renderTable(pacientes);
        } catch (error) {
            console.error("Error cargando pacientes:", error);
        }
    }

    function renderTable(data) {
        if (!tableBody) return;
        tableBody.innerHTML = '';

        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px;">No se encontraron pacientes.</td></tr>`;
            return;
        }

        data.forEach(p => {
            const idReal = p.id;
            const edad = p.edad != null ? p.edad : "-";
            const estadoRaw = p.estadoPaciente || 'Evaluación';

            const statusClass = `tag-${estadoRaw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
            const nombreCompleto = `${p.nombre || ''} ${p.apellidos || ''}`;

            const urlDetalle = `paciente-detalle.html?id=${idReal}`;
            const urlNuevaCita = `citas.html?nuevaCita=true&idPaciente=${idReal}&nombre=${encodeURIComponent(nombreCompleto)}`;

            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.onclick = (e) => {
                // No redirigir si el clic fue en el selector de estado, el botón de nueva cita o el enlace de email
                if (e.target.closest('.status-selector-wrapper') || e.target.closest('.btn-icon') || e.target.closest('.email-link') || e.target.closest('.phone-link')) {
                    return;
                }
                window.location.href = urlDetalle;
            };

            row.innerHTML = `
                <td data-label="Paciente">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid ${p.genero === 'Mujer' ? 'fa-venus' :
                    p.genero === 'Hombre' ? 'fa-mars' :
                        'fa-venus-mars'
                }" 
                            style="color:${p.genero === 'Mujer' ? '#ff80ab' :
                    p.genero === 'Hombre' ? '#264574' :
                        '#64748b'
                }"></i>
                        <strong>${nombreCompleto}</strong>
                    </div>
                </td>
                <td data-label="DNI" style="text-align: center;">${p.dni || '-'}</td>
                <td data-label="Edad" style="text-align: center;">${edad !== "-" ? edad + " años" : "-"}</td>
                <td data-label="Género" style="text-align: center;">${p.genero || '-'}</td>
                <td data-label="Estado" style="text-align: center;">
                    <div class="status-selector-wrapper">
                        <span class="tag ${statusClass} clickable-tag" onclick="window.toggleDropdownPaciente(event, ${idReal})">${estadoRaw}</span>
                        <div id="dropdown-estado-${idReal}" class="status-options-dropdown">
                            ${['Alta', 'Seguimiento', 'Evaluación']
                    .filter(s => s !== estadoRaw)
                    .map(s => `<div onclick="window.cambiarEstadoPaciente(event, ${idReal}, '${s}')">${s}</div>`)
                    .join('')}
                        </div>
                    </div>
                </td>
                <td data-label="Contacto">
                    <small>
                        ${p.contactos && p.contactos.length > 0 ? (() => {
                    // BUSCAMOS EL PRINCIPAL, SI NO HAY, COGEMOS EL PRIMERO
                    const contactoPrincipal = p.contactos.find(c => c.principal === true) || p.contactos[0];
                    const masContactos = p.contactos.length - 1;

                    let html = '';
                    // Usamos la información del contactoPrincipal encontrado
                    if (contactoPrincipal.telefono) {
                        html += `<div class="phone-link" style="margin-bottom: 2px;"><i class="fa-solid fa-phone" style="width: 15px;"></i> ${contactoPrincipal.telefono}</div>`;
                    }
                    if (contactoPrincipal.email) {
                        const nombrePsico = `${user?.nombre || 'Psicólogo'} ${user?.apellidos || ''}`.trim();
                        const subject = encodeURIComponent(`Consulta de Psicología - ${nombrePsico}`);
                        html += `<div class="contact-detail-row"><i class="fa-solid fa-envelope"></i><span><a href="mailto:${contactoPrincipal.email}?subject=${subject}" class="email-link">${contactoPrincipal.email}</a></span></div>`;
                    }

                    if (masContactos > 0) {
                        html += `<div class="more-contacts">+${masContactos} más...</div>`;
                    }
                    return html || '<span class="text-muted">Sin datos</span>';
                })() : '<span class="text-muted">Sin contacto</span>'}
                    </small>
                </td>
                <td data-label="Acciones" style="text-align: center;">
                    <button class="btn-icon" title="Nueva Cita"
                        onclick="event.stopPropagation(); window.location.href='${urlNuevaCita}'">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- 3. ACCIONES DE FORMULARIO ---
    const formNuevo = document.getElementById('formNuevoPaciente');
    if (formNuevo) {
        formNuevo.addEventListener('submit', async (event) => {
            event.preventDefault();

            const contactoNombre = document.getElementById('nuevo-contacto-nombre').value.trim();
            const contactoParentesco = document.getElementById('nuevo-contacto-parentesco').value.trim();
            const contactoTelefono = document.getElementById('nuevo-telefono').value.trim();
            const contactoEmail = document.getElementById('nuevo-email').value.trim();

            const contactos = [];
            if (contactoNombre || contactoParentesco || contactoTelefono || contactoEmail) {
                contactos.push({
                    nombre: contactoNombre,
                    parentesco: contactoParentesco,
                    telefono: contactoTelefono,
                    email: contactoEmail
                });
            }

            const nuevoPaciente = {
                nombre: document.getElementById('nuevo-nombre').value,
                apellidos: document.getElementById('nuevo-apellidos').value,
                dni: document.getElementById('nuevo-dni').value,
                fechaNacimiento: document.getElementById('nuevo-fecha').value,
                genero: document.getElementById('nuevo-genero').value,
                estadoCivil: document.getElementById('nuevo-estado-civil').value,
                telefono: contactoTelefono,
                email: contactoEmail,
                direccion: document.getElementById('nuevo-direccion').value,
                municipio: document.getElementById('nuevo-municipio').value,
                codigoPostal: document.getElementById('nuevo-cp').value,
                idProvincia: parseInt(document.getElementById('nuevo-provincia-id').value) || null,
                situacionLaboral: document.getElementById('nuevo-situacion-laboral').value,
                estudiando: document.getElementById('nuevo-estudiando').value === "true",
                nivelEstudios: document.getElementById('nuevo-nivel-estudios').value,
                motivoConsulta: document.getElementById('nuevo-motivo').value,
                estadoPaciente: document.getElementById('nuevo-estado').value,
                idPsicologo: psicologoId,
                contactos: contactos.length > 0 ? contactos : undefined
            };

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(nuevoPaciente)
                });

                if (response.ok) {
                    UiModal.info("Paciente registrado con éxito.", "Éxito", () => {
                        window.cerrarModalNuevo();
                        cargarPacientes();
                    });
                } else {
                    const errorData = await response.json();
                    UiModal.info("Error al guardar: " + (errorData.message || "Error desconocido"), "Error");
                }
            } catch (error) {
                console.error("Error:", error);
            }
        });
    }

    // --- 4. FUNCIONES DE VENTANA (MODALES) ---
    window.abrirModalNuevo = () => {
        const modal = document.getElementById('modalNuevoPaciente');
        if (modal) {
            modal.style.display = 'flex';
            // Limpiar campo de provincia al abrir el modal
            const provinciaSearch = document.getElementById('nuevo-provincia-search');
            const provinciaId = document.getElementById('nuevo-provincia-id');
            if (provinciaSearch) provinciaSearch.value = '';
            if (provinciaId) provinciaId.value = '';
        }
    };

    window.cerrarModalNuevo = () => {
        const modal = document.getElementById('modalNuevoPaciente');
        if (modal) {
            modal.style.display = 'none';
            if (formNuevo) formNuevo.reset();
        }
    };

    // --- FUNCIONES PARA CAMBIO DE ESTADO DEL PACIENTE ---
    window.toggleDropdownPaciente = (event, idPaciente) => {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-estado-${idPaciente}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    };

    window.cambiarEstadoPaciente = async (event, idPaciente, nuevoEstado) => {
        event.stopPropagation();

        try {
            const response = await fetch(`${API_URL}/${idPaciente}/estado?nuevoEstado=${encodeURIComponent(nuevoEstado)}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Actualizar en local
                const idx = pacientesData.findIndex(p => p.id === idPaciente);
                if (idx !== -1) pacientesData[idx].estadoPaciente = nuevoEstado;
                cargarPacientes();
                document.querySelectorAll('.status-options-dropdown').forEach(d => d.classList.remove('show'));
            }
        } catch (error) { console.error("Error al cambiar estado:", error); }
    };

    document.addEventListener('click', () => {
        document.querySelectorAll('.status-options-dropdown').forEach(d => d.classList.remove('show'));
    });

    // --- 5. FILTROS E INICIO ---
    function inicializarFiltrosDesdeURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const estadoURL = urlParams.get('estado');

        if (estadoURL && filterEstado) {
            const urlValLimpia = estadoURL.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            for (let i = 0; i < filterEstado.options.length; i++) {
                const optValLimpia = filterEstado.options[i].value.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (optValLimpia === urlValLimpia) {
                    filterEstado.selectedIndex = i;
                    break;
                }
            }
        }
    }

    if (buscador) buscador.addEventListener('input', cargarPacientes);
    if (filterEstado) filterEstado.addEventListener('change', cargarPacientes);
    if (sortSelect) sortSelect.addEventListener('change', cargarPacientes);

    inicializarFiltrosDesdeURL();
    cargarProvincias();
    cargarPacientes();
});