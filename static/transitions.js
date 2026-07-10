document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';
    document.body.appendChild(overlay);

    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || link.target === '_blank') return;

            e.preventDefault();

            if (document.startViewTransition) {
                document.startViewTransition(() => {
                    window.location.href = href;
                });
            } else {
                overlay.classList.add('active');
                setTimeout(() => {
                    window.location.href = href;
                }, 300);
            }
        });
    });
});