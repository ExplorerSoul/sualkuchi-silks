// Weavers Directory Controller for sellers.html
import { db, collection, getDocs } from '../core/db.js';

let directoryMap = null;
let mapMarkers = [];
let allSellers = [];
let searchQuery = "";

document.addEventListener('DOMContentLoaded', async () => {
    const searchInput = document.getElementById('seller-search-input');
    const clearBtn = document.getElementById('seller-search-clear-btn');
    const grid = document.getElementById('sellers-list-grid');

    // 1. Initialize Sualkuchi Wide Map directory
    initDirectoryMap();

    try {
        console.log("[Sellers Directory] Querying all registered weavers...");
        const querySnapshot = await getDocs(collection(db, "sellers"));
        
        allSellers = [];
        querySnapshot.forEach((docSnap) => {
            allSellers.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });

        console.log(`[Sellers Directory] Loaded ${allSellers.length} weavers.`);
        
        // Initial render
        filterAndRenderSellers();

    } catch (error) {
        console.error("[Sellers Directory] Failed to load directory data:", error);
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--error); padding: 40px 0;">
            Failed to load weaver directory. Please try again later.
        </p>`;
    }

    // 2. Search box handlers
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            if (searchQuery.length > 0) {
                clearBtn.style.display = 'block';
            } else {
                clearBtn.style.display = 'none';
            }
            filterAndRenderSellers();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            searchInput.value = "";
            searchQuery = "";
            clearBtn.style.display = 'none';
            filterAndRenderSellers();
        });
    }
});

/**
 * Initialize directory map centered at Sualkuchi Kamrup
 */
function initDirectoryMap() {
    try {
        console.log("[Sellers Directory Map] Bootstrapping Satellite Directory Map...");
        directoryMap = L.map('sellers-directory-map', {
            scrollWheelZoom: false
        }).setView([26.167499, 91.573768], 15);

        // ESRI Satellite Imagery Layer
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '&copy; Esri &mdash; Sualkuchi Directory'
        }).addTo(directoryMap);

        // ESRI World Transportation Overlay
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        }).addTo(directoryMap);

        setTimeout(() => {
            directoryMap.invalidateSize();
        }, 500);

    } catch (e) {
        console.error("[Sellers Directory Map] Failed to bootstrap Leaflet map:", e);
    }
}

/**
 * Filter weavers based on name or address query and update map pins + cards
 */
function filterAndRenderSellers() {
    const grid = document.getElementById('sellers-list-grid');
    if (!grid) return;

    // Filter array
    const filtered = allSellers.filter(seller => {
        const name = (seller.shopName || '').toLowerCase();
        const address = (seller.address || '').toLowerCase();
        return name.includes(searchQuery) || address.includes(searchQuery);
    });

    // 1. Update Map Markers
    if (directoryMap) {
        // Clear old markers
        mapMarkers.forEach(marker => directoryMap.removeLayer(marker));
        mapMarkers = [];

        // Plot new pins
        filtered.forEach(seller => {
            const lat = Number(seller.latitude);
            const lng = Number(seller.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                const shopName = seller.shopName || "Weaver Shop";
                const marker = L.marker([lat, lng])
                    .addTo(directoryMap)
                    .bindPopup(`
                        <div style="font-family: inherit; font-size: 0.9rem;">
                            <strong style="color: var(--maroon);">${shopName}</strong><br>
                            <span style="color: var(--gray); font-size: 0.8rem;">${seller.address || ''}</span><br>
                            <a href="seller.html?id=${seller.id}" style="color: var(--gold); font-weight: bold; text-decoration: none; margin-top: 5px; display: inline-block;">Visit Showroom &rarr;</a>
                        </div>
                    `);
                mapMarkers.push(marker);
            }
        });

        // Auto pan map bounds if matching markers are plotted
        if (mapMarkers.length > 0) {
            const group = new L.featureGroup(mapMarkers);
            directoryMap.fitBounds(group.getBounds().pad(0.15), { maxZoom: 16 });
        }
    }

    // 2. Update Showroom Cards
    grid.innerHTML = "";

    if (filtered.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--gray); padding: 40px 0;">
            No weaver shops found matching your search.
        </p>`;
        return;
    }

    filtered.forEach(seller => {
        const shopName = seller.shopName || "Authentic Handloom Weaver";
        const firstLetter = shopName.charAt(0).toUpperCase();
        const phone = seller.phone || "+919394769289";
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const whatsappText = `Hello! I would like to inquire about your handloom creations.`;
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`;

        const cardHTML = `
            <div class="seller-item-card">
                <div class="seller-card-header">
                    <div class="seller-card-avatar">${firstLetter}</div>
                    <div class="seller-card-title">${shopName}</div>
                </div>
                <div class="seller-card-address">${seller.address || 'Sualkuchi, Kamrup, Assam - 781103'}</div>
                <div class="seller-card-actions">
                    <a href="seller.html?id=${seller.id}" class="seller-card-btn btn" style="background: var(--maroon); color: var(--white);">Visit Showroom</a>
                    <a href="${whatsappUrl}" target="_blank" class="seller-card-btn whatsapp-outline-btn">WhatsApp</a>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}
