document.addEventListener('DOMContentLoaded', () => {
    // Las variables API_BASE, token y user vienen de auth-guard.js
    const sesionesBody = document.getElementById('sesiones-body');

    // CARGA DE DATOS Y DASHBOARD
    window.cargarDashboard = async () => {

        const welcomeTitle = document.querySelector('.welcome-banner h2 strong');
        if (welcomeTitle && user) {
            const primerNombre = user.nombre.split(' ')[0];
            welcomeTitle.textContent = primerNombre;
        }

        const requestConfig = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            const [statsRes, citasRes] = await Promise.all([
                fetch(`${API_BASE}/psicologos/estadisticas/hoy`, requestConfig),
                fetch(`${API_BASE}/citas/hoy`, requestConfig)
            ]);

            if (statsRes.ok && citasRes.ok) {
                const stats = await statsRes.json();
                const citasHoy = await citasRes.json();
                actualizarDashboard(stats, citasHoy);
            }
        } catch (error) {
            console.error("Error cargando dashboard:", error);
        }
    };

    function actualizarDashboard(stats, citasHoy) {
        // Stats Pacientes
        const elPacientes = document.getElementById('stat-pacientes');
        if (elPacientes) elPacientes.textContent = stats.numPacientesSeguimiento;

        // Stats Sesiones Hoy
        const elementoSesionesHoy = document.getElementById('stat-sesiones-hoy');
        if (elementoSesionesHoy) elementoSesionesHoy.textContent = citasHoy.length;

        const mensajeSaludo = document.getElementById('welcome-message');
        if (mensajeSaludo) mensajeSaludo.textContent = `Tienes ${citasHoy.length} sesiones para hoy.`;

        const elementoPendientes = document.getElementById('stat-pendientes');
        if (elementoPendientes) elementoPendientes.textContent = stats.numCitasPendientesHoy;

        const elementoIngresos = document.getElementById('stat-ingresos');
        if (elementoIngresos) elementoIngresos.textContent = `${(stats.ingresosDelMes || 0).toFixed(2)}€`;

        // Guardamos las citas en un cache global para poder usarlas en los cambios de estado/modalidad
        window.citasHoyCache = citasHoy.map(c => {
            // Normalizar fecha si viene como array de números (común en Spring)
            if (Array.isArray(c.fechaHora)) {
                c.fechaHora = new Date(c.fechaHora[0], c.fechaHora[1] - 1, c.fechaHora[2], c.fechaHora[3], c.fechaHora[4]).toISOString();
            }
            return c;
        });

        renderTabla(citasHoy);
    }

    function renderTabla(citas) {
        if (!sesionesBody) return;
        if (citas.length === 0) {
            sesionesBody.innerHTML = '<tr onclick="window.location.href=\'citas.html\'" style="cursor:pointer;"><td colspan="4" style="text-align:center; padding:20px;">Día libre de citas</td></tr>';
            return;
        }

        sesionesBody.innerHTML = citas
            .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora))
            .map(cita => {
                const nombrePaciente = cita.pacientes.map(p => `${p.nombre} ${p.apellidos}`).join(', ');
                const fecha = new Date(cita.fechaHora);
                const duracion = cita.duracionMinutos || cita.duracion || 60;
                const fechaFin = new Date(fecha.getTime() + (duracion * 60000));
                const mod = cita.modalidad || 'Presencial';
                const modClass = mod.toLowerCase().includes('online') ? 'online' : 'presencial';
                const esPasada = fechaFin < new Date();
                const estadoRaw = cita.estadoCita || 'Programada';
                const estado = estadoRaw.toUpperCase().replace(/ /g, '_');

                let iconoClase = 'fa-clock text-primary'; // Programada
                let statusTagClass = 'tag-blue';
                let estadoTexto = estadoRaw;
                let rowClass = '';

                if (estado === 'REALIZADA') {
                    iconoClase = 'fa-circle-check status-realizada';
                    statusTagClass = 'tag-success';
                    rowClass = 'row-realizada';
                } else if (estado === 'NO_PRESENTADO') {
                    iconoClase = 'fa-circle-xmark status-no-presentado';
                    statusTagClass = 'tag-danger';
                    estadoTexto = 'No Presentado';
                    rowClass = 'row-no-presentado';
                } else if (esPasada) {
                    iconoClase = 'fa-warning status-aviso';
                }

                const idCita = cita.idCita || cita.id;
                const idPaciente = cita.pacientes.length > 0 ? (cita.pacientes[0].id || cita.pacientes[0].idPaciente) : null;
                const urlSesion = `sesion.html?idPaciente=${idPaciente}&idCita=${idCita}`;

                // Filtrar opciones de modalidad para no mostrar la actual
                const modalidadesDisponibles = ['Presencial', 'Online'];
                const opcionesModalidadHtml = modalidadesDisponibles
                    .filter(m => m !== mod)
                    .map(m => `<div onclick="window.cambiarModalidadCitaHome(event, ${idCita}, '${m}')">${m}</div>`)
                    .join('');

                // Filtrar opciones de estado para no mostrar la actual
                const estadosDisponibles = [{ val: 'Programada', text: 'Programada' }, { val: 'Realizada', text: 'Realizada' }, { val: 'No_Presentado', text: 'No Presentado' }];
                const opcionesEstadoHtml = estadosDisponibles
                    .filter(e => e.val.toUpperCase() !== estado)
                    .map(e => `<div onclick="window.cambiarEstadoCitaHome(event, ${idCita}, '${e.val}')">${e.text}</div>`)
                    .join('');

                return `
                    <tr onclick="window.location.href='${urlSesion}'" class="${rowClass}" style="cursor:pointer;">
                        <td>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <i class="fa-solid ${iconoClase} status-icon"></i>
                                <strong>${nombrePaciente || 'Sin nombre'}</strong>
                            </div>
                        </td>
                        <td>${fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td style="text-align: center;">
                            <div class="status-selector-wrapper">
                                <span class="tag tag-${modClass} clickable-tag" onclick="window.toggleModalidadDropdownHome(event, ${idCita})">${mod}</span>
                                <div id="dropdown-modalidad-${idCita}" class="status-options-dropdown">
                                    ${opcionesModalidadHtml}
                                </div>
                            </div>
                        </td>
                        <td style="text-align: center;">
                            <div class="status-selector-wrapper">
                                <span class="tag ${statusTagClass} clickable-tag" onclick="window.toggleDropdownHome(event, ${idCita})">${estadoTexto}</span>
                                <div id="dropdown-status-${idCita}" class="status-options-dropdown">
                                    ${opcionesEstadoHtml}
                                </div>
                            </div>
                        </td>
                    </tr>`;
            }).join('');
    }

    window.toggleDropdownHome = (event, idCita) => {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-status-${idCita}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    };

    window.toggleModalidadDropdownHome = (event, idCita) => {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-modalidad-${idCita}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        dropdown.classList.toggle('show');
    };

    window.cambiarEstadoCitaHome = async (event, idCita, nuevoEstado) => {
        event.stopPropagation();
        const cita = (window.citasHoyCache || []).find(c => (c.idCita || c.id) === idCita);
        if (!cita) return;

        // Construimos el body completo como en citas.js para disparar la lógica del backend
        const body = {
            id: idCita,
            idPacientes: cita.pacientes.map(p => p.id || p.idPaciente),
            idPsicologo: user.idPsicologo || user.id,
            modalidad: cita.modalidad || 'Presencial',
            fechaHora: cita.fechaHora,
            duracionMinutos: cita.duracionMinutos || cita.duracion || 60,
            tipoCita: cita.tipoCita,
            estadoCita: nuevoEstado
        };

        try {
            const response = await fetch(`${API_BASE}/citas/${idCita}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                await window.cargarDashboard();
            } else {
                console.error("Error al actualizar estado");
            }
        } catch (e) { console.error(e); }
    };

    window.cambiarModalidadCitaHome = async (event, idCita, nuevaModalidad) => {
        event.stopPropagation();
        const cita = (window.citasHoyCache || []).find(c => (c.idCita || c.id) === idCita);
        if (!cita) return;

        const body = {
            id: idCita,
            idPacientes: cita.pacientes.map(p => p.id || p.idPaciente),
            idPsicologo: user.idPsicologo || user.id,
            modalidad: nuevaModalidad,
            fechaHora: cita.fechaHora,
            duracionMinutos: cita.duracionMinutos || cita.duracion || 60,
            tipoCita: cita.tipoCita,
            estadoCita: cita.estadoCita || 'Programada'
        };

        try {
            const response = await fetch(`${API_BASE}/citas/${idCita}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                await window.cargarDashboard();
            } else {
                console.error("Error al actualizar modalidad");
            }
        } catch (e) { console.error(e); }
    };

    document.addEventListener('click', () => {
        document.querySelectorAll('.status-options-dropdown').forEach(d => d.classList.remove('show'));
    });

    // Notas Rápidas
    const notasTextarea = document.getElementById('notas-dashboard');
    if (notasTextarea) {
        notasTextarea.value = localStorage.getItem('notas_rapidas') || '';
        notasTextarea.addEventListener('input', (e) => {
            localStorage.setItem('notas_rapidas', e.target.value);
        });
    }

    window.cargarDashboard();
});