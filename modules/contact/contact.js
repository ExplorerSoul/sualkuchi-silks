// Contact Module Initialization
export function initContact() {
    console.log("Contact page actions ready.");
}

// Auto run on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContact);
} else {
    initContact();
}
