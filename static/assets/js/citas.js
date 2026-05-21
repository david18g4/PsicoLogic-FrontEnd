/**
 * Gestión de Agenda y Calendario.
 * Implementa FullCalendar para la visualización de citas, gestión de estados y arrastre.
 */
document.addEventListener('DOMContentLoaded', async function () {

    const datosSesion = user;
    const calendarEl = document.getElementById('calendar');
    let todasLasCitas = [];
    let pacientesData = [];
    let pacientesSeleccionados = [];
    let pacienteSelectorActual = null;
    let rangeInicioCargado = null;
    let rangeFinCargado = null;

    if (!datosSesion || !token) return;

    /**
     * Obtiene la lista completa de pacientes asociados al psicólogo.
     */
    async function cargarPacientes() {
        try {
            const idPsicologo = datosSesion.idPsicologo || datosSesion.id;
            if (!idPsicologo) return;

            const response = await fetch(`${API_BASE}/pacientes?idPsicologo=${idPsicologo}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                pacientesData = await response.json();
                console.log("Pacientes cargados:", pacientesData.length);
            }
        } catch (error) {
            console.error("Error al cargar pacientes:", error);
        }
    }
    await cargarPacientes();

    const pacienteStatusTag = document.getElementById('paciente-status-tag');
    const pacienteStatusOptions = document.getElementById('paciente-status-options');

    /**
     * Muestra y aplica clases visuales al tag de estado del paciente en el modal diario.
     */
    function mostrarEstadoPaciente(idPaciente, estadoActual) {
        if (!pacienteStatusTag) return;

        pacienteSelectorActual = idPaciente;
        const estadosPosibles = ["Alta", "Seguimiento", "Evaluación"];

        pacienteStatusTag.setAttribute('data-estado', estadoActual);
        pacienteStatusTag.textContent = estadoActual || '---';

        pacienteStatusTag.className = 'tag clickable-tag';
        if (estadoActual === 'Alta') pacienteStatusTag.classList.add('tag-success');
        else if (estadoActual === 'Seguimiento') pacienteStatusTag.classList.add('tag-blue');
        else if (estadoActual === 'Evaluación') pacienteStatusTag.classList.add('tag-warning');

        const otrosEstados = estadosPosibles.filter(est => est !== estadoActual);
        if (pacienteStatusOptions) {
            pacienteStatusOptions.innerHTML = otrosEstados.map(est =>
                `<div onclick="window.cambiarEstadoPacienteDesdeModal(event, '${est}')">${est}</div>`
            ).join('');
        }

        pacienteStatusTag.style.display = 'inline-block';
    }

    if (pacienteStatusTag) {
        pacienteStatusTag.addEventListener('click', (e) => {
            e.stopPropagation();
            pacienteStatusOptions.classList.toggle('show');
        });
    }

    if (pacienteStatusOptions) {
        document.addEventListener('click', () => {
            pacienteStatusOptions.classList.remove('show');
        });
    }

    /**
     * Helper para normalizar la obtención del ID de un objeto paciente.
     */
    function getPatientId(p) {
        return p?.idPaciente ?? p?.id_paciente ?? p?.id ?? null;
    }

    /**
     * Actualiza el estado clínico de un paciente mediante una llamada PUT.
     */
    window.cambiarEstadoPacienteDesdeModal = async (event, nuevoEstado) => {
        event.stopPropagation();
        if (!pacienteSelectorActual) return;

        const paciente = pacientesData.find(p => getPatientId(p) === pacienteSelectorActual);
        if (!paciente) return;

        const datosActualizados = { ...paciente, estadoPaciente: nuevoEstado };

        try {
            const response = await fetch(`${API_BASE}/pacientes/${pacienteSelectorActual}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosActualizados)
            });

            if (response.ok) {
                mostrarEstadoPaciente(pacienteSelectorActual, nuevoEstado);
                const idx = pacientesData.findIndex(p => getPatientId(p) === pacienteSelectorActual);
                if (idx !== -1) pacientesData[idx].estadoPaciente = nuevoEstado;
                pacienteStatusOptions.classList.remove('show');
            }
        } catch (error) { console.error("Error al cambiar estado:", error); }
    };

    /**
     * Normaliza los formatos de fecha recibidos del backend (String o Array de números).
     */
    function normalizarFecha(fechaRaw) {
        if (!fechaRaw) return null;
        if (Array.isArray(fechaRaw)) {
            return new Date(fechaRaw[0], fechaRaw[1] - 1, fechaRaw[2], fechaRaw[3] || 0, fechaRaw[4] || 0).toISOString();
        }
        return fechaRaw;
    }

    /**
     * Inicialización y configuración de FullCalendar.
     */
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        firstDay: 1,
        slotMinTime: '08:00:00',
        slotMaxTime: '21:00:00',
        allDaySlot: false,
        expandRows: true,
        handleWindowResize: true,
        slotEventOverlap: false,
        snapDuration: '00:15:00',
        editable: true,
        height: 'auto',
        nowIndicator: true,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,listWeek'
        },
        buttonText: {
            today: 'Hoy', month: 'Mes', week: 'Semana', list: 'Agenda'
        },
        noEventsContent: 'Ninguna cita por el momento',

        datesSet: function () {
            const eventosActivos = calendarEl.querySelectorAll('.fc-daygrid-event, .fc-timegrid-event');
            eventosActivos.forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'scale(0.95)';
                el.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            });
        },

        loading: function (isLoading) {
            if (isLoading) {
                calendarEl.classList.add('fc-state-loading');
            } else {
                setTimeout(() => {
                    calendarEl.classList.remove('fc-state-loading');
                }, 100);
            }
        },

        events: async function (info, successCallback, failureCallback) {
            try {
                const startReq = new Date(info.start);
                const endReq = new Date(info.end);

                const mapCitasToEvents = (citas) => {
                    return citas.map(cita => {
                        const modStr = (cita.modalidad || 'Presencial').toLowerCase();
                        const colorClass = modStr.includes('online') ? 'evento-online' : 'evento-individual';
                        const estadoCita = cita.estadoCita || 'Programada';
                        let tipoCitaNormalizado = String(cita.tipoCita || 'Individual').toLowerCase();

                        if (tipoCitaNormalizado === "sexología") {
                            tipoCitaNormalizado = "sexologia";
                        }

                        const nombres = (cita.pacientes || []).map(p => `${p.nombre} ${p.apellidos}`);
                        const tituloFinal = nombres.join(' , ') || 'Cita';
                        const fechaInicio = new Date(cita.fechaHora);
                        const duracionMinutos = cita.duracion || 60;
                        const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);

                        const estadoClass = `event-${estadoCita.toLowerCase().replace(/ /g, '-').replace(/_/g, '-')}`;

                        return {
                            id: cita.id,
                            title: tituloFinal,
                            start: cita.fechaHora,
                            end: fechaFin,
                            className: [colorClass, `cat-${tipoCitaNormalizado}`, estadoClass],
                            extendedProps: {
                                citaData: cita
                            }
                        };
                    });
                };

                const ejecutarVaciadoSincronizado = (datosAPintar) => {
                    const scrollActual = window.scrollY;
                    const alturaActual = calendarEl.offsetHeight;
                    calendarEl.style.minHeight = `${alturaActual}px`;

                    successCallback([]);

                    setTimeout(() => {
                        successCallback(datosAPintar);
                        window.scrollTo(window.scrollX, scrollActual);
                        setTimeout(() => {
                            calendarEl.style.minHeight = '';
                        }, 50);
                    }, 10);
                };

                if (rangeInicioCargado && rangeFinCargado && startReq >= rangeInicioCargado && endReq <= rangeFinCargado) {
                    successCallback(mapCitasToEvents(todasLasCitas));
                    return;
                }

                const fetchStart = new Date(info.start);
                const fetchEnd = new Date(info.end);

                const startStr = fetchStart.toISOString().split('T')[0] + "T00:00:00";
                const endStr = fetchEnd.toISOString().split('T')[0] + "T23:59:59";

                const response = await fetch(`${API_BASE}/citas/fechas?inicio=${startStr}&fin=${endStr}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.status === 401 || response.status === 403) {
                    forzarLogout();
                    return;
                }

                const fetchedCitas = await response.json();

                todasLasCitas = fetchedCitas.filter(c => (c.estadoCita || '').toLowerCase() !== 'cancelada')
                    .map(cita => {
                        cita.fechaHora = normalizarFecha(cita.fechaHora);
                        return {
                            ...cita,
                        };
                    });

                rangeInicioCargado = fetchStart;
                rangeFinCargado = fetchEnd;

                successCallback(mapCitasToEvents(todasLasCitas));
                ejecutarVaciadoSincronizado(mapCitasToEvents(todasLasCitas));
            } catch (error) {
                failureCallback(error);
            }
        },

        eventClick: function (info) {
            console.log('eventClick', info.event.startStr);
            const dateStr = info.event.startStr.split('T')[0];
            abrirModalCitasDia(dateStr);
        },

        dateClick: function (info) {
            console.log('dateClick', info.dateStr);
            abrirModalCitasDia(info.dateStr);
        },

        eventDrop: function (info) {
            actualizarCitaTrasArrastre(info);
        },

        eventResize: function (info) {
            actualizarCitaTrasArrastre(info);
        },

        eventDidMount: function (info) {

        }
    });

    calendar.render();

    /**
     * Persiste los cambios de fecha o duración realizados mediante arrastre/redimensión 
     * en el calendario.
     */
    async function actualizarCitaTrasArrastre(info) {
        const idCita = info.event.id;
        const citaOriginal = todasLasCitas.find(c => (c.idCita || c.id) == idCita);

        if (!citaOriginal) {
            info.revert();
            return;
        }

        const date = info.event.start;
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const nuevaFechaHora = `${y}-${m}-${d}T${hh}:${mm}:00`;

        const start = info.event.start;
        const end = info.event.end || new Date(start.getTime() + (citaOriginal.duracion || 60) * 60000);
        let duracionReal = Math.round((end - start) / 60000);

        const permitidas = [30, 60, 75];
        let nuevaDuracion = permitidas.reduce((prev, curr) =>
            Math.abs(curr - duracionReal) < Math.abs(prev - duracionReal) ? curr : prev
        );

        if (duracionReal < 30) nuevaDuracion = 30;
        if (duracionReal > 75) nuevaDuracion = 75;

        info.event.setEnd(new Date(info.event.start.getTime() + nuevaDuracion * 60000));

        const idPacs = citaOriginal.pacientes
            ? citaOriginal.pacientes.map(p => p.id)
            : [];

        const body = {
            id: parseInt(idCita),
            idPacientes: [...new Set(idPacs)],
            idPsicologo: datosSesion.idPsicologo || datosSesion.id,
            modalidad: citaOriginal.modalidad === 'Online' ? 'Online' : 'Presencial',
            fechaHora: nuevaFechaHora,
            duracionMinutos: nuevaDuracion,
            tipoCita: citaOriginal.tipoCita,
            estadoCita: citaOriginal.estadoCita || 'Programada'
        };

        try {
            const response = await fetch(`${API_BASE}/citas/${idCita}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error("Error en servidor");

            const citaActualizada = await response.json();

            rangeInicioCargado = null;
            rangeFinCargado = null;
            calendar.refetchEvents();

            const modalidadFinal = (citaActualizada.modalidad || body.modalidad || '').toLowerCase();
            const esOnline = modalidadFinal.includes('online');

            const tieneUrl = !!(citaActualizada.urlVideollamada ||
                (citaActualizada.sesion && citaActualizada.sesion.urlVideollamada) ||
                citaActualizada.urlVideoLlamada);

            if (esOnline && !tieneUrl) {
                abrirModalAvisoZoom();
            }
        } catch (error) {
            console.error("Error al mover la cita:", error);
            UiModal.info("No se pudo actualizar la cita tras el movimiento.", "Error");
            info.revert();
        }
    }

    const observer = new ResizeObserver(() => {
        calendar.updateSize();
    });
    observer.observe(calendarEl);

    /**
     * Implementación del buscador reactivo de pacientes para la selección múltiple
     * en el formulario de citas.
     */
    const inputBusqueda = document.getElementById('busquedaPacienteInput');
    const resContenedor = document.getElementById('resultadosBusquedaPacientes');
    const pacientesContainer = document.getElementById('pacientesSeleccionadosContainer');
    const pacientesListDiv = document.getElementById('pacientesSeleccionadosList');

    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', function () {
            const term = this.value.toLowerCase().trim();
            resContenedor.innerHTML = '';

            if (term.length < 1) {
                resContenedor.style.display = 'none';
                return;
            }

            const filtrados = pacientesData.filter(p => {
                const nombreCompleto = `${p.nombre || ''} ${p.apellidos || ''}`.toLowerCase();
                const dni = (p.dni || '').toLowerCase();
                const idPac = getPatientId(p);
                const yaSeleccionado = pacientesSeleccionados.some(sel => getPatientId(sel) == idPac);
                return !yaSeleccionado && (nombreCompleto.includes(term) || dni.includes(term));
            });

            if (filtrados.length > 0) {
                filtrados.forEach(p => {
                    const div = document.createElement('div');
                    div.className = 'paciente-option';
                    const nombreAMostrar = p.nombreCompleto || `${p.nombre} ${p.apellidos}`;
                    div.innerHTML = `<strong>${nombreAMostrar}</strong><span>DNI: ${p.dni || '---'}</span>`;
                    div.onclick = () => {
                        agregarPacienteSeleccionado(p);
                        inputBusqueda.value = '';
                        resContenedor.style.display = 'none';
                    };
                    resContenedor.appendChild(div);
                });
                resContenedor.style.display = 'block';
            } else {
                resContenedor.style.display = 'none';
            }
        });
    }

    document.addEventListener('click', (e) => {
        if (resContenedor && inputBusqueda && !inputBusqueda.contains(e.target) && !resContenedor.contains(e.target)) {
            resContenedor.style.display = 'none';
        }
    });

    /**
     * Añade un paciente al array de seleccionados, validando el límite (máximo 2).
     */
    function agregarPacienteSeleccionado(paciente) {
        const idPac = getPatientId(paciente);

        if (pacientesSeleccionados.length >= 2) {
            UiModal.info("No se pueden añadir más de dos pacientes a una sesión.", "Límite alcanzado");
            return;
        }

        if (pacientesSeleccionados.some(p => getPatientId(p) == idPac)) {
            return;
        }

        const pacienteCompleto = pacientesData.find(p => getPatientId(p) == idPac);
        pacientesSeleccionados.push(pacienteCompleto || paciente);

        actualizarVistaSeleccionados();
        verificarYCambiarATipoPareja();
    }

    function removerPacienteSeleccionado(idPaciente) {
        pacientesSeleccionados = pacientesSeleccionados.filter(p => getPatientId(p) !== idPaciente);
        actualizarVistaSeleccionados();
        verificarYCambiarATipoPareja();
    }

    /**
     * Actualiza el DOM para reflejar las tarjetas de los pacientes seleccionados.
     */
    function actualizarVistaSeleccionados() {
        pacientesListDiv.innerHTML = '';

        const idsSeleccionados = pacientesSeleccionados.map(getPatientId).filter(id => id != null);
        const inputIdsSeleccionados = document.getElementById('idPacientesSeleccionados');
        if (inputIdsSeleccionados) {
            inputIdsSeleccionados.value = JSON.stringify(idsSeleccionados);
        }

        pacientesContainer.classList.add('show');

        if (pacientesSeleccionados.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'paciente-placeholder-card';
            placeholder.innerHTML = `
                <div class="paciente-seleccionado-avatar"><i class="fa-solid fa-user"></i></div>
                <div class="paciente-seleccionado-info">
                    <span class="paciente-seleccionado-nombre">Seleccione un paciente</span>
                </div>
            `;
            pacientesListDiv.appendChild(placeholder);
        }

        pacientesSeleccionados.forEach(paciente => {
            const idPac = getPatientId(paciente);
            const nombreCompleto = paciente.nombreCompleto || `${paciente.nombre} ${paciente.apellidos}`;
            const dni = paciente.dni || 'S/N';

            const card = document.createElement('div');
            card.className = 'paciente-seleccionado-card';
            card.innerHTML = `
                <div class="paciente-seleccionado-avatar"><i class="fa-solid fa-user"></i></div>
                <div class="paciente-seleccionado-info">
                    <span class="paciente-seleccionado-nombre">${nombreCompleto}</span>
                    <span class="paciente-seleccionado-dni">DNI: ${dni}</span>
                </div>
                <button type="button" class="paciente-seleccionado-remove" onclick="window.removerPacienteSeleccionado(${idPac})">
                    <i class="fa-solid fa-times"></i>
                </button>
            `;
            pacientesListDiv.appendChild(card);
        });

        const numPacientes = pacientesSeleccionados.length;
        let alturaNecesaria;
        if (numPacientes === 1) {
            alturaNecesaria = 65.33 + 24;
        } else if (numPacientes >= 2) {
            alturaNecesaria = 168;
        } else {
            alturaNecesaria = 65.33 + 24;
        }
        pacientesContainer.style.height = alturaNecesaria + 'px';
    }

    window.removerPacienteSeleccionado = (idPaciente) => {
        removerPacienteSeleccionado(idPaciente);
    };

    /**
     * Cambia automáticamente el tipo de cita a 'Pareja' si hay dos pacientes seleccionados.
     */
    function verificarYCambiarATipoPareja() {
        const selectTipoCita = document.getElementById('tipoCita');
        if (!selectTipoCita) return;

        if (pacientesSeleccionados.length > 1) {
            selectTipoCita.value = 'Pareja';
        } else if (pacientesSeleccionados.length <= 1 && selectTipoCita.value === 'Pareja') {
            selectTipoCita.value = 'Individual';
        }
    }

    /**
     * Abre el modal que lista todas las citas programadas para un día concreto.
     */
    function abrirModalCitasDia(fechaISO) {
        const modal = document.getElementById('modalCitas');
        const listaContenedor = document.getElementById('listaCitasDia');
        const titulo = document.getElementById('fechaSeleccionada');

        if (!listaContenedor || !modal) return;

        modal.setAttribute('data-fecha-click', fechaISO);
        listaContenedor.innerHTML = '';
        const fechaObj = new Date(fechaISO);
        titulo.textContent = `Citas del ${fechaObj.toLocaleDateString()}`;

        const fechaBusqueda = fechaISO.split('T')[0];

        const citasDia = todasLasCitas.filter(c => c.fechaHora.split('T')[0] === fechaBusqueda && (c.estadoCita || '').toLowerCase() !== 'cancelada');
        citasDia.sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

        if (citasDia.length > 0) {
            const firstCita = citasDia[0];
            const firstPatient = firstCita.pacientes && firstCita.pacientes.length > 0 ? firstCita.pacientes[0] : null;
            if (firstPatient) {
                const pacienteCompleto = pacientesData.find(p => getPatientId(p) === firstPatient.id);
                if (pacienteCompleto) {
                    mostrarEstadoPaciente(getPatientId(pacienteCompleto), pacienteCompleto.estadoPaciente);
                } else {
                    mostrarEstadoPaciente(firstPatient.id, 'Desconocido');
                }
            }
        } else if (pacienteStatusTag) {
            pacienteStatusTag.style.display = 'none';
        }

        if (citasDia.length === 0) {
            listaContenedor.classList.add('empty-state');
            listaContenedor.innerHTML = '<p style="text-align:center; color:#718096; margin: 0;">No hay citas.</p>';
        } else {
            listaContenedor.classList.remove('empty-state');
            citasDia.forEach(cita => {
                const fechaInicio = new Date(cita.fechaHora);
                const duracion = cita.duracion || 60;
                const fechaFin = new Date(fechaInicio.getTime() + (duracion * 60000));
                const esPasada = fechaFin < new Date();

                const hora = new Date(cita.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const modalidad = cita.modalidad || 'Presencial';
                const modLower = modalidad.toLowerCase();
                const modContainerClass = modLower.includes('online') ? 'online' : 'presencial';

                const modTagClass = modLower.includes('online') ? 'tag-online' : 'tag-presencial';
                const tipoTagClass = `tag-${String(cita.tipoCita || 'Individual').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`;
                const claseColor = modLower.includes('online') ? 'evento-online' : 'evento-individual';

                let catCSS = String(cita.tipoCita || 'Individual').toLowerCase()
                    .replace('á', 'a').replace('é', 'e').replace('í', 'i').replace('ó', 'o').replace('ú', 'u');

                const nombresGrupo = (cita.pacientes || []).map(p => `${p.nombre} ${p.apellidos}`).join(' , ');
                const estado = cita.estadoCita || 'Programada';
                const estadoNorm = estado.toLowerCase().replace(/ /g, '_');

                const availableStatuses = ['Programada', 'Realizada', 'No_Presentado'];
                const filteredOptionsHtml = availableStatuses
                    .filter(s => s.toLowerCase() !== estadoNorm)
                    .map(s => `<div onclick="window.cambiarEstadoCitaModal(event, ${cita.id}, '${s}')">${s === 'No_Presentado' ? 'No Presentado' : s}</div>`)
                    .join('');

                let statusTagClass = 'tag-blue';
                let statusIcon = 'fa-clock';
                let modalityIcon = modLower.includes('online') ? 'fa-video' : 'fa-user-tie';

                if (estadoNorm === 'realizada' || estadoNorm === 'completada') {
                    statusTagClass = 'tag-success';
                    statusIcon = 'fa-circle-check status-realizada';
                } else if (estadoNorm === 'no_presentado') {
                    statusTagClass = 'tag-danger';
                    statusIcon = 'fa-circle-xmark status-no-presentado';
                } else if (estadoNorm === 'cancelada') {
                    statusTagClass = 'tag-danger';
                    statusIcon = 'fa-ban';
                } else if (esPasada) {
                    statusIcon = 'fa-solid fa-triangle-exclamation status-aviso';
                }

                const firstPatientId = (cita.pacientes && cita.pacientes.length > 0) ? cita.pacientes[0].id : null;

                const div = document.createElement('div');
                div.className = `cita-item-card ${claseColor} cat-${catCSS} estado-${estadoNorm}`;
                div.innerHTML = `
                    <div class="cita-card-header">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="fa-solid ${statusIcon}"></i>
                            <strong>${nombresGrupo}</strong>
                        </div>
                        <button class="btn-icon" title="Editar" onclick="event.stopPropagation(); editarCita(${cita.id})">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                    </div>
                    <div class="cita-card-body">
                        <div class="cita-info-sub" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <div class="cita-tags-container ${modContainerClass}">
                                <span class="tag" style="background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; padding: 2px 8px; font-size: 0.7rem; margin: 0;"><i class="fa-regular fa-clock"></i> ${hora}</span>
                                <span class="tag ${modTagClass}" style="padding: 2px 8px; font-size: 0.7rem; margin: 0;"><i class="fa-solid ${modalityIcon}"></i> ${modalidad}</span>
                                <span class="tag ${tipoTagClass}" style="padding: 2px 8px; font-size: 0.7rem; margin: 0;">${cita.tipoCita}</span>
                            </div>
                            <div class="status-selector-wrapper">
                                <span class="tag ${statusTagClass} clickable-tag" onclick="window.toggleStatusDropdownModal(event, ${cita.id})">
                                    ${estado === 'No_Presentado' ? 'No Presentado' : estado}
                                </span>
                                <div id="dropdown-status-modal-${cita.id}" class="status-options-dropdown">
                                    ${filteredOptionsHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                div.onclick = (e) => {
                    if (e.target.closest('.status-selector-wrapper')) {
                        return;
                    }
                    if (firstPatientId) {
                        window.location.href = `sesion.html?idPaciente=${firstPatientId}&idCita=${cita.id}&nombre=${encodeURIComponent(nombresGrupo)}`;
                    }
                };
                listaContenedor.appendChild(div);
            });
        }
        modal.style.display = 'flex';
    }

    /**
     * Alterna la visibilidad del desplegable de cambio de estado en el modal.
     */
    window.toggleStatusDropdownModal = function (event, idCita) {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-status-modal-${idCita}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    };

    /**
     * Ejecuta el cambio de estado de una cita y refresca el calendario.
     */
    window.cambiarEstadoCitaModal = async function (event, idCita, nuevoEstado) {
        event.stopPropagation();
        const cita = todasLasCitas.find(c => c.id === idCita);
        if (!cita) return;

        const idPacs = cita.pacientes ? cita.pacientes.map(p => p.id || p.idPaciente) : [parseInt(cita.idPaciente)];

        const body = {
            id: cita.id,
            idPacientes: (cita.pacientes || []).map(p => p.id),
            idPsicologo: datosSesion.idPsicologo || datosSesion.id,
            modalidad: cita.modalidad,
            fechaHora: cita.fechaHora,
            duracionMinutos: cita.duracion,
            tipoCita: cita.tipoCita,
            estadoCita: nuevoEstado
        };

        try {
            const response = await fetch(`${API_BASE}/citas/${idCita}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const updatedCita = await response.json();

                updatedCita.fechaHora = normalizarFecha(updatedCita.fechaHora);

                const index = todasLasCitas.findIndex(c => c.id === idCita);
                if (index !== -1) {
                    todasLasCitas[index] = updatedCita;
                }

                rangeInicioCargado = null;
                rangeFinCargado = null;
                calendar.refetchEvents();

                const fechaISO = document.getElementById('modalCitas').getAttribute('data-fecha-click');
                abrirModalCitasDia(fechaISO);
            }
        } catch (error) { console.error("Error al cambiar estado:", error); }
    };

    document.addEventListener('click', () => {
        document.querySelectorAll('.status-options-dropdown').forEach(d => d.classList.remove('show'));
    });

    /**
     * Abre el modal de selección de paciente para citas nuevas.
     */
    window.abrirModalSeleccionarPaciente = function () {
        const modal = document.getElementById('modalSeleccionPaciente');
        modal.style.display = 'flex';
        renderizarTablaPacientes(pacientesData);
    };

    window.cerrarModalSeleccion = function () {
        document.getElementById('modalSeleccionPaciente').style.display = 'none';
    };

    /**
     * Filtra la tabla de pacientes en el modal de búsqueda.
     */
    window.filtrarTablaPacientes = function (termino) {
        const filtrados = pacientesData.filter(p => {
            const nombreCompleto = `${p.nombre || ''} ${p.apellidos || ''}`.toLowerCase();
            const dni = (p.dni || '').toLowerCase();
            return nombreCompleto.includes(termino.toLowerCase()) || dni.includes(termino.toLowerCase());
        });
        renderizarTablaPacientes(filtrados);
    };

    /**
     * Genera dinámicamente el contenido de la tabla de selección de pacientes.
     */
    function renderizarTablaPacientes(lista) {
        const cuerpo = document.getElementById('cuerpoTablaPacientes');
        cuerpo.innerHTML = '';

        lista.forEach(p => {
            const nombre = p.nombreCompleto || `${p.nombre} ${p.apellidos}`;
            const tr = document.createElement('tr');

            tr.style.cursor = 'pointer';
            tr.onclick = () => seleccionarEstePaciente(p.id, nombre);

            tr.innerHTML = `
        <td>${p.dni || '---'}</td>
        <td>${nombre}</td>
    `;

            cuerpo.appendChild(tr);
        });
    }

    /**
     * Carga los datos de una cita existente en el formulario para su edición.
     */
    window.editarCita = function (id) {
        const cita = todasLasCitas.find(c => c.id == id);
        if (!cita) return;

        const fechaActualModal = document.getElementById('modalCitas').getAttribute('data-fecha-click');
        document.getElementById('modalNuevaCita').setAttribute('data-refresh-date', fechaActualModal);

        abrirModalNuevaCita();

        document.getElementById('tituloModalCita').textContent = "Editar Cita";
        document.getElementById('idCitaEditando').value = cita.id;

        pacientesSeleccionados = [];

        if (cita.pacientes && cita.pacientes.length > 0) {
            cita.pacientes.forEach(p => {
                agregarPacienteSeleccionado(p);
            });
        }

        const fecha = normalizarFecha(cita.fechaHora).split('T')[0];
        const hora = normalizarFecha(cita.fechaHora).split('T')[1].substring(0, 5);
        document.getElementById('fechaCita').value = fecha;
        document.getElementById('horaCita').value = hora;

        document.getElementById('duracionCita').value = cita.duracion || 60;
        document.getElementById('modalidadCita').value = cita.modalidad || "Presencial";
        document.getElementById('tipoCita').value = cita.tipoCita || "Individual";

        document.getElementById('rowEstadoCita').style.display = 'block';
        document.getElementById('estadoCitaForm').value = cita.estadoCita || "Programada";

        if (cita.estadoCita !== 'Cancelada') {
            document.getElementById('btnCancelarCita').style.display = 'inline-block';
        }
    };

    window.seleccionarEstePaciente = function (id, nombre) {
        const paciente = {
            id: id,
            nombre: nombre.split(' ')[0],
            apellidos: nombre.split(' ').slice(1).join(' ')
        };
        agregarPacienteSeleccionado(paciente);
        cerrarModalSeleccion();
    };

    /**
     * Configura y abre el modal de creación de nueva cita.
     */
    window.abrirModalNuevaCita = function () {
        cerrarModal();
        const modal = document.getElementById('modalNuevaCita');
        const inputFecha = document.getElementById('fechaCita');
        const inputHora = document.getElementById('horaCita');
        const containerPsico = document.getElementById('containerSeleccionPsicologo');

        document.getElementById('idCitaEditando').value = '';
        document.getElementById('rowEstadoCita').style.display = 'none';
        document.getElementById('btnCancelarCita').style.display = 'none';
        document.getElementById('tituloModalCita').textContent = "Nueva Cita";

        pacientesSeleccionados = [];
        actualizarVistaSeleccionados();

        const fechaDetectada = document.getElementById('modalCitas').getAttribute('data-fecha-click');
        const ahora = new Date();

        if (fechaDetectada) {
            const d = new Date(fechaDetectada);
            inputFecha.value = d.toISOString().split('T')[0];
            inputHora.value = fechaDetectada.includes('T') ? fechaDetectada.split('T')[1].substring(0, 5) : ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        } else {
            inputFecha.value = ahora.toISOString().split('T')[0];
            inputHora.value = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        containerPsico.style.display = 'none';
        modal.style.display = 'flex';
        modal.scrollTop = 0;
    };

    /**
     * Popula el combo de psicólogos (usado principalmente en modo administración).
     */
    async function cargarPsicologosCombo() {
        const select = document.getElementById('selectPsicologoCita');
        if (select.options.length > 0) return;
        try {
            const response = await fetch(`${API_BASE}/psicologos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const psicos = await response.json();
            psicos.forEach(p => {
                const opt = new Option(p.nombre, p.id);
                select.add(opt);
            });
        } catch (e) { console.error("Error al cargar psicólogos:", e); }
    }

    window.cerrarModalNuevaCita = function () {
        document.getElementById('modalNuevaCita').style.display = 'none';
        document.getElementById('formNuevaCita').reset();
        pacientesSeleccionados = [];
        actualizarVistaSeleccionados();
    };

    /**
     * Manejador de envío del formulario de citas. 
     * Realiza validaciones de negocio y persiste la información en el backend.
     */
    document.getElementById('formNuevaCita').addEventListener('submit', async function (e) {
        e.preventDefault();

        if (pacientesSeleccionados.length === 0) {
            UiModal.info("Por favor, selecciona al menos un paciente.", "Falta paciente");
            return;
        }

        const idCitaEditando = document.getElementById('idCitaEditando').value;
        const fechaVal = document.getElementById('fechaCita').value;
        const horaVal = document.getElementById('horaCita').value;
        const tipoCitaVal = document.getElementById('tipoCita').value;
        const estadoVal = idCitaEditando ? document.getElementById('estadoCitaForm').value : 'Programada';

        if (!fechaVal || !horaVal) {
            UiModal.info("Por favor, completa todos los campos (Fecha y Hora).", "Faltan datos");
            return;
        }

        const idPsicologoVal = datosSesion.idPsicologo || datosSesion.id;

        const idPacientes = pacientesSeleccionados.map(p => parseInt(getPatientId(p)));

        if (tipoCitaVal === 'Pareja' && idPacientes.length !== 2) {
            UiModal.info("Las citas de tipo 'Pareja' deben tener exactamente 2 pacientes.", "Validación");
            return;
        }

        if (tipoCitaVal === 'Individual' && idPacientes.length !== 1) {
            UiModal.info("Las citas individuales solo pueden tener 1 paciente.", "Validación");
            return;
        }

        const body = {
            id: idCitaEditando ? parseInt(idCitaEditando) : null,
            idPacientes: idPacientes,
            idPsicologo: parseInt(idPsicologoVal),
            modalidad: document.getElementById('modalidadCita').value,
            fechaHora: `${fechaVal}T${horaVal}:00`,
            duracionMinutos: parseInt(document.getElementById('duracionCita').value),
            tipoCita: tipoCitaVal,
            estadoCita: estadoVal
        };

        console.log("Enviando JSON al servidor:", body);

        try {
            const url = idCitaEditando ? `${API_BASE}/citas/${idCitaEditando}` : `${API_BASE}/citas`;
            const method = idCitaEditando ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const citaGuardada = await response.json();

                rangeInicioCargado = null;
                rangeFinCargado = null;
                calendar.refetchEvents();

                const modalidadFinal = (citaGuardada.modalidad || body.modalidad || '').toLowerCase();
                const esOnline = modalidadFinal.includes('online');
                const tieneUrl = !!(citaGuardada.urlVideollamada || (citaGuardada.sesion && citaGuardada.sesion.urlVideollamada));

                cerrarModalNuevaCita();
                cerrarModal();

                if (!idCitaEditando) {
                    UiModal.info("La cita se ha programado correctamente.", "Éxito");
                }

                if (esOnline && !tieneUrl) {
                    abrirModalAvisoZoom();
                }
            } else {
                let mensajeError = "No se pudo guardar la cita (Error 500)";
                try {
                    const errorData = await response.json();
                    mensajeError = errorData.message || mensajeError;
                    console.error("Error del servidor:", errorData);
                } catch (e) {
                    console.error("El servidor devolvió un error no procesable:", e);
                }
                UiModal.info("Error: " + mensajeError, "Error");
            }
        } catch (error) {
            console.error("Error en la petición fetch:", error);
        }
    });

    /**
     * Cambia el estado de una cita a 'Cancelada'.
     */
    window.marcarComoCancelada = function () {
        const id = document.getElementById('idCitaEditando').value;
        if (!id) return;

        UiModal.confirm("¿Seguro que quieres cancelar esta cita?", "Cancelar Cita", async () => {
            const cita = todasLasCitas.find(c => c.id == id);
            if (!cita) return;

            const body = {
                id: parseInt(id),
                idPacientes: (cita.pacientes || []).map(p => p.id),
                idPsicologo: datosSesion.idPsicologo || datosSesion.id,
                modalidad: cita.modalidad,
                fechaHora: cita.fechaHora,
                duracionMinutos: cita.duracion,
                tipoCita: cita.tipoCita,
                estadoCita: 'Cancelada'
            };

            try {
                const response = await fetch(`${API_BASE}/citas/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(body)
                });

                if (response.ok) {
                    rangeInicioCargado = null;
                    rangeFinCargado = null;
                    calendar.refetchEvents();
                    cerrarModalNuevaCita();
                    cerrarModal();
                } else {
                    UiModal.info("No se pudo cancelar la cita.", "Error");
                }
            } catch (error) { console.error(error); }
        });
    };

    /**
     * Detecta parámetros en la URL para iniciar automáticamente el flujo 
     * de creación de cita desde la página de pacientes.
     */
    const params = new URLSearchParams(window.location.search);
    if (params.get('nuevaCita') === 'true') {
        const pId = params.get('idPaciente');
        const pNombre = params.get('nombre');

        if (pId && pNombre) {
            abrirModalNuevaCita();

            const pacienteSimulado = {
                id: parseInt(pId),
                nombre: pNombre.split(' ')[0],
                apellidos: pNombre.split(' ').slice(1).join(' ')
            };
            agregarPacienteSeleccionado(pacienteSimulado);
        }
    }
});

/**
 * Abre un aviso informativo si una cita online no tiene link de Zoom generado.
 */
window.abrirModalAvisoZoom = function () {
    const modal = document.getElementById('modalAvisoZoom');
    if (modal) modal.style.display = 'flex';
};

window.cerrarModalAvisoZoom = function () {
    const modal = document.getElementById('modalAvisoZoom');
    if (modal) modal.style.display = 'none';
};

window.cerrarModal = function () {
    const m = document.getElementById('modalCitas');
    if (m) m.style.display = 'none';
};