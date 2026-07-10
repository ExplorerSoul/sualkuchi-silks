// Common UI components and shell layout injector
export function initSharedUI() {
    const header = document.querySelector('header');
    const footer = document.querySelector('footer');
    
    // Parse current filename for navigation link state active styling
    const path = window.location.pathname;
    const isContact = path.includes('contact.html');
    const isHome = path.includes('index.html') || path.endsWith('/') || (!isContact && !path.includes('admin.html') && !path.includes('product.html'));
    
    if (header) {
        header.innerHTML = `
            <div class="navbar">
                <a href="index.html" class="logo">Sualkuchi<span>Silks</span></a>
                <nav class="nav-links">
                    <a href="index.html" class="${isHome ? 'active' : ''}">Home</a>
                    <a href="contact.html" class="${isContact ? 'active' : ''}">Contact Us</a>
                </nav>
            </div>
        `;
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
