/**
 * Panel de Sesión Clínica.
 * Gestión detallada de la consulta, toma de notas en tiempo real y autoguardado.
 */
document.addEventListener('DOMContentLoaded', async () => {

    const params = new URLSearchParams(window.location.search);
    const contentLoader = document.getElementById('content-loader');
    const sessionMainContent = document.getElementById('session-main-content');

    const idPaciente = params.get('idPaciente');
    const idCita = params.get('idCita');

    let idSesionBackend = null;
    let formularioModificado = false;
    let tarifasPsicologo = [];
    let currentVideoUrl = null;
    const btnVideo = document.getElementById('btn-link-video');

    /**
     * Gestión de estados de la cita desde el panel de sesión.
     */
    const citaStatusTag = document.getElementById('cita-status-tag');
    const statusOptions = document.getElementById('status-options');

    const estadosPosibles = [
        { id: 'Programada', text: 'Programada' },
        { id: 'Realizada', text: 'Realizada' },
        { id: 'No_Presentado', text: 'No Presentado' }
    ];

    if (citaStatusTag && statusOptions) {
        citaStatusTag.addEventListener('click', (e) => {
            e.stopPropagation();
            const estadoActual = citaStatusTag.getAttribute('data-estado');
            const filtrados = estadosPosibles.filter(est => est.id !== estadoActual);

            statusOptions.innerHTML = filtrados.map(est =>
                `<div onclick="window.cambiarEstadoCita('${est.id}')">${est.text}</div>`
            ).join('');

            statusOptions.classList.toggle('show');
        });

        document.addEventListener('click', () => statusOptions.classList.remove('show'));
    }

    window.cambiarEstadoCita = (nuevoEstado) => {
        actualizarUIEstado(nuevoEstado);
        formularioModificado = true;
        guardarSesion(false);
    };

    /**
     * Gestión de tipos de sesión (Individual, Sexología, Pareja).
     */
    const tipoSesionTag = document.getElementById('tipo-sesion-tag');
    const tipoSesionOptions = document.getElementById('tipo-sesion-options');
    const hiddenTipoSesion = document.getElementById('tipoSesion');

    if (tipoSesionTag && tipoSesionOptions) {
        tipoSesionTag.addEventListener('click', (e) => {
            const tipoActual = hiddenTipoSesion.value;

            if (tipoActual === 'Pareja') return;

            e.stopPropagation();

            const tipos = [
                { val: 'Individual', text: 'Individual' },
                { val: 'Sexologia', text: 'Sexología' }
            ];

            const tipoActualLimpio = (tipoActual || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            const filtrados = tipos.filter(t => {
                const valLimpio = t.val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return valLimpio !== tipoActualLimpio;
            });

            tipoSesionOptions.innerHTML = filtrados.map(t =>
                `<div onclick="window.cambiarTipoSesion('${t.val}')">${t.text.toUpperCase()}</div>`
            ).join('');

            tipoSesionOptions.classList.toggle('show');
        });
        document.addEventListener('click', () => tipoSesionOptions.classList.remove('show'));
    }

    window.cambiarTipoSesion = (nuevoTipo) => {
        if (hiddenTipoSesion) hiddenTipoSesion.value = nuevoTipo;
        actualizarUITipoSesion(nuevoTipo);

        aplicarTarifaPorTipo(nuevoTipo);

        formularioModificado = true;
        guardarSesion(false);
    };

    /**
     * Busca y aplica la tarifa configurada según el tipo de sesión y duración.
     */
    function aplicarTarifaPorTipo(tipo) {
        if (!tarifasPsicologo.length) return;

        const tarifa = tarifasPsicologo.find(t => t.tipoSesion.toUpperCase() === tipo.toUpperCase());

        if (tarifa) {
            const elDuracion = document.getElementById('duracionMinutos');
            const elPrecio = document.getElementById('precio');

            if (elDuracion) elDuracion.value = tarifa.minutos;
            if (elPrecio) elPrecio.value = tarifa.precio;

            console.log(`Tarifa aplicada para ${tipo}: ${tarifa.minutos}min - ${tarifa.precio}€`);
        }
    }

    /**
     * Actualiza la visualización del tag de tipo de sesión.
     */
    function actualizarUITipoSesion(tipo) {
        if (!tipoSesionTag) return;

        const tipoLimpio = (tipo || 'Individual').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        tipoSesionTag.className = 'tag';
        tipoSesionTag.classList.add(`tag-${tipoLimpio}`);

        if (tipoLimpio === 'pareja') {
            tipoSesionTag.classList.remove('clickable-tag');
        } else {
            tipoSesionTag.classList.add('clickable-tag');
        }

        tipoSesionTag.setAttribute('data-tipo', tipo);
        tipoSesionTag.innerText = (tipoLimpio === 'sexologia') ? 'Sexología' : (tipo || 'Individual');
    }

    /**
     * Detector de cambios sin guardar para evitar pérdida de datos al navegar fuera.
     */
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        const isInternalLink = link && link.href && !link.href.includes('#') && !link.target;

        if (isInternalLink && formularioModificado) {
            e.preventDefault();
            UiModal.confirm("Tienes cambios sin guardar. Si sales de esta página, se perderán.", "Cambios no guardados", () => {
                formularioModificado = false;
                window.location.href = link.href;
            });
        }
    });

    /**
     * Obtiene la información básica del paciente para la barra lateral.
     */
    async function cargarInfoPaciente(id) {
        try {
            const res = await fetch(`${API_BASE}/pacientes/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const p = await res.json();

                const nombreEl = document.getElementById('p-nombre-lateral');
                nombreEl.innerText = `${p.nombre} ${p.apellidos}`;
                nombreEl.style.cursor = 'pointer';
                nombreEl.style.textDecoration = 'underline';
                nombreEl.title = 'Ir al detalle del paciente';
                nombreEl.onclick = () => window.irAPaciente(p.id);

                const icon = document.getElementById('p-genero-icon');
                const iconContainer = icon.parentElement;

                if (iconContainer) {
                    let imgSrc = "https://cdn-icons-png.flaticon.com/512/4140/4140000.png";
                    if (p.genero === 'Hombre') {
                        imgSrc = "https://cdn-icons-png.flaticon.com/512/4140/4140037.png";
                    } else if (p.genero === 'Mujer') {
                        imgSrc = "https://cdn-icons-png.flaticon.com/512/4140/4140047.png";
                    }

                    iconContainer.style.padding = "0";
                    iconContainer.style.overflow = "hidden";
                    iconContainer.style.display = "flex";
                    iconContainer.innerHTML = `<img src="${imgSrc}" alt="Avatar" style="width: 100%; height: 100%; object-fit: contain;">`;
                }
            }
        } catch (e) { console.error("Error cargando paciente:", e); }
    }

    /**
     * Obtiene las tarifas preconfiguradas del psicólogo.
     */
    async function cargarTarifasPsicologo() {
        try {
            const idPsico = user.idPsicologo || user.id;
            const res = await fetch(`${API_BASE}/psicologos/${idPsico}/tarifas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                tarifasPsicologo = await res.json();
                console.log("Tarifas del psicólogo cargadas:", tarifasPsicologo);
            }
        } catch (e) {
            console.error("Error cargando tarifas:", e);
        }
    }

    window.irAPaciente = (id) => {
        if (formularioModificado) {
            UiModal.confirm("Tienes cambios sin guardar. Si sales de esta página, se perderán.", "Cambios no guardados", () => {
                formularioModificado = false;
                window.location.href = `paciente-detalle.html?id=${id}`;
            });
        } else {
            window.location.href = `paciente-detalle.html?id=${id}`;
        }
    };

    function actualizarUIEstado(estadoRaw) {
        if (!citaStatusTag) return;
        const estado = (estadoRaw || "Programada").toUpperCase().replace(/ /g, '_');

        citaStatusTag.className = 'tag clickable-tag';
        citaStatusTag.setAttribute('data-estado', estadoRaw);

        let texto = estadoRaw;
        if (estado === 'PROGRAMADA') {
            citaStatusTag.classList.add('tag-blue');
        } else if (estado === 'REALIZADA') {
            citaStatusTag.classList.add('tag-success');
        } else if (estado === 'NO_PRESENTADO') {
            citaStatusTag.classList.add('tag-danger');
            texto = "No Presentado";
        }
        citaStatusTag.innerText = texto || "---";
    }

    /**
     * Recupera el estado actual de la sesión desde el servidor y popula el formulario.
     */
    async function precargarDatosSesion() {
        if (!idCita) return;

        try {
            const response = await fetch(`${API_BASE}/sesiones/cita/${idCita}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const sesion = await response.json();
                idSesionBackend = sesion.idSesion || sesion.id;

                if (sesion.fecha) {
                    const f = new Date(sesion.fecha);
                    document.getElementById('p-sesion-dia').innerText = f.getDate();
                    document.getElementById('p-sesion-mes').innerText = f.toLocaleString('es', { month: 'short' }).toUpperCase().replace('.', '');
                    document.getElementById('p-sesion-hora').innerText = f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + 'h';
                    document.getElementById('p-sesion-modalidad').innerText = sesion.modalidad || 'Presencial';
                    iniciarRelojProgreso(sesion.fecha, sesion.duracionMinutos);
                }

                actualizarUIEstado(sesion.estadoCita || "Programada");

                try {
                    const resCita = await fetch(`${API_BASE}/citas/${idCita}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (resCita.ok) {
                        const citaData = await resCita.json();
                        const listaPacs = citaData.pacientes || [];
                        if (listaPacs.length > 1) {
                            const nombreLateral = document.getElementById('p-nombre-lateral');
                            const iconBox = document.querySelector('.patient-avatar-container');

                            if (iconBox) {
                                iconBox.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/4212/4212470.png" alt="Grupo" style="width: 100%; height: 100%; object-fit: contain;">`;
                            }

                            if (nombreLateral) {
                                nombreLateral.style.textDecoration = 'none';
                                nombreLateral.style.cursor = 'default';
                                nombreLateral.onclick = null;
                                nombreLateral.innerHTML = listaPacs.map((p, i) => {
                                    const comma = (i < listaPacs.length - 1) ? ',' : '';
                                    return `<div class="p-nombre-item" onclick="window.irAPaciente(${p.id || p.idPaciente})">${p.nombre} ${p.apellidos}${comma}</div>`;
                                }).join('');
                            }
                        }
                    }
                } catch (err) { console.error("Error al cargar multi-pacientes:", err); }

                const llenar = (id, valor) => {
                    const el = document.getElementById(id);
                    if (el && valor !== undefined && valor !== null) {
                        if (el.type === 'checkbox') el.checked = Boolean(valor);
                        else el.value = valor;
                    }
                };

                actualizarUITipoSesion(sesion.tipoSesion || "Individual");
                if (hiddenTipoSesion) hiddenTipoSesion.value = sesion.tipoSesion;

                llenar('duracionMinutos', sesion.duracionMinutos);
                llenar('precio', sesion.precio);
                llenar('facturada', sesion.facturada);
                llenar('procedenciaSesion', sesion.procedenciaSesion || sesion.procedencia);

                if (sesion.urlVideollamada && sesion.modalidad === 'Online') {
                    currentVideoUrl = sesion.urlVideollamada;
                    document.getElementById('container-videollamada').style.display = 'block';
                    actualizarEstadoBotonVideo();
                }

                const mapeoTextos = {
                    'motivoSesion': sesion.motivoSesion,
                    'contenidosTratados': sesion.contenidosTratados || sesion.contenidos,
                    'intervencionesSesion': sesion.intervencionesSesion || sesion.intervenciones,
                    'observacionesClinicas': sesion.observacionesClinicas || sesion.observaciones,
                    'hipotesisSesion': sesion.hipotesisSesion || sesion.hipotesis
                };

                Object.keys(mapeoTextos).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.value = mapeoTextos[id] || "";
                });

                if (document.getElementById('last-saved')) {
                    document.getElementById('last-saved').innerText = "Cargado del servidor";
                }
            }
        } catch (error) { console.error("Error en precarga:", error); }
    }

    /**
     * Actualiza el anillo de progreso visual alrededor de la fecha de la sesión.
     */
    function iniciarRelojProgreso(fechaInicio, duracionMinutos) {
        const wrapper = document.getElementById('sesion-progress-wrapper');
        if (!wrapper || !fechaInicio) return;

        const updateProgress = () => {
            const inicio = new Date(fechaInicio);
            const duracionMs = (duracionMinutos || 60) * 60000;
            const ahora = new Date();
            const transcurrido = ahora - inicio;

            let porcentaje = 0;
            if (transcurrido > 0) {
                porcentaje = Math.min((transcurrido / duracionMs) * 100, 100);
            }

            wrapper.style.setProperty('--progress', porcentaje);

            if (porcentaje >= 100) {
                wrapper.classList.add('completed');
            } else {
                wrapper.classList.remove('completed');
            }
        };

        updateProgress();
        setInterval(updateProgress, 10000);
    }

    if (contentLoader) contentLoader.style.display = 'flex';
    if (sessionMainContent) sessionMainContent.style.display = 'none';

    try {
        if (idPaciente) await cargarInfoPaciente(idPaciente);
        await cargarTarifasPsicologo();
        await precargarDatosSesion();
    } finally {
        if (contentLoader) contentLoader.style.display = 'none';
        if (sessionMainContent) sessionMainContent.style.display = 'grid';
    }

    /**
     * Debounce para el guardado local de seguridad.
     */
    const inputsFormulario = document.querySelectorAll('input, select, textarea');
    let backupTimer;
    const guardarBackupSeguro = () => {
        clearTimeout(backupTimer);
        backupTimer = setTimeout(() => {
            const backup = {
                motivo: document.getElementById('motivoSesion').value,
                contenidos: document.getElementById('contenidosTratados').value,
                observaciones: document.getElementById('observacionesClinicas').value,
                ts: Date.now()
            };
            localStorage.setItem(`backup_sesion_${idCita}`, JSON.stringify(backup));
            console.log("Backup local actualizado...");
        }, 1000);
    };

    inputsFormulario.forEach(input => {
        input.addEventListener('input', () => {
            formularioModificado = true;
            guardarBackupSeguro();
        });
    });

    /**
     * Actualiza la accesibilidad y destino del botón de videollamada.
     */
    function actualizarEstadoBotonVideo() {
        if (!btnVideo) return;
        if (currentVideoUrl) {
            btnVideo.href = currentVideoUrl;
            btnVideo.style.opacity = "1";
            btnVideo.style.pointerEvents = "auto";
            btnVideo.target = "_blank";
        } else {
            btnVideo.removeAttribute('href');
            btnVideo.style.opacity = "0.5";
            btnVideo.style.pointerEvents = "none";
        }
    }

    actualizarEstadoBotonVideo();

    const elTipoSesion = document.getElementById('tipoSesion');
    const elDuracion = document.getElementById('duracionMinutos');
    const elPrecio = document.getElementById('precio');

    if (elDuracion) elDuracion.addEventListener('change', () => guardarSesion(false));

    if (elPrecio) elPrecio.addEventListener('input', () => { formularioModificado = true; });

    const tabs = document.querySelectorAll('.tab-btn');
    const panes = document.querySelectorAll('.tab-pane');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(targetId)?.classList.add('active');
        });
    });

    const btnGuardar = document.getElementById('btn-finalizar');
    if (btnGuardar) btnGuardar.innerHTML = 'Guardar';

    /**
     * Persiste los datos de la sesión en el servidor.
     */
    async function guardarSesion(esAutoGuardado = false) {
        if (!idSesionBackend) return;

        const labelLastSaved = document.getElementById('last-saved');

        if (btnGuardar && !esAutoGuardado) {
            btnGuardar.disabled = true;
            btnGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        }

        const sesionData = {
            id: idSesionBackend,
            idCita: parseInt(idCita),
            estadoCita: citaStatusTag ? citaStatusTag.getAttribute('data-estado') : null,
            tipoSesion: document.getElementById('tipoSesion').value,
            duracionMinutos: parseInt(document.getElementById('duracionMinutos').value) || 0,
            precio: parseFloat(document.getElementById('precio').value) || 0,
            facturada: document.getElementById('facturada').checked,
            procedenciaSesion: document.getElementById('procedenciaSesion').value,
            urlVideollamada: currentVideoUrl,
            motivoSesion: document.getElementById('motivoSesion').value,
            contenidos: document.getElementById('contenidosTratados').value,
            intervenciones: document.getElementById('intervencionesSesion').value,
            observaciones: document.getElementById('observacionesClinicas').value,
            hipotesis: document.getElementById('hipotesisSesion').value
        };

        try {
            const response = await fetch(`${API_BASE}/sesiones/${idSesionBackend}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sesionData)
            });

            if (response.ok) {
                const sesionActualizada = await response.json();
                if (sesionActualizada.precio !== undefined) {
                    document.getElementById('precio').value = sesionActualizada.precio;
                }
                if (sesionActualizada.estadoCita) {
                    actualizarUIEstado(sesionActualizada.estadoCita);
                }
                idSesionBackend = sesionActualizada.idSesion || sesionActualizada.id;

                formularioModificado = false;
                localStorage.removeItem(`backup_sesion_${idCita}`);

                const ahora = new Date();
                const horaStr = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                if (labelLastSaved) {
                    labelLastSaved.innerText = `Guardado a las ${horaStr}`;
                    labelLastSaved.style.color = "inherit";
                }

                if (btnGuardar && !esAutoGuardado) {
                    btnGuardar.classList.add('btn-saved-success');
                    btnGuardar.innerHTML = '<i class="fa-solid fa-check"></i> Guardado';
                    setTimeout(() => {
                        btnGuardar.classList.remove('btn-saved-success');
                        btnGuardar.innerHTML = 'Guardar';
                        btnGuardar.disabled = false;
                    }, 2000);
                }
            } else {
                throw new Error("Fallo en servidor");
            }
        } catch (error) {
            console.error("Error guardando:", error);
            if (labelLastSaved) {
                labelLastSaved.innerText = "⚠️ Error al guardar (Sin conexión)";
                labelLastSaved.style.color = "red";
            }
            if (btnGuardar && !esAutoGuardado) {
                btnGuardar.disabled = false;
                btnGuardar.innerHTML = 'Guardar';
            }
        }
    }

    if (btnGuardar) {
        btnGuardar.addEventListener('click', () => guardarSesion(false));
    }

    setInterval(() => {
        if (formularioModificado) guardarSesion(true);
    }, 30000);

    window.addEventListener('online', () => {
        if (formularioModificado) guardarSesion(true);
    });
});