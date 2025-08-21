document.addEventListener('DOMContentLoaded', () => {
    const mainNav = document.getElementById('mainNav');
    const secondaryNav = document.getElementById('secondaryNav');
    const tabContents = document.querySelectorAll('.tab-content');

    const switchTab = (nav, tab) => {
        // Deactivate all tabs in the same navigation
        nav.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        // Deactivate all tab contents
        tabContents.forEach(c => c.classList.remove('active'));

        // Activate the clicked tab
        tab.classList.add('active');
        // Activate the corresponding tab content
        const tabId = tab.dataset.tab;
        const activeContent = document.getElementById(tabId);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    };

    mainNav.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-tab')) {
            switchTab(mainNav, e.target);
        }
    });

    secondaryNav.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-tab')) {
            switchTab(secondaryNav, e.target);
        }
    });
});
