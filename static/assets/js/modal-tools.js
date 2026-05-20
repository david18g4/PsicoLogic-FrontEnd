const ModalTools = {
    /**
     * Configura el comportamiento de cierre de un modal.
     * @param {string} overlayId - ID del div overlay del modal.
     * @param {function} [onCloseCallback] - Función opcional a ejecutar al cerrar (ej: limpiar form).
     */
    setup: function(overlayId, onCloseCallback) {
        const overlay = document.getElementById(overlayId);
        if (!overlay) return;

        // 1. Cerrar al hacer clic en el fondo oscuro
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close(overlayId, onCloseCallback);
            }
        });

        // 2. Cerrar con botones estándar (.btn-close-x, .btn-secondary, etc) dentro del modal
        const closeButtons = overlay.querySelectorAll('.btn-close-x, .btn-cancelar-modal');
        closeButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault(); 
                this.close(overlayId, onCloseCallback);
            };
        });
    },

    close: function(overlayId, callback) {
        const overlay = document.getElementById(overlayId);
        if (overlay) overlay.style.display = 'none';
        if (typeof callback === 'function') callback();
    },

    open: function(overlayId) {
        const overlay = document.getElementById(overlayId);
        if (overlay) overlay.style.display = 'flex';
    }
};