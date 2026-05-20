document.addEventListener('DOMContentLoaded', () => {
    console.log('Centro de Ayuda PsicoLogic inicializado.');

    const helpData = [
        {
            title: "Sobre PsicoLogic",
            text: "Una plataforma integral diseñada para psicólogos que buscan optimizar la gestión de sus pacientes, sesiones y facturación en un entorno seguro.",
            icon: "fa-rocket",
            colorClass: "icon-blue"
        },
        {
            title: "Gestión de Pacientes",
            text: "Crea fichas detalladas, gestiona contactos de referencia y adjunta documentos clínicos. Clasifica a tus pacientes por estado: Alta, Seguimiento o Evaluación.",
            icon: "fa-user-group",
            colorClass: "icon-teal"
        },
        {
            title: "Agenda Dinámica",
            text: "Organiza tu semana con el calendario interactivo. Permite arrastrar citas para reprogramarlas y gestionar modalidades presenciales u online de forma visual.",
            icon: "fa-calendar-check",
            colorClass: "icon-purple"
        },
        {
            title: "Análisis y Datos",
            text: "Visualiza el crecimiento de tu clínica con gráficos de facturación mensual, distribución por género y volumen de nuevos pacientes en tiempo real.",
            icon: "fa-chart-pie",
            colorClass: "icon-green"
        },
        {
            title: "Notas de Sesión",
            text: "Registra intervenciones, hipótesis y objetivos durante la consulta. El sistema guarda automáticamente tus borradores para que no pierdas nada.",
            icon: "fa-file-medical",
            colorClass: "icon-orange"
        }
    ];

    const carouselEl = document.getElementById('previewCarousel');
    const helpCard = document.getElementById('dynamic-help-card');
    const animator = document.getElementById('card-inner-animator');
    const titleEl = document.getElementById('help-title');
    const textEl = document.getElementById('help-text');
    const iconContEl = document.getElementById('help-icon');
    const dots = document.querySelectorAll('.dot');

    carouselEl.addEventListener('slide.bs.carousel', function (event) {
        const index = event.to;
        const direction = event.direction; // 'left' es Siguiente, 'right' es Anterior
        const data = helpData[index];

        // 1. Iniciamos la SALIDA del contenido actual
        if (direction === 'left') {
            animator.classList.add('content-exit-next');
        } else {
            animator.classList.add('content-exit-prev');
        }

        setTimeout(() => {
            // 2. Quitamos clases de salida y PREPARAMOS el nuevo contenido en el lado opuesto
            animator.classList.remove('content-exit-next', 'content-exit-prev');

            if (direction === 'left') {
                animator.classList.add('content-prepare-next');
            } else {
                animator.classList.add('content-prepare-prev');
            }

            // 3. Cambiamos los textos e iconos mientras el contenedor es invisible
            titleEl.textContent = data.title;
            textEl.textContent = data.text;
            iconContEl.className = `help-icon ${data.colorClass}`;
            iconContEl.innerHTML = `<i class="fa-solid ${data.icon}"></i>`;

            // Actualizar indicadores (dots)
            dots.forEach(d => d.classList.remove('active'));
            dots[index].classList.add('active');

            // 4. Forzamos al navegador a procesar el cambio de posición y luego activamos la entrada
            requestAnimationFrame(() => {
                // Un pequeño delay para asegurar que el 'prepare' se aplicó sin transición
                setTimeout(() => {
                    animator.classList.remove('content-prepare-next', 'content-prepare-prev');
                }, 20);
            });

        }, 350); // Tiempo sincronizado con la salida del CSS
    });
    
    const navWrapper = document.querySelector('.help-navigation-wrapper');
    const navBtns = document.querySelectorAll('.help-overlay-nav');

    navBtns.forEach(btn => {
        btn.addEventListener('mouseenter', () => navWrapper.classList.add('nav-hovering'));
        btn.addEventListener('mouseleave', () => navWrapper.classList.remove('nav-hovering'));
    });

    // --- LÓGICA DE SOPORTE TÉCNICO ---
    const btnSoporte = document.getElementById('btn-soporte-admin');
    if (btnSoporte && typeof user !== 'undefined' && user) {
        const nombreUsuario = `${user.nombre || ''} ${user.apellidos || ''}`.trim();
        const subject = encodeURIComponent(`Soporte técnico: ${nombreUsuario}`);
        
        // Cambiamos el enlace a mailto con el asunto dinámico
        btnSoporte.href = `mailto:davidgonzalezramajo@outlook.es?subject=${subject}`;
        btnSoporte.removeAttribute('target');
        btnSoporte.removeAttribute('rel');
    }
});