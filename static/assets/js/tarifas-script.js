document.addEventListener('DOMContentLoaded', async () => {
    const tarifasTableBody = document.getElementById('tarifas-table-body');

    let tarifas = []; // Almacenará las tarifas del psicólogo
    let editingRowId = null; // Para controlar qué fila se está editando

    // Función para cargar las tarifas del psicólogo
    async function cargarTarifas() {
        if (!user || !user.id) {
            console.error("Usuario no autenticado o ID de psicólogo no disponible.");
            tarifasTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#ef4444;">Error: No se pudo cargar el usuario.</td></tr>';
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/psicologos/${user.id}/tarifas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            tarifas = await response.json();
            renderizarTarifas();
        } catch (error) {
            console.error("Error al cargar las tarifas:", error);
            tarifasTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#ef4444;">Error al cargar las tarifas.</td></tr>';
        }
    }

    // Función para renderizar las tarifas en la tabla
    function renderizarTarifas() {
        tarifasTableBody.innerHTML = '';
        if (tarifas.length === 0) {
            tarifasTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:#718096;">No hay tarifas configuradas.</td></tr>';
            return;
        }

        // Ordenamos por tipo para facilitar la agrupación
        const tarifasOrdenadas = [...tarifas].sort((a, b) => a.tipoSesion.localeCompare(b.tipoSesion));
        
        // Contamos cuántas filas hay de cada tipo para el rowspan
        const conteos = {};
        tarifasOrdenadas.forEach(t => conteos[t.tipoSesion] = (conteos[t.tipoSesion] || 0) + 1);

        const tiposRenderizados = new Set();

        tarifasOrdenadas.forEach(tarifa => {
            const row = tarifasTableBody.insertRow();
            row.className = 'tarifa-row';
            row.setAttribute('data-id', tarifa.idTarifa);

            let celdaTipo = '';
            if (!tiposRenderizados.has(tarifa.tipoSesion)) {
                if (tiposRenderizados.size > 0) row.classList.add('group-divider');
                celdaTipo = `<td rowspan="${conteos[tarifa.tipoSesion]}" class="tipo-col-agrupada">${formatTipoSesion(tarifa.tipoSesion)}</td>`;
                tiposRenderizados.add(tarifa.tipoSesion);
            }

            row.innerHTML = `
                ${celdaTipo}
                <td>${tarifa.minutos} min</td>
                <td style="overflow: visible;">
                    <div class="price-cell-container">
                        <div class="price-display" style ="padding-right: 10px !important;">
                            <span class="price-value">${tarifa.precio.toFixed(2)}</span> €
                        </div>
                        <div class="price-edit-form price-edit-container" style="display:none">
                            <input type="number" step="5" class="edit-input-precio" value="${tarifa.precio}" onblur="window.handleInputBlur(this)" onkeydown="if(event.key==='Enter') window.guardarCambioPrecio(this.parentElement.querySelector('button'), ${tarifa.idTarifa})">
                            <button class="btn-save-inline" onmousedown="window.preventBlur(event)" onclick="window.guardarCambioPrecio(this, ${tarifa.idTarifa})">
                                <i class="fa-solid fa-check"></i>
                            </button>
                        </div>
                        <button class="btn-edit-tarifa" title="Editar precio" onclick="window.activarEdicionPrecio(this)">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                    </div>
                </td>
            `;
        });
    }

    // Helper para formatear el tipo de sesión de Enum a texto legible
    function formatTipoSesion(tipoSesionEnum) {
        if (!tipoSesionEnum) return '';
        const lower = tipoSesionEnum.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1).replace('_', ' ');
    }

    // --- FUNCIONES GLOBALES DE EDICIÓN ---
    window.activarEdicionPrecio = (btn) => {
        const cell = btn.closest('td');
        cell.querySelector('.price-display').style.display = 'none';
        cell.querySelector('.price-edit-form').style.display = 'flex';
        btn.style.display = 'none';
        
        const input = cell.querySelector('.edit-input-precio');
        input.focus();
        input.select();
    };

    window.preventBlur = (e) => {
        // Evita que el input pierda el foco antes de que el click del botón se procese
        e.preventDefault();
    };

    window.handleInputBlur = (input) => {
        // Si no se está guardando, cancelamos tras un breve timeout para permitir clicks en el botón de guardar
        setTimeout(() => {
            if (input && document.body.contains(input)) {
                window.cancelarEdicionPrecio(input);
            }
        }, 150);
    };

    window.cancelarEdicionPrecio = (btn) => {
        const cell = btn.closest('td');
        if (!cell.querySelector('.price-edit-form')) return;
        cell.querySelector('.price-display').style.display = 'block';
        cell.querySelector('.price-edit-form').style.display = 'none';
        cell.querySelector('.btn-edit-tarifa').style.display = 'flex';
    };

    window.guardarCambioPrecio = async (btn, idTarifa) => {
        const cell = btn.closest('td');
        const nuevoPrecio = cell.querySelector('.edit-input-precio').value;

        try {
            const response = await fetch(`${API_BASE}/psicologos/tarifas/actualizar/${idTarifa}`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ precio: parseFloat(nuevoPrecio) })
            });

            if (response.ok) {
                UiModal.info("Tarifa actualizada correctamente.", "Éxito");
                cargarTarifas();
            } else {
                UiModal.info("No se pudo actualizar el precio.", "Error");
            }
        } catch (e) {
            console.error(e);
            UiModal.info("Error de conexión.", "Error");
        }
    };

    // Cargar tarifas al iniciar la página
    cargarTarifas();
});