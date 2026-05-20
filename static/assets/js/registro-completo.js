/**
 * Controlador del formulario de Registro Completo.
 * Gestiona el paso final de creación de cuenta del psicólogo.
 */
document.addEventListener('DOMContentLoaded', () => {

    const params = new URLSearchParams(window.location.search);
    const emailUrl = params.get('email');
    if (emailUrl) {
        const emailInput = document.getElementById('reg-correo');
        if (emailInput) emailInput.value = emailUrl;
    }


    const btnCancelar = document.getElementById('btn-cancelar-registro');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }

    /**
     * Envía todos los datos del perfil y la cuenta bancaria inicial al servidor.
     */
    const form = document.getElementById('form-registro-completo');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                nombre: document.getElementById('reg-nombre').value,
                apellidos: document.getElementById('reg-apellidos').value,
                dni: document.getElementById('reg-dni').value,
                numColegiado: document.getElementById('reg-numColegiado').value,
                actividadLegal: document.getElementById('reg-actividad').value,
                direccionFiscal: document.getElementById('reg-direccion').value,
                email: document.getElementById('reg-correo').value,
                password: document.getElementById('reg-password').value,
                bancoDescripcion: document.getElementById('bank-desc').value,
                bancoTipo: document.getElementById('bank-tipo').value,
                bancoIdentificador: document.getElementById('bank-identificador').value
            };

            try {
                const response = await fetch(`${API_BASE}/cuentas-psicologo/registro-completo`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    alert("¡Perfil creado con éxito! Ya puedes iniciar sesión.");
                    window.location.href = "index.html";
                } else {
                    const error = await response.json();
                    alert("Error: " + (error.message || "No se pudo completar el registro"));
                }
            } catch (err) {
                console.error(err);
                alert("Error crítico de conexión.");
            }
        });
    }
});