/**
 * Gestión del Perfil del Psicólogo.
 * Muestra información personal, colegiación y cuentas bancarias registradas.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const psicologoId = user?.idPsicologo || user?.id;

    if (!psicologoId || !token) {
        window.location.href = 'home.html';
        return;
    }

    /**
     * Carga los datos del psicólogo y sus cuentas bancarias.
     */
    async function cargarPerfil() {
        try {
            const [resP, resC] = await Promise.all([
                fetch(`${API_BASE}/psicologos/${psicologoId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/cuentas-psicologo/${psicologoId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (!resP.ok) throw new Error("No se pudo cargar el perfil");
            const data = await resP.json();

            user.actividadLegal = data.actividadLegal || '';
            localStorage.setItem('psicologo', JSON.stringify(user));

            document.querySelectorAll('.dropdown-header span').forEach(el => {
                el.textContent = user.actividadLegal;
                el.style.fontSize = '13px';
            });

            // Poblamos los campos
            document.getElementById('prof-nombre-completo').textContent = `${data.nombre} ${data.apellidos}`;
            document.getElementById('prof-tag-num').textContent = `${data.numColegiado || 'N/A'}`;

            document.getElementById('prof-nombre').textContent = data.nombre;
            document.getElementById('prof-apellidos').textContent = data.apellidos;
            document.getElementById('prof-dni').textContent = data.dni || 'No especificado';
            document.getElementById('prof-email').textContent = data.email || 'No especificado';

            document.getElementById('prof-num-col').textContent = data.numColegiado || 'No especificado';
            document.getElementById('prof-direccion').textContent = data.direccionFiscal || 'No especificado';
            document.getElementById('prof-actividad').textContent = data.actividadLegal || 'Profesional Autónomo';

            if (resC.ok) {
                const cuentas = await resC.json();
                const misCuentas = cuentas.filter(c => c.idPsicologo === parseInt(psicologoId));
                renderCuentas(misCuentas);
            }

        } catch (error) {
            console.error("Error cargando perfil:", error);
        }
    }

    /**
     * Renderiza la tabla de cuentas bancarias asociadas para facturación.
     */
    function renderCuentas(cuentas) {
        const tbody = document.getElementById('prof-cuentas-body');
        if (!cuentas || cuentas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2" style="text-align:center; padding:20px;">No hay cuentas bancarias registradas.</td></tr>';
            return;
        }

        tbody.innerHTML = cuentas.map(c => `
            <tr>
                <td><strong>${c.tipoCuenta || 'Sin tipo'}</strong></td>
                <td><strong>${c.descripcion || 'Sin descripción'}</strong></td>
                <td><code style="font-size: 1rem; color: #264574;">${c.identificador || 'N/A'}</code></td>
            </tr>
        `).join('');
    }

    cargarPerfil();
});