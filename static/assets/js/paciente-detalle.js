/**
 * Controlador de la Ficha Detallada del Paciente.
 * Gestiona la visualización de datos personales, historial de sesiones, contactos y gestión de archivos en S3.
 */
document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);
    const pacienteId = params.get('id');

    if (!token || !user || !pacienteId) {
        window.location.href = "pacientes.html";
        return;
    }

    let pacienteActual = null;
    let listaDocumentosCache = [];

    const TIPO_DOCUMENTO_MAP = {
        'Prueba_Evaluación': 'Prueba de Evaluación',
        'Historial_Clínico': 'Historial Clínico',
        'Consentimiento': 'Consentimiento Informado',
        'Factura': 'Factura',
        'Ficha_Registro_Menor': 'Ficha de Registro (Menor)',
        'Ficha_Registro_Adulto': 'Ficha de Registro (Adulto)',
        'Otros': 'Otros'
    };

    const GENERO_MAP = {
        'Hombre': 'Hombre',
        'Mujer': 'Mujer',
        'No_especificado': 'No especificado'
    };

    const ESTADO_CIVIL_MAP = {
        'Soltero': 'Soltero',
        'Casado': 'Casado',
        'Divorciado': 'Divorciado',
        'Viudo': 'Viudo',
        'Pareja_Hecho': 'Pareja de Hecho'
    };

    const TIPO_DOCUMENTO_COLORS = {
        'Prueba_Evaluación': '#a29bfe',
        'Historial_Clínico': '#348ec2',
        'Consentimiento': '#27ae60',
        'Factura': '#f39c12',
        'Ficha_Registro_Menor': '#e84393',
        'Ficha_Registro_Adulto': '#6c5ce7',
        'Otros': '#94a3b8'
    };

    /**
     * Obtiene y aplica el nombre de la aplicación desde el backend.
     */
    async function sincronizarInterfaz() {
        try {
            const res = await fetch(`${API_BASE}/config/public`);
            if (res.ok) {
                const config = await res.json();
                if (config.appName) {
                    document.querySelectorAll('.nombre-app-texto').forEach(el => {
                        el.textContent = config.appName;
                    });
                }
            }
        } catch (e) { console.warn("Configuración dinámica no disponible"); }
    }

    /**
     * Carga toda la información del paciente, sus contactos y documentos.
     */
    async function cargarPaciente() {
        const authHeader = { 'Authorization': `Bearer ${token}` };
        const jsonHeaders = {
            ...authHeader,
            'Content-Type': 'application/json'
        };

        try {
            const res = await fetch(`${API_BASE}/pacientes/detalle/${pacienteId}`, { headers: authHeader });
            if (!res.ok) throw new Error("No se pudo obtener el paciente");

            const p = await res.json();
            pacienteActual = p;

            document.getElementById('p-full-name').textContent = `${p.nombre} ${p.apellidos}`;
            document.getElementById('p-dni').textContent = p.dni || 'No consta';
            document.getElementById('p-laboral').textContent = p.situacionLaboral || 'No consta';
            document.getElementById('p-motivo').textContent = p.motivoConsulta || 'Sin descripción';

            document.getElementById('p-estudia').textContent = p.estudiando !== undefined ? (p.estudiando ? 'Sí' : 'No') : 'No consta';
            document.getElementById('p-nivel-estudios').textContent = p.nivelEstudios || 'No consta';
            document.getElementById('p-genero').textContent = GENERO_MAP[p.genero] || p.genero || 'No consta';
            document.getElementById('p-estado-civil').textContent = (p.estadoCivil || 'No consta').replace('_', ' ');
            document.getElementById('p-nacimiento').textContent = p.fechaNacimiento ? new Date(p.fechaNacimiento).toLocaleDateString() : 'No consta';
            document.getElementById('p-municipio').textContent = p.municipio || 'No consta';
            document.getElementById('p-cp').textContent = p.codigoPostal || 'No consta';
            document.getElementById('p-direccion').textContent = p.direccion || 'No consta';
            document.getElementById('p-inicio-terapia').textContent = p.fechaInicioTerapia ? new Date(p.fechaInicioTerapia).toLocaleDateString() : 'No consta';

            const listaContactosCont = document.getElementById('p-lista-contactos');
            listaContactosCont.innerHTML = '';

            if (p.contactos && p.contactos.length > 0) {

                p.contactos.sort((a, b) => (b.principal === true) - (a.principal === true));

                p.contactos.forEach(c => {
                    const idReal = c.idContacto || c.id;
                    const icono = (c.tipoContacto === 'Padre' || c.tipoContacto === 'Madre') ? 'fa-user-group' : 'fa-user';
                    const principalClass = c.principal ? 'is-principal' : '';
                    const nombrePsico = `${user?.nombre || 'Psicólogo'} ${user?.apellidos || ''}`.trim();
                    const subject = encodeURIComponent(`Consulta de Psicología - ${nombrePsico}`);

                    const contactoHTML = `
                        <div class="contact-item-card ${principalClass}">
                            <div class="contact-avatar">
                                <i class="fa-solid ${icono}"></i>
                            </div>
                            <div class="contact-info-main">
                                <span class="contact-name">${c.nombre || 'Sin nombre'}</span>
                                <span class="contact-relation">${c.tipoContacto || 'Contacto'}</span>
                            </div>
                            <div class="contact-details-column">
                                ${c.telefono ? `<div class="contact-detail-row"><span>${c.telefono}</span><i class="fa-solid fa-phone"></i></div>` : ''}
                                ${c.email ? `<div class="contact-detail-row"><span><a href="mailto:${c.email}?subject=${subject}" class="email-link">${c.email}</a></span><i class="fa-solid fa-envelope"></i></div>` : ''}
                            </div>
                            <button type="button" class="btn-icon-small btn-edit-contact" 
                                onclick="event.stopPropagation(); prepararEdicionContacto(${idReal}, '${(c.nombre || '').replace(/'/g, "\\'")}', '${(c.tipoContacto || '').replace(/'/g, "\\'")}', '${c.telefono}', '${c.email}', ${!!c.principal})" 
                                title="Editar">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                        </div>
                    `;
                    listaContactosCont.insertAdjacentHTML('beforeend', contactoHTML);
                });
            } else {
                listaContactosCont.innerHTML = '<p class="text-muted" style="font-size:0.85rem; padding: 10px;">No hay contactos registrados</p>';
            }

            const estadoTag = document.getElementById('p-tag-estado');
            if (estadoTag) {
                estadoTag.textContent = p.estadoPaciente;
                const claseEstado = p.estadoPaciente.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                estadoTag.className = `tag tag-${claseEstado} clickable-tag`;
            }
            configurarSelectorEstado(p.estadoPaciente);

            const iconCont = document.getElementById('p-icon-container');
            let imgSrc = "https://cdn-icons-png.flaticon.com/512/4140/4140000.png";
            if (p.genero === 'Hombre') {
                imgSrc = "https://cdn-icons-png.flaticon.com/512/4140/4140037.png";
            } else if (p.genero === 'Mujer') {
                imgSrc = "https://cdn-icons-png.flaticon.com/512/4140/4140047.png";
            }
            iconCont.style.padding = "0";
            iconCont.style.overflow = "hidden";
            iconCont.innerHTML = `<img src="${imgSrc}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;

            if (p.fechaNacimiento) {
                const edad = Math.floor((new Date() - new Date(p.fechaNacimiento)) / 31557600000);
                document.getElementById('p-tag-edad').textContent = `${edad} años`;
                if (edad < 18) {
                    const tagMenor = document.getElementById('p-tag-menor');
                    if (tagMenor) tagMenor.style.display = 'inline-block';
                }
            }

            await cargarProvincias();

            if (p.idProvincia && window._provinciasData) {
                const prov = window._provinciasData.find(pr => (pr.id || pr.idProvincia) == p.idProvincia);
                document.getElementById('p-provincia').textContent = prov ? prov.nombre : 'No consta';
            } else {
                document.getElementById('p-provincia').textContent = 'No consta';
            }
            renderizarArchivos(p.documentos, true);
            await cargarCitas(authHeader);

            const btnVerTodas = document.getElementById('btn-ver-todas-sesiones');
            if (btnVerTodas) {
                btnVerTodas.href = `paciente-sesiones.html?idPaciente=${pacienteId}`;
            }

        } catch (e) {
            console.error("Error cargando paciente:", e);
        }
    }

    /**
     * Inicializa el comportamiento del tag de estado del paciente.
     */
    function configurarSelectorEstado(estadoActual) {
        const tag = document.getElementById('p-tag-estado');
        const dropdown = document.getElementById('status-options');
        if (!tag || !dropdown) return;

        const estadosPosibles = ["Alta", "Seguimiento", "Evaluación"];

        tag.onclick = (e) => {
            e.stopPropagation();
            const otrosEstados = estadosPosibles.filter(est => est !== estadoActual);
            dropdown.innerHTML = otrosEstados.map(est => `<div data-value="${est}">${est}</div>`).join('');
            dropdown.classList.toggle('show');
        };

        dropdown.onclick = async (e) => {
            const nuevoEstado = e.target.getAttribute('data-value');
            if (nuevoEstado) {
                await actualizarEstadoPaciente(nuevoEstado);
                dropdown.classList.remove('show');
            }
        };

        document.addEventListener('click', () => {
            dropdown.classList.remove('show');
            document.querySelectorAll('.status-options-dropdown').forEach(d => d.classList.remove('show'));
        });
    }

    /**
     * Alterna la visibilidad de los selectores rápidos en el historial de sesiones.
     */
    window.toggleModalidadDropdownPaciente = (event, idSesion) => {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-modality-${idSesion}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        if (dropdown) dropdown.classList.toggle('show');
    };

    window.toggleTipoDropdownPaciente = (event, idSesion) => {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-type-${idSesion}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        if (dropdown) dropdown.classList.toggle('show');
    };

    window.cambiarModalidadSesionPaciente = (event, idSesion, nuevaMod) => {
        event.stopPropagation();
        updateSesionField(idSesion, 'modalidad', nuevaMod);
    };

    window.cambiarTipoSesionPaciente = (event, idSesion, nuevoTipo) => {
        event.stopPropagation();
        updateSesionField(idSesion, 'tipoSesion', nuevoTipo);
    };

    /**
     * Actualiza un campo de la sesión desde la ficha del paciente.
     */
    async function updateSesionField(idSesion, fieldName, newValue) {
        try {
            const resGet = await fetch(`${API_BASE}/sesiones/${idSesion}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!resGet.ok) return;
            const s = await resGet.json();

            const dto = {
                id: s.idSesion || s.id,
                idCita: s.idCita,
                estadoCita: s.estadoCita,
                tipoSesion: s.tipoSesion,
                duracionMinutos: s.duracionMinutos,
                precio: s.precio,
                facturada: s.facturada,
                procedenciaSesion: s.procedencia,
                urlVideollamada: s.urlVideollamada,
                motivoSesion: s.motivoSesion,
                contenidos: s.contenidos,
                intervenciones: s.intervenciones,
                observaciones: s.observaciones,
                hipotesis: s.hipotesis,
                modalidad: s.modalidad
            };
            dto[fieldName] = newValue;

            await fetch(`${API_BASE}/sesiones/${idSesion}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(dto)
            });

            cargarCitas({ 'Authorization': `Bearer ${token}` });
        } catch (e) { console.error(e); }
    }

    /**
     * Actualiza el estado clínico del paciente mediante llamada PUT.
     */
    async function actualizarEstadoPaciente(nuevoEstado) {
        if (!pacienteActual) return;

        const datosActualizados = { ...pacienteActual, estadoPaciente: nuevoEstado };

        try {
            const res = await fetch(`${API_BASE}/pacientes/${pacienteId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosActualizados)
            });
            if (res.ok) cargarPaciente();
        } catch (e) { console.error("Error al actualizar estado:", e); }
    }

    /**
     * Obtiene y prepara el listado de provincias para el modal de edición.
     */
    async function cargarProvincias() {
        try {
            const res = await fetch(`${API_BASE}/provincias`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const provincias = await res.json();
                window._provinciasData = provincias;

                const list = document.getElementById('provincias-list');
                list.innerHTML = provincias.map(p => `<option data-id="${p.idProvincia || p.id || ''}" value="${p.nombre}">`).join('');

                document.getElementById('edit-provincia-search').oninput = (e) => {
                    const prov = (window._provinciasData || []).find(p => p.nombre === e.target.value);
                    const id = prov ? (prov.idProvincia || prov.id || '') : '';
                    document.getElementById('edit-provincia-id').value = id;
                };
            }
        } catch (e) { console.error("Error provincias:", e); }
    }

    /**
     * Popula el modal de edición con los datos actuales del paciente.
     */
    const btnEditarPerfil = document.getElementById('btn-editar-perfil');
    if (btnEditarPerfil) {
        btnEditarPerfil.onclick = () => {
            if (!pacienteActual) return;

            document.getElementById('edit-nombre').value = pacienteActual.nombre || '';
            document.getElementById('edit-apellidos').value = pacienteActual.apellidos || '';
            document.getElementById('edit-dni').value = pacienteActual.dni || '';
            document.getElementById('edit-fecha').value = pacienteActual.fechaNacimiento ? pacienteActual.fechaNacimiento.split('T')[0] : '';
            document.getElementById('edit-genero').value = pacienteActual.genero || 'Mujer';
            document.getElementById('edit-estado-civil').value = pacienteActual.estadoCivil || 'Soltero';
            document.getElementById('edit-direccion').value = pacienteActual.direccion || '';
            document.getElementById('edit-municipio').value = pacienteActual.municipio || '';
            document.getElementById('edit-cp').value = pacienteActual.codigoPostal || '';
            document.getElementById('edit-motivo-consulta').value = pacienteActual.motivoConsulta || '';

            const provinciaId = pacienteActual.idProvincia || (pacienteActual.provincia ? (pacienteActual.provincia.id || pacienteActual.provincia.idProvincia) : null);

            document.getElementById('edit-provincia-id').value = provinciaId || '';
            if (provinciaId && window._provinciasData) {
                const prov = window._provinciasData.find(pr => (pr.id || pr.idProvincia) == provinciaId);
                document.getElementById('edit-provincia-search').value = prov ? prov.nombre : '';
            } else {
                document.getElementById('edit-provincia-search').value = '';
            }

            document.getElementById('edit-fecha-inicio').value = pacienteActual.fechaInicioTerapia ? pacienteActual.fechaInicioTerapia.split('T')[0] : '';
            document.getElementById('edit-situacion-laboral').value = pacienteActual.situacionLaboral || 'Empleado';
            document.getElementById('edit-estudiando').value = String(pacienteActual.estudiando || false);
            document.getElementById('edit-nivel-estudios').value = pacienteActual.nivelEstudios || '';

            ModalTools.open('modal-editar-paciente-overlay');
        };
    }

    const formEditar = document.getElementById('form-editar-paciente');
    if (formEditar) {
        formEditar.onsubmit = async (e) => {
            e.preventDefault();
            const formData = {
                ...pacienteActual,
                nombre: document.getElementById('edit-nombre').value,
                apellidos: document.getElementById('edit-apellidos').value,
                dni: document.getElementById('edit-dni').value,
                fechaNacimiento: document.getElementById('edit-fecha').value,
                genero: document.getElementById('edit-genero').value,
                estadoCivil: document.getElementById('edit-estado-civil').value,
                direccion: document.getElementById('edit-direccion').value,
                municipio: document.getElementById('edit-municipio').value,
                codigoPostal: document.getElementById('edit-cp').value,
                idProvincia: parseInt(document.getElementById('edit-provincia-id').value) || null,
                fechaInicioTerapia: document.getElementById('edit-fecha-inicio').value,
                situacionLaboral: document.getElementById('edit-situacion-laboral').value,
                estudiando: document.getElementById('edit-estudiando').value === "true",
                nivelEstudios: document.getElementById('edit-nivel-estudios').value,
                motivoConsulta: document.getElementById('edit-motivo-consulta').value
            };

            try {
                const res = await fetch(`${API_BASE}/pacientes/${pacienteId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                if (res.ok) { ModalTools.close('modal-editar-paciente-overlay'); cargarPaciente(); }
            } catch (e) { console.error(e); }
        };
    }

    const btnNuevaCita = document.getElementById('btn-nueva-cita');
    if (btnNuevaCita) {
        btnNuevaCita.onclick = () => {
            const nombre = `${pacienteActual.nombre} ${pacienteActual.apellidos}`;
            window.location.href = `citas.html?nuevaCita=true&idPaciente=${pacienteId}&nombre=${encodeURIComponent(nombre)}`;
        };
    }

    function parsearFecha(fechaRaw) {
        if (!fechaRaw) return null;
        if (Array.isArray(fechaRaw)) {
            return new Date(fechaRaw[0], fechaRaw[1] - 1, fechaRaw[2], fechaRaw[3] || 0, fechaRaw[4] || 0);
        }
        return new Date(fechaRaw);
    }

    /**
     * Recupera el listado simplificado de citas para el historial y la próxima cita.
     */
    async function cargarCitas(headers) {
        try {
            const res = await fetch(`${API_BASE}/citas/paciente/${pacienteId}/simple`, { headers });
            const citas = await res.json();
            renderizarSesiones(citas);
            renderizarProximaCita(citas);
        } catch (e) { console.error("Error cargando citas:", e); }
    }

    /**
     * Genera dinámicamente el listado de cards del historial de sesiones.
     */
    function renderizarSesiones(data) {
        try {
            const sesiones = data.filter(s => s.estadoCita !== 'Cancelada');
            const container = document.getElementById('p-sesiones-list');

            if (!container) return;
            if (!sesiones || sesiones.length === 0) {
                container.innerHTML = '<p class="empty-msg" style="text-align:center; padding:30px;">No hay sesiones registradas</p>';
                return;
            }

            container.innerHTML = sesiones
                .sort((a, b) => parsearFecha(b.fechaHora) - parsearFecha(a.fechaHora))
                .map(s => {
                    const f = parsearFecha(s.fechaHora);
                    const idC = s.id;
                    const idS = s.idSesion || s.id;

                    const estadoCita = (s.estadoCita || '').toLowerCase().replace(/ /g, '_');
                    const isNoPresentado = estadoCita === 'no_presentado';

                    const mod = s.modalidad || 'Presencial';
                    const modClass = mod.toLowerCase().includes('online') ? 'online' : 'presencial';

                    const tipo = s.tipoCita || 'Individual';
                    let tipoClass = 'individual';
                    if (tipo.toLowerCase().includes('pareja')) tipoClass = 'pareja';
                    if (tipo.toLowerCase().includes('sexolog')) tipoClass = 'sexologia';

                    const modalidadesDisponibles = ['Presencial', 'Online'];
                    const modNormalizada = mod.toLowerCase();
                    const opcionesModHtml = modalidadesDisponibles
                        .filter(m => m.toLowerCase() !== modNormalizada)
                        .map(m => `<div onclick="window.cambiarModalidadSesionPaciente(event, ${idS}, '${m}')">${m}</div>`)
                        .join('');

                    const tiposDisponiblesParaCambio = [
                        { val: 'Individual', text: 'Individual' },
                        { val: 'Sexologia', text: 'Sexología' }
                    ];
                    const tipoCitaNormalizado = (s.tipoCita || 'Individual').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

                    let opcionesTipoHtml = '';
                    let tipoTagClickableClass = 'clickable-tag';
                    let tipoTagOnClick = `onclick="window.toggleTipoDropdownPaciente(event, ${idS})"`;

                    if (tipoCitaNormalizado === 'pareja') {
                        tipoTagClickableClass = '';
                        tipoTagOnClick = '';
                    } else {
                        opcionesTipoHtml = tiposDisponiblesParaCambio.filter(t => t.val.toLowerCase() !== tipoCitaNormalizado).map(t => `<div onclick="window.cambiarTipoSesionPaciente(event, ${idS}, '${t.val}')">${t.text}</div>`).join('');
                    }

                    return `
                    <div class="session-item-card ${isNoPresentado ? 'is-no-presentado' : ''}" 
                        onclick="window.location.href='sesion.html?idPaciente=${pacienteId}&idCita=${idC}'">
                        
                        <div class="session-info-left">
                            <div class="date-time-group">
                                <div class="session-date-badge">
                                    <div class="month">${f ? f.toLocaleString('es', { month: 'short' }).toUpperCase().replace('.', '') : '---'}</div>
                                    <div class="day">${f ? f.getDate() : '--'}</div>
                                </div>

                                <div class="session-time-tag">
                                    <i class="fa-regular fa-clock"></i>
                                    <span>${f ? f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}h</span>
                                </div>
                            </div>

                            <div class="info-divider"></div>

                            <div class="tags-row">
                                <div class="status-selector-wrapper">
                                    <span class="tag tag-${modClass} clickable-tag" style="padding: 10px 20px !important;" onclick="window.toggleModalidadDropdownPaciente(event, ${idS})">${mod}</span>
                                    <div id="dropdown-modality-${idS}" class="status-options-dropdown">${opcionesModHtml}</div>
                                </div>
                                <div class="status-selector-wrapper">
                                    <span class="tag tag-${tipoClass} ${tipoTagClickableClass}" style="padding: 10px 20px !important;" ${tipoTagOnClick}>${tipo}</span>
                                    <div id="dropdown-type-${idS}" class="status-options-dropdown">${opcionesTipoHtml}</div>
                                </div>
                            </div>
                        </div>

                        <div class="session-content-right">
                            <p>${s.contenidos || 'Sin notas recogidas en esta sesión...'}</p>
                        </div>
                    </div>`;
                }).join('');

        } catch (e) { console.error("Error renderizando sesiones:", e); }
    }

    /**
     * Gestiona la galería de documentos adjuntos.
     * @param {Array} documentos - Lista de objetos documento.
     */
    function renderizarArchivos(documentos, actualizarCache = false) {
        if (actualizarCache) listaDocumentosCache = documentos || [];

        const container = document.getElementById('files-container');
        if (!container) return;

        if (documentos.length === 0) {
            container.innerHTML = '<p class="empty-msg" style="font-size:0.85rem;">No hay documentos</p>';
            container.classList.remove('files-horizontal-container');
            return;
        }

        const getIconByExt = (ext) => {
            ext = (ext || '').toLowerCase();
            if (ext === 'pdf') return 'fa-file-pdf';
            if (['doc', 'docx'].includes(ext)) return 'fa-file-word';
            if (['xls', 'xlsx'].includes(ext)) return 'fa-file-excel';
            if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'fa-file-image';
            return 'fa-file-lines';
        };

        container.className = 'files-horizontal-container';
        container.innerHTML = documentos.map(doc => {
            const icon = getIconByExt(doc.extension);
            const isMissingKey = !doc.s3Key || doc.s3Key === 'null';
            const tipoLabel = TIPO_DOCUMENTO_MAP[doc.tipoDoc] || doc.tipoDoc || 'Otros';
            const fechaStr = doc.fechaSubida ? new Date(doc.fechaSubida).toLocaleDateString() : 'S/F';
            const iconColor = TIPO_DOCUMENTO_COLORS[doc.tipoDoc] || '#348ec2';

            return `
                    <div class="file-card" onclick="verDocumento('${doc.s3Key || ''}')">
                        <button class="btn-icon-small btn-delete-file" onclick="event.stopPropagation(); eliminarArchivo(${doc.id})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                        <i class="fa-solid ${icon} file-main-icon" style="color: ${isMissingKey ? '#94a3b8' : iconColor}"></i>
                        <span class="file-name">${doc.nombre || 'Sin nombre'}</span>
                        <span style="font-size: 0.65rem; color: #64748b; font-weight: 600; text-transform: uppercase;">${tipoLabel}</span>
                        <span style="font-size: 0.8rem; color: #94a3b8;">${fechaStr}</span>
                        ${isMissingKey ? '<small style="color:red; font-size:0.6rem;">Error S3</small>' : ''}
                    </div>
                `;
        }).join('');
    }

    const searchFilesInput = document.getElementById('search-files');
    if (searchFilesInput) {
        searchFilesInput.oninput = (e) => {
            const term = e.target.value.toLowerCase();
            const filtrados = listaDocumentosCache.filter(d =>
                (d.nombre || '').toLowerCase().includes(term) ||
                (TIPO_DOCUMENTO_MAP[d.tipoDoc] || '').toLowerCase().includes(term)
            );
            renderizarArchivos(filtrados, false);
        };
    }

    /**
     * Solicita una URL firmada al servidor para visualizar un archivo alojado en AWS S3.
     */
    window.verDocumento = async (s3Key) => {
        if (!s3Key || s3Key === 'undefined' || s3Key === 'null' || s3Key === '') {
            UiModal.info("El archivo no tiene una clave de almacenamiento válida.", "Error");
            return;
        }
        try {
            const idPsico = user.idPsicologo || user.id;
            const res = await fetch(`${API_BASE}/api/documentos/ver?key=${encodeURIComponent(s3Key)}&idPsicologo=${idPsico}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    window.open(data.url, '_blank');
                } else {
                    throw new Error("URL no recibida");
                }
            } else {
                const errorText = await res.text();
                UiModal.info(errorText || "No tienes permiso para ver este documento.", "Error de acceso");
            }
        } catch (e) {
            console.error("Error obteniendo URL firmada:", e);
        }
    };

    let fileToUpload = null;

    /**
     * Inicializa y abre el modal de subida de documentos.
     */
    window.abrirModalSubida = () => {
        fileToUpload = null;
        document.getElementById('upload-doc-name').value = '';

        const selectTipo = document.getElementById('upload-doc-tipo');
        if (selectTipo) {
            selectTipo.innerHTML = Object.entries(TIPO_DOCUMENTO_MAP)
                .map(([value, label]) => `<option value="${value}">${label}</option>`)
                .join('');
        }

        document.getElementById('file-selected-info').style.display = 'none';
        document.getElementById('btn-ejecutar-subida').disabled = true;
        document.getElementById('drop-zone').classList.remove('has-file');
        ModalTools.open('modal-upload-document');
    };

    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input-hidden');

    if (dropZone) {
        dropZone.onclick = () => fileInput.click();

        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('dragover'); };
        dropZone.ondragleave = () => dropZone.classList.remove('dragover');
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        };

        fileInput.onchange = (e) => handleFiles(e.target.files);
    }

    function handleFiles(files) {
        if (files.length === 0) return;
        fileToUpload = files[0];

        const info = document.getElementById('file-selected-info');
        info.textContent = `Archivo seleccionado: ${fileToUpload.name}`;
        info.style.display = 'block';

        document.getElementById('drop-zone').classList.add('has-file');
        document.getElementById('btn-ejecutar-subida').disabled = false;

        const nameInput = document.getElementById('upload-doc-name');
        if (!nameInput.value) {
            nameInput.value = fileToUpload.name.split('.').slice(0, -1).join('.');
        }
    }

    /**
     * Ejecuta el proceso de subida multipart/form-data del archivo seleccionado.
     */

    document.getElementById('btn-ejecutar-subida').onclick = async () => {
        if (!fileToUpload) return;

        const nombre = document.getElementById('upload-doc-name').value.trim();
        const tipoDoc = document.getElementById('upload-doc-tipo').value;
        const nombreFinal = nombre || fileToUpload.name;

        const existe = listaDocumentosCache.find(d => d.nombre.toLowerCase() === nombreFinal.toLowerCase());

        const procederConSubida = async () => {
            const btn = document.getElementById('btn-ejecutar-subida');
            const originalContent = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...';

            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('idPaciente', pacienteId);
            formData.append('idPsicologo', user.id || user.idPsicologo);
            formData.append('tipoDoc', tipoDoc);
            if (nombre) formData.append('nombre', nombre);

            try {
                const res = await fetch(`${API_BASE}/api/documentos/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (res.ok) {
                    ModalTools.close('modal-upload-document');
                    UiModal.info("El archivo se ha procesado correctamente.", "Éxito");
                    cargarPaciente();
                } else {
                    UiModal.info("Hubo un error al intentar subir el archivo.", "Error");
                }
            } catch (e) {
                console.error("Error subida:", e);
                UiModal.info("No se pudo conectar con el servidor.", "Error de conexión");
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalContent;
            }
        };

        if (existe) {
            UiModal.confirm(
                `Ya existe un archivo llamado "${nombreFinal}". ¿Deseas sobreescribirlo?`,
                "Archivo Duplicado",
                procederConSubida
            );
        } else {
            procederConSubida();
        }
    };

    /**
     * Solicita la eliminación lógica y física de un documento.
     */
    window.eliminarArchivo = async (id) => {
        UiModal.confirm("¿Estás seguro de que deseas eliminar este documento?", "Eliminar Documento", async () => {
            try {
                const res = await fetch(`${API_BASE}/api/documentos/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    cargarPaciente();
                }
            } catch (e) { console.error("Error eliminando documento:", e); }
        });
    };

    /**
     * Identifica y muestra la cita más cercana en el tiempo que aún no ha ocurrido.
     */
    function renderizarProximaCita(citas) {
        try {
            const container = document.getElementById('next-cita-content');

            const ahora = new Date();
            const proxima = citas
                .map(c => ({ ...c, fechaObj: parsearFecha(c.fechaHora) }))
                .filter(c => c.fechaObj > ahora && (c.estadoCita || '').toLowerCase() !== 'cancelada')
                .sort((a, b) => a.fechaObj - b.fechaObj)[0];

            if (proxima) {
                const f = proxima.fechaObj;
                container.innerHTML = `
                    <div class="next-cita-box">
                        <div class="date-badge">
                            <span class="day">${f.getDate()}</span>
                            <span class="month">${f.toLocaleString('es', { month: 'short' }).toUpperCase().replace('.', '')}</span>
                        </div>
                        <div>
                            <div class="next-cita-time" style="font-weight: 800;">
                                ${f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}h
                            </div>
                            <div class="next-cita-modality">${proxima.modalidad}</div>
                        </div>
                    </div>`;
            } else {
                container.innerHTML = '<p class="text-muted" style="font-size:0.9rem; text-align: center;">No hay citas programadas</p>';
            }
        } catch (e) { }
    }

    const overlayContacto = document.getElementById('modal-contacto-overlay');
    const btnAbrirContacto = document.getElementById('btn-abrir-contacto');

    const limpiarFormularioContacto = () => {
        const form = document.getElementById('form-nuevo-contacto');
        if (form) {
            form.reset();
            const idInput = document.getElementById('contacto-id');
            if (idInput) idInput.value = '';
        }
        if (typeof updateStarUI === 'function') updateStarUI(false);
    };

    ModalTools.setup('modal-contacto-overlay', limpiarFormularioContacto);
    ModalTools.setup('modal-editar-paciente-overlay');
    ModalTools.setup('modal-tipo-doc-overlay');
    ModalTools.setup('modal-upload-document');

    /**
     * Gestiona el estado de contacto principal (estrella).
     */
    const btnStar = document.getElementById('btn-star-contacto');
    let isPrincipalState = false;

    function updateStarUI(active) {
        isPrincipalState = active;
        const icon = btnStar?.querySelector('i');
        if (!icon) return;
        icon.className = active ? 'fa-solid fa-star' : 'fa-regular fa-star';
        btnStar.classList.toggle('active', active);
    }

    if (btnStar) btnStar.onclick = () => updateStarUI(!isPrincipalState);

    if (btnAbrirContacto) {
        btnAbrirContacto.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const titulo = document.getElementById('modal-contacto-titulo');
            if (titulo) titulo.innerHTML = '<i class="fa-solid fa-address-book" style="margin-right: 10px; color: #348ec2;"></i> Añadir Contacto';
            const btnEliminar = document.getElementById('btn-eliminar-contacto-modal');
            if (btnEliminar) btnEliminar.style.display = 'none';
            updateStarUI(false);
            if (overlayContacto) overlayContacto.style.display = 'flex';
        };
    }

    const formContacto = document.getElementById('form-nuevo-contacto');

    if (formContacto && !document.getElementById('contacto-id')) {
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.id = 'contacto-id';
        formContacto.appendChild(hiddenInput);
    }

    if (formContacto) formContacto.onsubmit = async (e) => {
        e.preventDefault();

        const idInput = document.getElementById('contacto-id');
        const contactoId = idInput ? idInput.value : null;

        const datos = {
            id: contactoId ? parseInt(contactoId) : null,
            idContacto: contactoId ? parseInt(contactoId) : null,
            nombre: document.getElementById('contacto-nombre')?.value || '',
            tipoContacto: document.getElementById('tipo-contacto')?.value || '',
            telefono: document.getElementById('contacto-telefono')?.value || '',
            email: document.getElementById('contacto-email')?.value || '',
            principal: isPrincipalState
        };

        let url = `${API_BASE}/contactos/paciente/${pacienteId}`;
        let method = 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datos)
            });

            if (res.ok) {
                ModalTools.close('modal-contacto-overlay', limpiarFormularioContacto);
                cargarPaciente();
                formContacto.reset();
                if (idInput) idInput.value = '';
            } else {
                UiModal.info("Error al procesar el contacto", "Error");
            }
        } catch (err) { console.error("Error:", err); }
    };

    /**
     * Prepara el modal de contacto con los datos de un contacto existente.
     */
    window.prepararEdicionContacto = (id, nombre, tipoContacto, tlf, email, principal) => {
        const idInput = document.getElementById('contacto-id');
        const btnEliminar = document.getElementById('btn-eliminar-contacto-modal');
        const titulo = document.getElementById('modal-contacto-titulo');

        if (titulo) titulo.innerHTML = '<i class="fa-solid fa-address-book" style="margin-right: 10px; color: #348ec2;"></i> Editar Contacto';

        if (idInput) idInput.value = id;
        document.getElementById('contacto-nombre').value = nombre;
        document.getElementById('tipo-contacto').value = tipoContacto;
        document.getElementById('contacto-telefono').value = (tlf === 'null' || !tlf) ? '' : tlf;
        document.getElementById('contacto-email').value = (email === 'null' || !email) ? '' : email;

        updateStarUI(principal === true || principal === 'true');

        if (btnEliminar) {
            btnEliminar.style.display = id ? 'flex' : 'none';
            btnEliminar.onclick = () => window.eliminarContacto(id);
        }

        ModalTools.open('modal-contacto-overlay');
    };

    window.eliminarContacto = async (id) => {
        UiModal.open("Eliminar Contacto", "¿Estás seguro de que quieres borrar el contacto? No se podrá recuperar.", [
            { text: 'Cancelar', class: 'btn-modal-secondary' },
            {
                text: 'Aceptar', class: 'btn-modal-primary', callback: async () => {
                    try {
                        const res = await fetch(`${API_BASE}/contactos/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (res.ok) {
                            ModalTools.close('modal-contacto-overlay', limpiarFormularioContacto);
                            cargarPaciente();
                        } else {
                            UiModal.info("No se pudo eliminar el contacto", "Error");
                        }
                    } catch (err) {
                        console.error("Error al eliminar:", err);
                    }
                }
            }
        ]);
    };

    /**
     * Orquestación de la carga inicial de la página con control de loader visual.
     */
    async function inicializarPagina() {
        const loader = document.getElementById('content-loader');
        const main = document.getElementById('patient-main-content');

        try {
            if (loader) loader.style.display = 'flex';
            if (main) main.style.display = 'none';

            await Promise.all([
                sincronizarInterfaz(),
                cargarPaciente()
            ]);
        } catch (err) {
            console.error("Fallo al cargar la página de detalle del paciente:", err);
        } finally {
            if (loader) loader.style.display = 'none';
            if (main) main.style.display = 'block';
        }
    }

    inicializarPagina();
});