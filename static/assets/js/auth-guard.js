// 1. VARIABLES GLOBALES (Disponibles para todos los archivos que carguen este JS)
// const API_BASE = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
const API_BASE = "http://98.83.121.160:8080";
let token = localStorage.getItem('psicologo_token');
let user = JSON.parse(localStorage.getItem('psicologo'));

// --- INTERCEPTOR GLOBAL DE FETCH ---
// Detecta si alguna petición devuelve 401 (Token caducado) y expulsa al usuario
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    let [resource, config] = args;

    // Si el token existe y la petición va a nuestra API, lo inyectamos automáticamente
    if (token && resource.toString().startsWith(API_BASE)) {
        config = config || {};
        config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
        };
    }

    const response = await originalFetch(resource, config);
    // Si recibimos un 401 y no es una página pública (login o registro), forzamos salida
    const currentPath = window.location.pathname;
    const esPublico = currentPath.includes("index.html") || currentPath.includes("registro-completo.html");

    if (response.status === 401 && !esPublico) {
        console.warn("Sesión invalidada por el servidor (401). Redirigiendo...");
        forzarLogout();
        return new Promise(() => { }); // Detiene la ejecución posterior
    }
    return response;
};

(function () {
    const path = window.location.pathname;
    let sesionValida = false;

    // 2. VERIFICACIÓN TÉCNICA
    if (token && user) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000;
            if (Date.now() < exp) {
                sesionValida = true;
            } else {
                localStorage.clear();
            }
        } catch (e) {
            localStorage.clear();
        }
    }

    // 3. CONTROL DE REDIRECCIONES
    const esPaginaPublica = path.endsWith("index.html") || path === "/" || path.endsWith("/") || 
                            path.endsWith("login.html") || path.endsWith("registro-completo.html");

    if (esPaginaPublica) {
        if (sesionValida) window.location.href = "home.html";
    } else {
        if (!sesionValida) window.location.href = "index.html?error=expired";
    }
})();

// --- 5. VIGILANCIA ACTIVA ---
function vigilarSesion() {
    if (!token) return;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp * 1000;
        const tiempoRestante = exp - Date.now();

        if (tiempoRestante > 0 && tiempoRestante < 600000) { // 5 MINUTOS (revisar para no interrumpir sesiones)
            const minutos = Math.floor(tiempoRestante / 60000);
            const segundos = Math.floor((tiempoRestante % 60000) / 1000);

            const mensaje = `Tu sesión expirará en ${minutos} minuto(s) y ${segundos} segundo(s). ¿Deseas extenderla?`;

            if (!window.confirmandoExpiracion) {
                window.confirmandoExpiracion = true;
                if (confirm(mensaje)) {
                    extenderSesion();
                } else {
                    // El usuario hizo clic en Cancelar en el diálogo de confirmación
                    window.confirmandoExpiracion = false;
                }
            }
        }
        if (tiempoRestante <= 0) forzarLogout();
    } catch (e) { forzarLogout(); }
}

async function extenderSesion() {
    try {
        const resp = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (resp.ok) {
            const data = await resp.json();
            localStorage.setItem('psicologo_token', data.token);
            token = data.token; // ACTUALIZACIÓN CRÍTICA: Actualiza la variable en memoria
            alert("Sesión extendida.");
        } else {
            forzarLogout();
        }
    } catch (error) {
        console.error("Error al refrescar:", error);
        forzarLogout(); // Forzar cierre de sesión también en caso de error al refrescar
    } finally {
        window.confirmandoExpiracion = false; // Restablecer la bandera después de intentar refrescar
    }
}
function forzarLogout() {
    window.confirmandoExpiracion = false;
    localStorage.clear();
    window.location.href = "index.html?error=expired";
}

// Vigilancia cada 30 segundos para mayor precisión
setInterval(vigilarSesion, 30000);


// --- 6. SISTEMA GLOBAL DE MODALES (UiModal) ---
// Integrado aquí para asegurar disponibilidad en toda la aplicación sin editar HTMLs
window.UiModal = {
    init: function () {
        if (document.getElementById('global-modal-overlay')) return;

        // Inyectar HTML del modal
        const html = `
            <div id="global-modal-overlay" class="global-modal-overlay" style="display: none;">
                <div class="global-modal-box">
                    <div class="global-modal-header">
                        <h3 id="global-modal-title">Aviso</h3>
                    </div>
                    <div class="global-modal-body" id="global-modal-message"></div>
                    <div class="global-modal-footer" id="global-modal-actions"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        // Cargar CSS dinámicamente si falta
        if (!document.querySelector('link[href*="global-modal.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/assets/css/global-modal.css';
            document.head.appendChild(link);
        }
    },

    open: function (title, message, buttons) {
        this.init(); // Asegurar que existe

        document.getElementById('global-modal-title').textContent = title;
        document.getElementById('global-modal-message').innerHTML = message;

        const footer = document.getElementById('global-modal-actions');
        footer.innerHTML = '';

        buttons.forEach(btn => {
            const b = document.createElement('button');
            b.className = `btn-modal ${btn.class || 'btn-modal-primary'}`;
            b.textContent = btn.text;
            b.onclick = () => {
                if (btn.callback) btn.callback();
                if (btn.close !== false) this.close();
            };
            footer.appendChild(b);
        });

        const overlay = document.getElementById('global-modal-overlay');
        overlay.style.display = 'flex';
        // Forzar reflow para la animación
        overlay.offsetHeight;
        overlay.classList.add('show');
    },

    close: function () {
        const overlay = document.getElementById('global-modal-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => { overlay.style.display = 'none'; }, 300);
        }
    },

    info: function (message, title = "Información", onAccept) {
        this.open(title, message, [
            { text: 'Aceptar', class: 'btn-modal-primary', callback: onAccept }
        ]);
    },

    confirm: function (message, title = "Confirmar acción", onConfirm, onCancel) {
        this.open(title, message, [
            { text: 'Cancelar', class: 'btn-modal-secondary', callback: onCancel },
            { text: 'Continuar', class: 'btn-modal-primary', callback: onConfirm }
        ]);
    }
};

// Inicializar modal cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => window.UiModal.init());