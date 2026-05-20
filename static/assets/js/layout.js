/**
 * Script de Comportamiento del Layout.
 * Gestiona la barra lateral (sidebar), navegación activa y el perfil de usuario en el header.
 */
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('toggle-sidebar');
    const menuLinks = document.querySelectorAll('.sidebar a');

    /**
     * Control del colapso de la barra lateral.
     */
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

    /**
     * Resaltado automático del enlace activo en el menú lateral.
     */
    const currentPath = window.location.pathname;
    menuLinks.forEach(link => {
        link.classList.remove('active');
        const linkHref = link.getAttribute('href');
        if (linkHref && currentPath.includes(linkHref) && linkHref !== "#") {
            link.classList.add('active');
        }
    });

    if (typeof user !== 'undefined' && user) {
        document.querySelectorAll('.user-name-dinamico').forEach(el => el.textContent = user.nombre);

        const specSpan = document.querySelector('.dropdown-header span');
        if (specSpan) {
            if (user.actividadLegal) {
                specSpan.textContent = user.actividadLegal;
            } else {
                fetch(`${API_BASE}/psicologos/${user.idPsicologo || user.id}`)
                    .then(res => res.json())
                    .then(data => {
                        user.actividadLegal = data.actividadLegal || 'Psicólogo Colegiado';
                        localStorage.setItem('psicologo', JSON.stringify(user));
                        specSpan.textContent = user.actividadLegal;
                    }).catch(() => {
                        specSpan.textContent = 'Psicólogo Colegiado';
                    });
            }
            specSpan.style.paddingLeft = '0';
            specSpan.style.fontSize = '13px';
        }

        const avatarImg = document.querySelector('.avatar-dinamico');
        if (avatarImg) {
            const inicial = user.nombre.charAt(0).toUpperCase();
            avatarImg.src = `https://ui-avatars.com/api/?name=${inicial}&background=348ec2&color=fff&bold=true`;

            const dropdownPanel = document.getElementById('dropdown-panel');
            avatarImg.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownPanel?.classList.toggle('show');
            });

            if (dropdownPanel && !dropdownPanel.querySelector('a[href="tarifas.html"]')) {
                const linkTarifas = document.createElement('a');
                linkTarifas.href = 'tarifas.html';
                linkTarifas.innerHTML = '<i class="fa-solid fa-euro-sign"></i> Tarifas';

                const separator = document.createElement('hr');
                const linkAyuda = dropdownPanel.querySelector('a[href="ayuda.html"], a[href="configuracion.html"]')
                    || Array.from(dropdownPanel.querySelectorAll('a')).find(a => a.textContent.includes('Ayuda'));

                if (linkAyuda) {
                    dropdownPanel.insertBefore(linkTarifas, linkAyuda);
                    dropdownPanel.insertBefore(separator, linkAyuda);
                } else {
                    dropdownPanel.appendChild(linkTarifas);
                    dropdownPanel.appendChild(separator);
                }
            }

            document.addEventListener('click', (e) => {
                if (dropdownPanel && !dropdownPanel.contains(e.target) && e.target !== avatarImg) {
                    dropdownPanel.classList.remove('show');
                }
            });
        }
    }

    const btnLogouts = document.querySelectorAll('a[href="index.html"], #logout-link, .logout-section a');
    btnLogouts.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            UiModal.confirm("¿Estás seguro de que quieres cerrar sesión?", "Cerrar Sesión", () => {
                localStorage.clear();
                window.location.href = "index.html";
            });
        });
    });

    const logoLink = document.querySelector('.header-logo');
    const contentArea = document.querySelector('.content');

    if (logoLink && contentArea) {
        logoLink.addEventListener('click', (e) => {
            if (contentArea.scrollTop > 0) {
                e.preventDefault();
                e.stopPropagation();
                contentArea.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
});

window.addEventListener('load', () => {
    const contentLoader = document.getElementById('content-loader');
    if (contentLoader) {
        setTimeout(() => {
            contentLoader.classList.add('loader-hidden');
        }, 300);
    }
});