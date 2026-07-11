// Common UI components and shell layout injector
export function initSharedUI() {
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    
    // Parse current filename for navigation link state active styling
    const path = window.location.pathname;
    const isContact = path.includes('contact.html');
    const isSellers = path.includes('sellers.html');
    const isWishlist = path.includes('wishlist.html');
    const isProfile = path.includes('profile.html');
    const isAdmin = path.includes('admin.html');
    const isHome = path.includes('index.html') || path.endsWith('/') || (!isContact && !isSellers && !isWishlist && !isProfile && !isAdmin && !path.includes('product.html'));
    
    if (header) {
        header.innerHTML = `
            <div class="navbar">
                <a href="index.html" class="logo">Sualkuchi<span>Silks</span></a>
                <button class="menu-toggle" id="menu-toggle-btn" aria-label="Toggle Navigation" style="display: none; font-size: 1.8rem; background: none; border: none; cursor: pointer; color: var(--dark); line-height: 1;">&#9776;</button>
                <nav class="nav-links" id="navbar-links">
                    <a href="index.html" class="${isHome ? 'active' : ''}">Home</a>
                    <a href="sellers.html" class="${isSellers ? 'active' : ''}">Weaver Shops</a>
                    <a href="wishlist.html" class="${isWishlist ? 'active' : ''}">Wishlist & Orders</a>
                    <a href="contact.html" class="${isContact ? 'active' : ''}">Contact Us</a>
                    <a href="profile.html" class="${isProfile ? 'active' : ''}">My Profile</a>
                    <a href="admin.html" class="${isAdmin ? 'active' : ''}">Weaver Portal</a>
                </nav>
            </div>
        `;

        // Hamburger Menu click toggle script
        const toggleBtn = header.querySelector('#menu-toggle-btn');
        const navLinks = header.querySelector('#navbar-links');
        if (toggleBtn && navLinks) {
            toggleBtn.addEventListener('click', () => {
                navLinks.classList.toggle('show');
                if (navLinks.classList.contains('show')) {
                    toggleBtn.innerHTML = '&times;';
                    toggleBtn.style.fontSize = '2.2rem';
                } else {
                    toggleBtn.innerHTML = '&#9776;';
                    toggleBtn.style.fontSize = '1.8rem';
                }
            });
        }
    }
    
    if (footer) {
        footer.innerHTML = `
            <p>&copy; 2026 Sualkuchi Heritage Silks. Handcrafted with love in Assam.</p>
        `;
    }
}

// Automatically execute UI layout rendering when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSharedUI);
} else {
    initSharedUI();
}
