window.UiModal = {
    init: function() {
        if (document.getElementById('global-modal-overlay')) return;

        // Inject HTML
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
        
        // Load CSS dynamically if missing
        if (!document.querySelector('link[href*="global-modal.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/assets/css/global-modal.css'; 
            document.head.appendChild(link);
        }
    },

    open: function(title, message, buttons) {
        this.init();
        
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
        overlay.offsetHeight; // Force reflow
        overlay.classList.add('show');
    },

    close: function() {
        const overlay = document.getElementById('global-modal-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => { overlay.style.display = 'none'; }, 300);
        }
    },

    info: function(message, title = "Información", onAccept) {
        this.open(title, message, [
            { text: 'Aceptar', class: 'btn-modal-primary', callback: onAccept }
        ]);
    },

    confirm: function(message, title = "Confirmar acción", onConfirm, onCancel) {
        this.open(title, message, [
            { text: 'Cancelar', class: 'btn-modal-secondary', callback: onCancel },
            { text: 'Continuar', class: 'btn-modal-primary', callback: onConfirm }
        ]);
    }
};

document.addEventListener('DOMContentLoaded', () => UiModal.init());