/**
 * Historial Detallado de Sesiones de un Paciente.
 * Lista de forma cronológica todas las intervenciones con posibilidad de edición rápida.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const idPaciente = params.get('idPaciente');

    if (!idPaciente || !token) {
        window.location.href = 'pacientes.html';
        return;
    }

    const container = document.getElementById('contenedor-sesiones-list');
    const headerNombre = document.getElementById('header-nombre-paciente');
    const totalBadge = document.getElementById('total-sesiones-badge');

    /**
     * Parsea fechas recibidas de la API.
     */
    function parsearFecha(fechaRaw) {
        if (!fechaRaw) return null;
        if (Array.isArray(fechaRaw)) {
            return new Date(fechaRaw[0], fechaRaw[1] - 1, fechaRaw[2], fechaRaw[3] || 0, fechaRaw[4] || 0);
        }
        return new Date(fechaRaw);
    }

    /**
     * Carga de forma concurrente los datos del paciente, sus sesiones y citas.
     */
    async function cargarDatos() {
        const idPsico = user.idPsicologo || user.id;
        try {
            const [resP, resS, resC] = await Promise.all([
                fetch(`${API_BASE}/pacientes/${idPaciente}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/sesiones/paciente/${idPaciente}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE}/citas/paciente/${idPaciente}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (resP.ok) {
                const p = await resP.json();
                headerNombre.innerText = `${p.nombre} ${p.apellidos}`;
                document.getElementById('titulo-pagina').innerText = `Sesiones de ${p.nombre} ${p.apellidos}`;
            }

            if (resS.ok && resC.ok) {
                const data = await resS.json();
                const citasData = await resC.json();
                const sesiones = data.filter(s => s.estadoCita !== 'Cancelada')
                    .sort((a, b) => parsearFecha(b.fecha) - parsearFecha(a.fecha));

                totalBadge.innerText = `${sesiones.length} Sesiones`;
                renderSesiones(sesiones, citasData);
            }
        } catch (e) {
            container.innerHTML = '<div class="loading-state">Error al cargar los datos.</div>';
        }
    }

    /**
     * Renderiza las cards de sesión con lógica de edición en línea.
     */
    function renderSesiones(sesiones, citasData) {
        if (sesiones.length === 0) {
            container.innerHTML = `
                <div class="session-full-card empty-sessions-card">
                    <div class="no-sessions-content">
                        <p>Este paciente no tiene sesiones registradas.</p>
                    </div>
                </div>`;
            return;
        }

        container.innerHTML = sesiones.map(s => {
            const f = parsearFecha(s.fecha);
            if (!f) return '';
            const dia = f.getDate();
            const mesAnio = f.toLocaleString('es', { month: 'short', year: 'numeric' });
            const hora = f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const idS = s.idSesion || s.id;

            const mod = s.modalidad || 'Presencial';
            const modClass = mod.toLowerCase().includes('online') ? 'tag-online' : 'tag-presencial';

            const tipo = s.tipoSesion || 'Individual';
            const tipoClass = `tag-${tipo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;

            const estado = s.estadoCita || 'Programada';
            const estadoNorm = estado.toLowerCase().replace(/ /g, '_').trim();
            const isNoPresentado = estadoNorm === 'no_presentado';

            let estadoClass = 'tag-blue';
            if (estadoNorm === 'realizada') estadoClass = 'tag-success';
            else if (estadoNorm === 'no_presentado') estadoClass = 'tag-danger';
            const paidStatusText = s.facturada ? 'Pagada' : 'Pendiente';

            const estadoDisplay = estado === 'No_Presentado' ? 'No Presentado' : estado;

            const modOptions = ['Presencial', 'Online'].filter(m => m.toLowerCase() !== mod.toLowerCase())
                .map(m => `<div onclick="window.cambiarModalidad(event, ${idS}, '${m}')">${m}</div>`).join('');

            const tipoNormalizado = tipo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            let tipoOptions = '';
            let tipoTagClickableClass = 'clickable-tag';
            let tipoTagOnClick = `onclick="window.toggleTipoDropdown(event, ${idS})"`;

            if (tipoNormalizado === 'pareja') {
                tipoTagClickableClass = '';
                tipoTagOnClick = '';
            } else {
                tipoOptions = ['Individual', 'Sexología'].filter(t =>
                    t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() !== tipoNormalizado)
                    .map(t => `<div onclick="window.cambiarTipo(event, ${idS}, '${t}')">${t}</div>`).join('');
            }

            const estadoNormalizado = estadoDisplay.toLowerCase().replace(/ /g, '_');
            const estadoOptions = ['Programada', 'Realizada', 'No Presentado'].filter(e =>
                e.toLowerCase().replace(/ /g, '_') !== estadoNormalizado)
                .map(e => `<div onclick="window.cambiarEstado(event, ${idS}, '${e}')">${e}</div>`).join('');

            const paidOptions = s.facturada
                ? `<div onclick="window.cambiarFacturada(event, ${idS}, false)">Pendiente</div>`
                : `<div onclick="window.cambiarFacturada(event, ${idS}, true)">Pagada</div>`;

            const citaAsociada = citasData.find(c => (c.id === s.idCita || c.idCita === s.idCita));

            let extraPatientsHtml = '';
            if (citaAsociada && citaAsociada.pacientes && citaAsociada.pacientes.length > 1) {
                const otrosPacientes = citaAsociada.pacientes
                    .filter(p => (p.id || p.idPaciente) != idPaciente);

                if (otrosPacientes.length > 0) {
                    const links = otrosPacientes.map(p => {
                        const pid = p.id || p.idPaciente;
                        return `<span class="involved-patient-link" onclick="event.stopPropagation(); window.location.href='paciente-detalle.html?id=${pid}'">${p.nombre} ${p.apellidos}</span>`;
                    }).join(' , ');
                    extraPatientsHtml = `<div class="session-involved-info"><i class="fa-solid fa-user-group"></i> Con: <strong>${links}</strong></div>`;
                }
            }

            return `
                <div class="session-full-card ${isNoPresentado ? 'is-no-presentado' : ''}">
                    <div class="session-info-left">
                        <div class="info-group">
                            <div class="session-date-box">
                                <span class="day">${dia}</span>
                                <span class="month-year">${mesAnio}</span>
                            </div>
                            <span class="session-time-text">${hora}</span>
                        </div>

                        <div class="info-divider"></div>
                        
                        <div class="info-group">
                            <div class="status-selector-wrapper">
                                <span class="tag ${modClass} clickable-tag" onclick="window.toggleModalidadDropdown(event, ${idS})">${mod}</span>
                                <div id="dropdown-modalidad-${idS}" class="status-options-dropdown">
                                    ${modOptions}
                                </div>
                            </div>
                            <div class="status-selector-wrapper">
                                <span class="tag ${tipoClass} ${tipoTagClickableClass}" ${tipoTagOnClick}>${tipo}</span>
                                <div id="dropdown-tipo-${idS}" class="status-options-dropdown">
                                    ${tipoOptions}
                                </div>
                            </div>
                        </div>

                        <div class="info-divider"></div>

                        <div class="info-group">
                            <div class="status-selector-wrapper">
                                <span class="tag ${estadoClass} clickable-tag" onclick="window.toggleEstadoDropdown(event, ${idS})">${estadoDisplay}</span>
                                <div id="dropdown-estado-${idS}" class="status-options-dropdown">
                                    ${estadoOptions}
                                </div>
                            </div>
                            <div class="status-selector-wrapper">
                                <span class="tag ${s.facturada ? 'tag-success' : 'tag-danger'} clickable-tag payment-tag" onclick="window.togglePaidDropdown(event, ${idS})">
                                    ${s.facturada ? '<i class="fa-solid fa-euro-sign"></i>' : '<i class="fa-solid fa-xmark"></i>'} 
                                    ${paidStatusText}
                                </span>
                                <div id="dropdown-paid-${idS}" class="status-options-dropdown">
                                    ${paidOptions}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="session-content-right">
                        <div class="session-header-row">
                            ${extraPatientsHtml}
                            <a href="sesion.html?idPaciente=${idPaciente}&idCita=${s.idCita}" class="btn-mostrar-sesion">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> MOSTRAR SESIÓN
                            </a>
                        </div>
                        ${(() => {
                    const blocks = [
                        renderBlock('MOTIVO', s.motivoSesion),
                        renderBlock('CONTENIDOS TRATADOS', s.contenidos),
                        renderBlock('INTERVENCIONES', s.intervenciones),
                        renderBlock('OBSERVACIONES CLÍNICAS', s.observaciones),
                        renderBlock('HIPÓTESIS DE TRABAJO', s.hipotesis)
                    ].join('');

                    return blocks !== '' ? blocks : '<div class="centered-content"><div class="no-data-msg">No hay datos recogidos de la sesión.</div></div>';
                })()}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Genera un bloque de texto si existe contenido.
     */
    function renderBlock(title, text) {
        if (!text || text.trim() === '') return '';
        return `
            <div class="content-block">
                <span class="block-title">${title}:</span>
                <p class="block-text">${text}</p>
            </div>
        `;
    }

    document.addEventListener('click', () => {
        document.querySelectorAll('.status-options-dropdown').forEach(d => d.classList.remove('show'));
    });

    /**
     * Controladores de visibilidad para dropdowns en el historial.
     */

    window.toggleModalidadDropdown = (event, idSesion) => {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-modalidad-${idSesion}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    };

    window.toggleTipoDropdown = (event, idSesion) => {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-tipo-${idSesion}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        if (dropdown) dropdown.classList.toggle('show');
    };

    window.toggleEstadoDropdown = (event, idSesion) => {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-estado-${idSesion}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        if (dropdown) dropdown.classList.toggle('show');
    };

    window.togglePaidDropdown = (event, idSesion) => {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-paid-${idSesion}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    };

    /**
     * Actualiza de forma persistente un campo de la sesión.
     */
    async function updateSessionField(idSesion, fieldName, newValue) {
        try {
            const resGet = await fetch(`${API_BASE}/sesiones/${idSesion}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!resGet.ok) throw new Error('Failed to fetch session for update.');
            const sessionToUpdate = await resGet.json();

            const updateDto = {
                id: sessionToUpdate.id,
                idCita: sessionToUpdate.idCita,
                estadoCita: sessionToUpdate.estadoCita,
                tipoSesion: sessionToUpdate.tipoSesion,
                duracionMinutos: sessionToUpdate.duracionMinutos,
                precio: sessionToUpdate.precio,
                facturada: sessionToUpdate.facturada,
                procedenciaSesion: sessionToUpdate.procedencia,
                urlVideollamada: sessionToUpdate.urlVideollamada,
                motivoSesion: sessionToUpdate.motivoSesion,
                contenidos: sessionToUpdate.contenidos,
                intervenciones: sessionToUpdate.intervenciones,
                observaciones: sessionToUpdate.observaciones,
                hipotesis: sessionToUpdate.hipotesis,
                modalidad: sessionToUpdate.modalidad
            };
            updateDto[fieldName] = newValue;

            const resPut = await fetch(`${API_BASE}/sesiones/${idSesion}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(updateDto)
            });

            if (resPut.ok) {
                cargarDatos(); // Re-render all sessions to reflect changes
            } else {
                UiModal.info("Error al actualizar la sesión.", "Error");
            }
        } catch (e) {
            console.error(`Error updating session ${fieldName}:`, e);
            UiModal.info("Error de conexión o servidor al actualizar.", "Error");
        }
    }

    window.cambiarModalidad = (event, idSesion, nuevaModalidad) => {
        event.stopPropagation();
        updateSessionField(idSesion, 'modalidad', nuevaModalidad);
    };

    window.cambiarTipo = (event, idSesion, nuevoTipo) => {
        event.stopPropagation();
        updateSessionField(idSesion, 'tipoSesion', nuevoTipo);
    };

    window.cambiarEstado = (event, idSesion, nuevoEstado) => {
        event.stopPropagation();
        updateSessionField(idSesion, 'estadoCita', nuevoEstado);
    };

    window.cambiarFacturada = (event, idSesion, isPaid) => {
        event.stopPropagation();
        updateSessionField(idSesion, 'facturada', isPaid);
    };

    cargarDatos();
});