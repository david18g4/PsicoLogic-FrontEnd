/**
 * Utilidades de control para ventanas modales.
 */
const ModalTools = {
    /**
     * Configura el comportamiento de cierre de un modal.
     * @param {string} overlayId - ID del div overlay del modal.
     * @param {function} [onCloseCallback] - Función opcional a ejecutar al cerrar (ej: limpiar form).
     */
    setup: function (overlayId, onCloseCallback) {
        const overlay = document.getElementById(overlayId);
        if (!overlay) return;

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close(overlayId, onCloseCallback);
            }
        });

        const closeButtons = overlay.querySelectorAll('.btn-close-x, .btn-cancelar-modal');
        closeButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                this.close(overlayId, onCloseCallback);
            };
        });
    },

    /**
     * Cierra el modal y ejecuta un callback de limpieza opcional.
     */
    close: function (overlayId, callback) {
        const overlay = document.getElementById(overlayId);
        if (overlay) overlay.style.display = 'none';
        if (typeof callback === 'function') callback();
    },

    /**
     * Muestra el modal estableciendo el display a flex.
     */
    open: function (overlayId) {
        const overlay = document.getElementById(overlayId);
        if (overlay) overlay.style.display = 'flex';
    }
};