/**
 * Controlador de la página de Login y Registro Inicial.
 */
const contenedor = document.getElementById('contenedor');
const botonIrARegistro = document.getElementById('ir-a-registro');
const botonVolverInicioSesion = document.getElementById('volver-inicio-sesion');
const botonLogin = document.getElementById("iniciar-sesion");
const botonRegistrar = document.getElementById("btn-registrar");
const regCorreoInput = document.getElementById('reg-correo');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');

/**
 * Obtiene el nombre de la aplicación desde la configuración pública del servidor.
 */
(async function sincronizarApp() {
    try {
        const res = await fetch(`${API_BASE}/config/public`);
        if (res.ok) {
            const config = await res.json();
            if (config.appName) {
                document.querySelectorAll('.nombre-app-texto').forEach(el => el.textContent = config.appName);
            }
        }
    } catch (e) { }
})();

if (botonIrARegistro) {
    botonIrARegistro.addEventListener('click', () => {
        contenedor.classList.add('active');
    });
}

if (botonVolverInicioSesion) {
    botonVolverInicioSesion.addEventListener('click', () => {
        contenedor.classList.remove('active');
    });
}

/**
 * Procesa el inicio de sesión del usuario.
 */
async function ejecutarLogin() {
    const correoInput = loginEmailInput ? loginEmailInput.value : "";
    const passwordInput = loginPasswordInput ? loginPasswordInput.value : "";

    if (correoInput.trim() === "" || passwordInput.trim() === "") {
        UiModal.info("Por favor, rellena todos los campos.", "Campos incompletos");
        return;
    }

    localStorage.clear();

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                correo: correoInput,
                password: passwordInput
            })
        });

        if (response.ok) {
            const data = await response.json();

            localStorage.setItem('psicologo_token', data.token);

            const sesionPsicologo = {
                id: data.idPsicologo,
                email: data.email,
                nombre: data.nombre || "Usuario",
                apellidos: data.apellidos || ""
            };
            localStorage.setItem('psicologo', JSON.stringify(sesionPsicologo));

            contenedor.style.transition = "opacity 0.4s ease, transform 0.4s ease";
            contenedor.style.opacity = "0";
            contenedor.style.transform = "scale(0.95)";

            setTimeout(() => {
                window.location.href = "home.html";
            }, 150);

        } else {
            UiModal.info("Error al iniciar sesión: Credenciales incorrectas", "Error de Acceso");
        }

    } catch (error) {
        console.error("Error de conexión:", error);
        UiModal.info("Error crítico: No se pudo conectar con el servidor.", "Error de Conexión");
    }
}

/**
 * Valida el correo y redirige al formulario de registro completo si está disponible.
 */
async function ejecutarRegistro() {
    const correo = document.getElementById('reg-correo').value;

    if (!correo.trim() || !correo.includes('@')) {
        UiModal.info("Por favor, introduce un correo electrónico válido.", "Email inválido");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/cuentas-psicologo/check-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: correo })
        });

        if (response.ok) {
            const existe = await response.json();
            if (existe) {
                UiModal.info("Ya existe una cuenta asociada a este correo electrónico.", "Email duplicado");
            } else {
                window.location.href = `registro-completo.html?email=${encodeURIComponent(correo)}`;
            }
        }
    } catch (error) {
        console.error("Error al verificar el correo:", error);
        UiModal.info("No se pudo verificar la disponibilidad del correo en este momento.", "Error de Conexión");
    }
}

/**
 * Renueva el token JWT para mantener la sesión activa.
 */
async function extenderSesion() {
    const token = localStorage.getItem('psicologo_token');
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('psicologo_token', data.token);
            console.log("Sesión extendida");
        }
    } catch (e) {
        console.error("No se pudo extender la sesión");
    }
}

if (botonLogin) {
    botonLogin.addEventListener("click", ejecutarLogin);
}

if (botonRegistrar) {
    botonRegistrar.addEventListener("click", ejecutarRegistro);
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        const enfocado = document.activeElement;

        if (enfocado === regCorreoInput) {
            ejecutarRegistro();
        }

        else if (enfocado === loginEmailInput || enfocado === loginPasswordInput) {
            ejecutarLogin();
        }

        else if (contenedor && contenedor.classList.contains('active')) {
            ejecutarRegistro();
        } else { 
            ejecutarLogin();
        }
    }
});