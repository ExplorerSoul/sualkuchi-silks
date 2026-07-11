// Seller Profile Showroom Controller
import { db, doc, getDoc, collection, getDocs, query, where } from '../core/db.js';
import { renderProductCard } from './product-card.js';

let sellerMap = null;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('id');
    
    if (!sellerId) {
        console.error("[Seller Showroom] Missing seller ID in query parameters.");
        document.getElementById('seller-shop-name').innerText = "Seller Not Found";
        return;
    }

    try {
        console.log(`[Seller Showroom] Fetching seller profile details for ID: ${sellerId}`);
        const sellerDocRef = doc(db, "sellers", sellerId);
        const sellerDocSnap = await getDoc(sellerDocRef);

        if (sellerDocSnap.exists()) {
            const seller = sellerDocSnap.data();
            console.log(`[Seller Showroom] Profile loaded: ${seller.shopName || 'Weaver'}`);

            // Fill page details
            const shopName = seller.shopName || "Authentic Handloom Weaver";
            document.getElementById('seller-shop-name').innerText = shopName;
            document.getElementById('seller-address').innerText = seller.address || "Natol, Sualkuchi, Kamrup, Assam - 781103";
            
            // Set Avatar first letter
            const firstLetter = shopName.charAt(0).toUpperCase();
            document.getElementById('seller-avatar').innerText = firstLetter;

            // Setup WhatsApp link
            const phone = seller.phone || "+919394769289";
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const whatsappText = `Hello! I visited your digital showroom page *${shopName}* and would like to inquire about your handloom collections.`;
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`;
            
            const waLink = document.getElementById('seller-whatsapp-link');
            if (waLink) {
                waLink.href = whatsappUrl;
            }

            // Load products listed by this seller
            loadSellerProducts(sellerId);

            // Initialize Leaflet satellite map with weaver shop coordinates
            const lat = Number(seller.latitude) || 26.167499;
            const lng = Number(seller.longitude) || 91.573768;
            initSellerSatelliteMap(lat, lng, shopName);

        } else {
            console.warn(`[Seller Showroom] No profile found matching seller ID: ${sellerId}`);
            document.getElementById('seller-shop-name').innerText = "Weaver Shop Not Found";
            document.getElementById('seller-address').innerText = "Weaver has not registered their shop profile details yet.";
        }

    } catch (error) {
        console.error("[Seller Showroom] Failed to bootstrap seller showroom page:", error);
    }
});

/**
 * Initializes interactive satellite map for the weaver's shop coordinates
 */
function initSellerSatelliteMap(lat, lng, shopName) {
    try {
        console.log(`[Seller Showroom Map] Rendering satellite view centered at: ${lat}, ${lng}`);
        sellerMap = L.map('seller-interactive-map', {
            zoomControl: false,
            dragging: !L.Browser.mobile,
            tap: !L.Browser.mobile
        }).setView([lat, lng], 16);

        // ESRI Satellite Imagery Layer
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19,
            attribution: '&copy; Esri &mdash; Sualkuchi'
        }).addTo(sellerMap);

        // ESRI World Transportation Overlay
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        }).addTo(sellerMap);

        // Drop pin at weaver location
        L.marker([lat, lng])
            .addTo(sellerMap)
            .bindPopup(`<b>${shopName}</b><br>Sualkuchi, Assam`)
            .openPopup();
            
        // Fix Leaflet sizing issue on load
        setTimeout(() => {
            sellerMap.invalidateSize();
        }, 500);

    } catch (e) {
        console.error("[Seller Showroom Map] Failed to load Leaflet interactive map:", e);
    }
}

/**
 * Load and display products belonging to this seller
 */
async function loadSellerProducts(sellerId) {
    const grid = document.getElementById('seller-products-grid');
    if (!grid) return;

    try {
        console.log(`[Seller Showroom Catalog] Querying products for seller UID: ${sellerId}`);
        const q = query(collection(db, "products"), where("sellerId", "==", sellerId));
        const querySnapshot = await getDocs(q);

        grid.innerHTML = ""; // Clear loaders

        if (querySnapshot.empty) {
            console.log("[Seller Showroom Catalog] No products found for this seller.");
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--gray); padding: 40px 10px;">
                This weaver has not uploaded any showroom collection items yet.
            </p>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const product = {
                id: doc.id,
                ...doc.data()
            };
            grid.innerHTML += renderProductCard(product);
        });

    } catch (err) {
        console.error("[Seller Showroom Catalog] Failed to query weaver products list:", err);
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--error); padding: 40px 10px;">
            Error loading weaver's collection items. Please try again later.
        </p>`;
    }
}
