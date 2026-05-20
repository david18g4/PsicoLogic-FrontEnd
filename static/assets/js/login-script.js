// 1. CONFIGURACIÓN Y SELECTORES
const contenedor = document.getElementById('contenedor');
const botonIrARegistro = document.getElementById('ir-a-registro');
const botonVolverInicioSesion = document.getElementById('volver-inicio-sesion');
const botonLogin = document.getElementById("iniciar-sesion");
const botonRegistrar = document.getElementById("btn-registrar");
const regCorreoInput = document.getElementById('reg-correo'); // Selector para el input de correo de registro
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');

// Sincronización del nombre de la app desde el back
(async function sincronizarApp() {
    try {
        const res = await fetch(`${API_BASE}/config/public`);
        if (res.ok) {
            const config = await res.json();
            if (config.appName) {
                document.querySelectorAll('.nombre-app-texto').forEach(el => el.textContent = config.appName);
            }
        }
    } catch (e) { /* Fallback silencioso */ }
})();

// 2. ANIMACIONES DE INTERFAZ
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

// 3. LÓGICA DE LOGIN CENTRALIZADA
async function ejecutarLogin() {
    // Obtenemos los valores de los inputs en el momento del envío
    const correoInput = loginEmailInput ? loginEmailInput.value : "";
    const passwordInput = loginPasswordInput ? loginPasswordInput.value : "";

    if (correoInput.trim() === "" || passwordInput.trim() === "") {
        UiModal.info("Por favor, rellena todos los campos.", "Campos incompletos");
        return;
    }

    // LIMPIEZA ANTES DE NUEVO LOGIN: Asegura que no enviamos basura previa
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

            // Almacenamos Token y datos de usuario
            localStorage.setItem('psicologo_token', data.token);

            const sesionPsicologo = {
                id: data.idPsicologo,
                email: data.email,
                nombre: data.nombre || "Usuario",
                apellidos: data.apellidos || ""
            };
            localStorage.setItem('psicologo', JSON.stringify(sesionPsicologo));

            // Animación de salida
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

// 4. LÓGICA DE EXTENSIÓN (REFRESH) OPCIONAL
// Esta función puedes llamarla desde home.html para renovar el token
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

// --- EVENTOS DE DISPARO (Trigger) ---

// Escuchar clic en el botón
if (botonLogin) {
    botonLogin.addEventListener("click", ejecutarLogin);
}

// Escuchar clic en el botón de registro
if (botonRegistrar) {
    botonRegistrar.addEventListener("click", ejecutarRegistro);
}

// Escuchar tecla "Enter" de forma global en la página de login
document.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        const enfocado = document.activeElement;

        // 1. Si el input de correo de registro está enfocado, ejecutar registro
        if (enfocado === regCorreoInput) {
            ejecutarRegistro();
        }
        // 2. Si están enfocados los inputs de login, ejecutar login
        else if (enfocado === loginEmailInput || enfocado === loginPasswordInput) {
            ejecutarLogin();
        }
        // 3. Fallback: Si el contenedor tiene la clase 'active' (formulario de registro visible)
        else if (contenedor && contenedor.classList.contains('active')) {
            ejecutarRegistro();
        } else { 
            ejecutarLogin();
        }
    }
});