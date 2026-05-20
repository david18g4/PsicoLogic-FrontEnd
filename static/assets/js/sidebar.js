document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    const menuLinks = document.querySelectorAll('.sidebar a');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebarStatus', isCollapsed ? 'collapsed' : 'expanded');
        });
    }

    const status = localStorage.getItem('sidebarStatus');

    if (sidebar) {
        if (status === 'collapsed' || status === null) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }
    }

    const currentPath = window.location.pathname;

    menuLinks.forEach(link => {
        link.classList.remove('active');
        const linkHref = link.getAttribute('href');

        if (linkHref && currentPath.includes(linkHref) && linkHref !== "#") {
            link.classList.add('active');
        }

        if (linkHref && currentPath.includes('sesion.html') && linkHref.includes('sesion')) {
            link.classList.add('active');
        }
    });
});