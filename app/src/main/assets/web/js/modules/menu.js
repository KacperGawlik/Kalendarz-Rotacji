import { ELEMENTS } from '../config/constants.js';

export class MenuManager {
    constructor(onPageChange) {
        this.onPageChange = onPageChange;
    }

    toggleMenu() {
        const menu = document.getElementById(ELEMENTS.SIDE_MENU);
        const overlay = document.getElementById(ELEMENTS.MENU_OVERLAY);
        menu.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    showPage(pageName) {
        // Hide all pages
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected page
        document.getElementById(pageName + 'Page').classList.add('active');

        // Update menu active state
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.menu-item').classList.add('active');

        // Close menu
        this.toggleMenu();

        // Notify parent about page change
        if (this.onPageChange) {
            this.onPageChange(pageName);
        }
    }
}

// Make functions globally available for onclick handlers
window.toggleMenu = function() {
    if (window.menuManager) {
        window.menuManager.toggleMenu();
    }
};

window.showPage = function(pageName) {
    if (window.menuManager) {
        window.menuManager.showPage(pageName);
    }
};