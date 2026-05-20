/**
 * Controlador del Dashboard de Estadísticas.
 * Utiliza Chart.js para representar datos económicos y demográficos de la clínica.
 */
document.addEventListener('DOMContentLoaded', async () => {

    const psicologoId = user?.idPsicologo || user?.id;

    Chart.defaults.font.family = "'Montserrat', sans-serif";
    Chart.defaults.color = "#264574";

    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();

    const cardPacientes = document.getElementById('card-total-pacientes');
    if (cardPacientes) {
        cardPacientes.addEventListener('click', () => window.location.href = 'pacientes.html');
    }

    const cardCitas = document.getElementById('card-citas-mes');
    if (cardCitas) {
        cardCitas.addEventListener('click', () => window.location.href = 'citas.html');
    }

    /**
     * Recupera y orquestra la visualización de todas las estadísticas del psicólogo.
     */
    async function cargarDashboard() {
        try {
            const [respEstadisticasGenerales, respPendientes] = await Promise.all([
                fetch(`${API_BASE}/psicologos/estadisticas`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/psicologos/sesiones/false/pagadas`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!respEstadisticasGenerales.ok || !respPendientes.ok) {
                throw new Error("Error en la respuesta del servidor");
            }

            const estadisticasGenerales = await respEstadisticasGenerales.json();
            const sesionesPendientes = await respPendientes.json();

            actualizarTarjetas(estadisticasGenerales);

            procesarGraficoGenero(estadisticasGenerales.estadisticasGenero);
            procesarGraficoEstado(estadisticasGenerales.estadisticasEstadoPacientes);
            procesarGraficoPacientesPorMes(estadisticasGenerales.estadisticasNuevosPacientesMes);
            procesarGraficoFacturacionPorMes(estadisticasGenerales.estadisticasEconomicas, estadisticasGenerales.totalAnual);

            cargarPendientesFacturar(sesionesPendientes);

        } catch (error) {
            console.error("Error cargando datos del dashboard:", error);
        }
    }

    /**
     * Actualiza los valores numéricos de las tarjetas superiores.
     */
    function actualizarTarjetas(estadisticasGenerales) {
        document.getElementById('total-pacientes').textContent = estadisticasGenerales.numPacientesTotales;
        document.getElementById('citas-mes').textContent = estadisticasGenerales.numCitasDelMes;

        const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const labelIngresos = document.querySelector('#ingresos-mes').nextElementSibling;
        if (labelIngresos) labelIngresos.textContent = `Facturación (${mesesNombres[mesActual]})`;

        document.getElementById('ingresos-mes').textContent = `${estadisticasGenerales.totalMensual.toFixed(2)}€`;
    }

    /**
     * Renderiza el gráfico circular de distribución por género.
     */
    function procesarGraficoGenero(statsGenero) {
        const counts = { 'Hombre': statsGenero.numHombres, 'Mujer': statsGenero.numMujeres, 'No especificado': statsGenero.numNE };

        const ctx = document.getElementById('chartGenero').getContext('2d');
        const chartExistente = Chart.getChart("chartGenero");
        if (chartExistente) chartExistente.destroy();

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Mujeres', 'Hombres', 'No especificado'],
                datasets: [{
                    data: [counts['Mujer'], counts['Hombre'], counts['No especificado']],
                    backgroundColor: ['#ff80ab', '#348ec2', '#94a3b8'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 50, left: 10, right: 10 } },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 15 }
                    }
                }
            }
        });
    }

    /**
     * Renderiza el gráfico de barras del estado clínico de los pacientes.
     */
    function procesarGraficoEstado(statsEstado) {
        const mapeoEstados = {
            'Evaluación': { conteo: statsEstado.numEvaluacion, color: '#fef9c3' },
            'Seguimiento': { conteo: statsEstado.numSeguimiento, color: '#dbeafe' },
            'Alta': { conteo: statsEstado.numAlta, color: '#dcfce7' }
        };

        const ctx = document.getElementById('chartEstado').getContext('2d');
        const chartExistente = Chart.getChart("chartEstado");
        if (chartExistente) chartExistente.destroy();

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(mapeoEstados),
                datasets: [{
                    label: 'Pacientes',
                    data: Object.values(mapeoEstados).map(obj => obj.conteo),
                    backgroundColor: Object.values(mapeoEstados).map(obj => obj.color),
                    borderRadius: 5,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 50, left: 10, right: 10 } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 },
                        grid: { color: '#f0f0f0' }
                    },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                },
                onClick: (e, elements, chart) => {
                    if (elements.length > 0) {
                        const index = elements[0].index;
                        const label = chart.data.labels[index];
                        window.location.href = `pacientes.html?estado=${encodeURIComponent(label)}`;
                    }
                },
                onHover: (event, chartElement) => {
                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                }
            }
        });
    }

    /**
     * Renderiza el gráfico de barras de crecimiento de pacientes mensual.
     */
    function procesarGraficoPacientesPorMes(nuevosPacientesMes) {
        const mesesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const datosMeses = new Array(12).fill(0);

        nuevosPacientesMes.forEach(item => {
            if (item.mes >= 1 && item.mes <= 12) {
                datosMeses[item.mes - 1] = item.numNuevosPacientes;
            }
        });

        const ctx = document.getElementById('chartPacientesMes').getContext('2d');
        const chartExistente = Chart.getChart("chartPacientesMes");
        if (chartExistente) chartExistente.destroy();

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: mesesLabels,
                datasets: [{
                    label: 'Nuevos Pacientes',
                    data: datosMeses,
                    backgroundColor: '#a29bfe',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 50, left: 10, right: 10 } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1 } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    /**
     * Parsea formatos de fecha variados del backend.
     */
    function parsearFecha(fechaRaw) {
        if (!fechaRaw) return null;
        if (Array.isArray(fechaRaw)) {
            return new Date(fechaRaw[0], fechaRaw[1] - 1, fechaRaw[2]);
        }
        return new Date(fechaRaw);
    }

    /**
     * Renderiza el gráfico de líneas con la evolución económica desglosada por tipo de cita.
     */
    function procesarGraficoFacturacionPorMes(ingresosDetallados, totalAnual) {
        const mesesLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        const ingresosTotales = new Array(12).fill(0);
        const ingresosIndividual = new Array(12).fill(0);
        const ingresosPareja = new Array(12).fill(0);
        const ingresosSexologia = new Array(12).fill(0);
        ingresosDetallados.forEach(item => {
            if (item.mes >= 1 && item.mes <= 12) {
                ingresosTotales[item.mes - 1] = item.totalIndividual + item.totalPareja + item.totalSexologia;
                ingresosIndividual[item.mes - 1] = item.totalIndividual;
                ingresosPareja[item.mes - 1] = item.totalPareja;
                ingresosSexologia[item.mes - 1] = item.totalSexologia;
            }
        });

        const tituloH4 = document.getElementById('titulo-facturacion-anual');
        if (tituloH4) {
            tituloH4.textContent = `Facturación Anual (${totalAnual.toFixed(2)}€)`;
        }

        const ctx = document.getElementById('chartFacturacionMes').getContext('2d');
        const chartExistente = Chart.getChart("chartFacturacionMes");
        if (chartExistente) chartExistente.destroy();

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: mesesLabels,
                datasets: [
                    {
                        label: 'Total Facturado',
                        data: ingresosTotales,
                        borderColor: '#3a8f13',
                        backgroundColor: 'rgba(58, 143, 19, 0.13)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        borderWidth: 3
                    },
                    {
                        label: 'Individual',
                        data: ingresosIndividual,
                        borderColor: '#348ec2',
                        backgroundColor: 'rgba(52, 142, 194, 0.15)',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        borderWidth: 2
                    },
                    {
                        label: 'Pareja',
                        data: ingresosPareja,
                        borderColor: '#a29bfe',
                        backgroundColor: 'rgba(162, 155, 254, 0.15)',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        borderWidth: 2
                    },
                    {
                        label: 'Sexología',
                        data: ingresosSexologia,
                        borderColor: '#e11d48',
                        backgroundColor: 'rgba(225, 29, 72, 0.15)',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                layout: { padding: { top: 10, bottom: 50, left: 10, right: 10 } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: value => value + '€',
                            font: { size: 11 }
                        }
                    },
                    x: {
                        ticks: { font: { size: 11 } },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { weight: '600' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        titleColor: '#264574',
                        bodyColor: '#264574',
                        borderColor: '#edf2f7',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: (context) => ` ${context.dataset.label}: ${context.raw.toFixed(2)}€`
                        }
                    }
                }
            }
        });
    }

    /**
     * Genera la tabla de sesiones realizadas que aún no han sido marcadas como pagadas.
     */
    function cargarPendientesFacturar(sesionesPendientes) {
        const tbody = document.getElementById('pendientes-facturar-body');
        if (!tbody) return;

        const pendientes = sesionesPendientes.filter(s => s.estadoCita !== 'Cancelada');

        if (pendientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">No hay facturas pendientes.</td></tr>';
            return;
        }

        const ahora = new Date();

        tbody.innerHTML = pendientes
            .filter(s => {
                const fechaCita = parsearFecha(s.fechaHora);
                return fechaCita && fechaCita < ahora
            })

            .sort((a, b) => {
                const fechaA = parsearFecha(a.fechaHora);
                const fechaB = parsearFecha(b.fechaHora);
                return fechaB - fechaA;
            })
            .map(s => {
                const nombreP = s.pacientes && s.pacientes.length > 0
                    ? s.pacientes.map(p => `${p.nombre} ${p.apellidos}`).join(' , ')
                    : 'Paciente';
                const idBuscado = s.pacientes && s.pacientes.length > 0 ? (s.pacientes[0].id || s.pacientes[0].idPaciente) : null;

                const fechaObj = parsearFecha(s.fechaHora);
                const fechaStr = fechaObj ? fechaObj.toLocaleDateString() : 'S/F';
                const importe = Number(s.precio || 0).toFixed(2);
                const urlSesion = `sesion.html?idPaciente=${idBuscado}&idCita=${s.id}`;
                const sessionId = s.idSesion;

                const isPaid = false;
                const tagClass = isPaid ? 'tag-success' : 'tag-danger';
                const tagText = isPaid ? 'Pagada' : 'Pendiente';

                const paidOptions = isPaid
                    ? `<div onclick="window.cambiarFacturada(event, ${sessionId}, false)">Pendiente</div>`
                    : `<div onclick="window.cambiarFacturada(event, ${sessionId}, true)">Pagada</div>`;

                return `
            <tr onclick="window.location.href='${urlSesion}'" style="cursor:pointer;">
                <td><strong>${nombreP}</strong></td>
                <td style="text-align:center;">${fechaStr}</td>
                <td style="text-align:center;">${importe}€</td>
                <td style="text-align:center;">
                    <div class="status-selector-wrapper ">
                        <span class="tag ${tagClass} clickable-tag" onclick="window.togglePaidDropdown(event, ${sessionId})">${tagText}</span>
                        <div id="dropdown-paid-${sessionId}" class="status-options-dropdown" >
                            ${paidOptions}
                        </div>
                    </div>
                </td>
            </tr>
        `;
            }).join('');
    }

    /**
     * Actualiza un campo específico de una sesión mediante una llamada PUT.
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
                await cargarDashboard();
            }
        } catch (e) {
            console.error(`Error updating session ${fieldName}:`, e);
        }
    }

    /**
     * Gestiona la visibilidad del desplegable de pago.
     */
    window.togglePaidDropdown = (event, idSesion) => {
        event.stopPropagation();
        const dropdown = document.getElementById(`dropdown-paid-${idSesion}`);
        document.querySelectorAll('.status-options-dropdown').forEach(d => {
            if (d !== dropdown) d.classList.remove('show');
        });
        if (dropdown) dropdown.classList.toggle('show');
    };

    window.cambiarFacturada = (event, idSesion, isPaid) => {
        event.stopPropagation();
        updateSessionField(idSesion, 'facturada', isPaid);
    };

    document.addEventListener('click', () => {
        document.querySelectorAll('.status-options-dropdown').forEach(d => d.classList.remove('show'));
    });

    cargarDashboard();
});