// Product Details Controller for product.html
import { fetchProductById } from './products.js';
import { db, doc, getDoc } from '../core/db.js';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const container = document.getElementById('product-detail-view');
    
    if (!container) return;
    
    if (!productId) {
        console.warn("[Product Details Page] Missing product ID query parameter in URL.");
        container.innerHTML = `<div class="error-msg"><p>Product ID is missing. <a href="index.html">Return to Collection</a></p></div>`;
        return;
    }
    
    try {
        console.log(`[Product Details Page] Initializing details lookup for ID: ${productId}`);
        container.innerHTML = `<div class="loading-msg"><p>Loading product details...</p></div>`;
        
        const item = await fetchProductById(productId);
        
        if (item) {
            console.log(`[Product Details Page] Product details loaded successfully. Name: "${item.name}"`);
            
            let formattedPrice = item.price;
            try {
                const numericPrice = Number(item.price);
                if (!isNaN(numericPrice)) {
                    formattedPrice = numericPrice.toLocaleString('en-IN');
                }
            } catch (e) {
                console.warn("[Product Details Page] Price formatting fallback triggered due to parsing error.");
            }
            
            // Fetch matching Seller details from Firestore
            let sellerDetails = null;
            if (item.sellerId) {
                try {
                    console.log(`[Product Details Page] Querying seller profile database for UID: ${item.sellerId}`);
                    const sellerDocRef = doc(db, "sellers", item.sellerId);
                    const sellerDocSnap = await getDoc(sellerDocRef);
                    if (sellerDocSnap.exists()) {
                        sellerDetails = sellerDocSnap.data();
                        console.log(`[Product Details Page] Seller profile found: "${sellerDetails.shopName || 'Home Weaver'}"`);
                    } else {
                        console.warn(`[Product Details Page] Seller document for UID ${item.sellerId} does not exist in Firestore.`);
                    }
                } catch (err) {
                    console.error("[Product Details Page] Failed to query seller profile database:", err);
                }
            } else {
                console.warn("[Product Details Page] Product document does not contain a sellerId reference.");
            }
            
            // Fallback default details if seller profile does not exist
            const shopName = sellerDetails && sellerDetails.shopName 
                ? sellerDetails.shopName 
                : "AK Muga Silk Center";
                
            const shopAddress = sellerDetails && sellerDetails.address 
                ? sellerDetails.address 
                : "Natol, Sualkuchi, Kamrup, Assam - 781103";
                
            const sellerPhoneRaw = sellerDetails && sellerDetails.phone 
                ? sellerDetails.phone 
                : "+919394769289";
                
            const latitude = sellerDetails && sellerDetails.latitude 
                ? sellerDetails.latitude 
                : 26.167499244075803;
                
            const longitude = sellerDetails && sellerDetails.longitude 
                ? sellerDetails.longitude 
                : 91.57376804821594;
            
            console.log(`[Product Details Page] Dynamic map coordinates set: ${latitude}, ${longitude}`);
            console.log(`[Product Details Page] WhatsApp contact link routed to: ${sellerPhoneRaw}`);

            // Clean phone for WhatsApp link
            const cleanPhone = sellerPhoneRaw.replace(/[^0-9]/g, '');
            
            // Prefilled message string
            const whatsappText = `Hello! I would like to inquire about your product: *${item.name}* (Price: ₹${formattedPrice}). Is it available?`;
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`;
            
            container.innerHTML = `
                <div class="product-image">
                    <img src="${item.image || 'download.jpg'}" alt="${item.name}">
                </div>
                
                <div class="product-info">
                    <div class="auth-tags">
                        <span class="tag silk-mark">✔ Silk Mark Certified</span>
                        <span class="tag handloom-mark">🖐 Handloom</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                        <h1 class="p-title" style="margin: 0; flex: 1;">${item.name}</h1>
                        <button id="add-to-wishlist-btn" style="background: none; border: none; font-size: 2.2rem; cursor: pointer; color: #ccc; transition: var(--transition); line-height: 1; padding: 0;" title="Add to Wishlist">♥</button>
                    </div>
                    <p class="p-price">₹ ${formattedPrice}</p>
                    
                    <div class="p-description">
                        <h3>About this Masterpiece</h3>
                        <p>${item.description || 'No description available for this handloom creation.'}</p>
                    </div>

                    <div class="p-meta">
                        <p><strong>Weaver Shop/Home:</strong> ${shopName}</p>
                        <p><strong>Weaver Address:</strong> ${shopAddress}</p>
                        <p><strong>Material:</strong> Authentic Assam Silk (Paat/Muga)</p>
                    </div>

                    <!-- Dynamic Google Map centered at seller coordinates -->
                    <div class="seller-map" style="margin-top: 10px;">
                        <h4 style="margin-bottom: 8px; font-size: 1rem; color: var(--dark); font-family: inherit;">Shop Location on Map:</h4>
                        <iframe 
                            src="https://maps.google.com/maps?q=${latitude},${longitude}&z=17&output=embed" 
                            width="100%" 
                            height="220" 
                            style="border:0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);" 
                            allowfullscreen="" 
                            loading="lazy" 
                            referrerpolicy="no-referrer-when-downgrade">
                        </iframe>
                    </div>

                    <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 15px; width: 100%;">
                        <a href="seller.html?id=${item.sellerId || ''}" class="btn" style="background-color: var(--maroon); color: var(--white); font-weight: 700; flex: 1; text-align: center; padding: 16px; border-radius: 8px; box-shadow: 0 4px 10px rgba(128,0,0,0.15); display: block;">Visit Shop Profile</a>
                        <a href="${whatsappUrl}" target="_blank" class="buy-btn btn" style="margin-top: 0; flex: 1; display: block; border-radius: 8px;">Inquire via WhatsApp</a>
                    </div>
                </div>
            `;

            // Wishlist Toggle Logic
            const wishlistBtn = document.getElementById('add-to-wishlist-btn');
            
            function getWishlist() {
                try {
                    const wl = sessionStorage.getItem('wishlist');
                    return wl ? JSON.parse(wl) : [];
                } catch(e) {
                    return [];
                }
            }

            function isBookmarked() {
                const wl = getWishlist();
                return wl.some(x => x.id === item.id);
            }

            function updateWishlistButtonState() {
                if (isBookmarked()) {
                    wishlistBtn.style.color = 'var(--maroon)';
                    wishlistBtn.title = 'Remove from Wishlist';
                } else {
                    wishlistBtn.style.color = '#ccc';
                    wishlistBtn.title = 'Add to Wishlist';
                }
            }

            if (wishlistBtn) {
                // Set initial status
                updateWishlistButtonState();

                wishlistBtn.addEventListener('click', () => {
                    let wl = getWishlist();
                    if (isBookmarked()) {
                        wl = wl.filter(x => x.id !== item.id);
                        console.log(`[Product Details] Bookmark removed for ID: ${item.id}`);
                    } else {
                        wl.push({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            image: item.image || '',
                            category: item.category || 'Mekhela Sador'
                        });
                        console.log(`[Product Details] Bookmark saved for ID: ${item.id}`);
                    }
                    sessionStorage.setItem('wishlist', JSON.stringify(wl));
                    updateWishlistButtonState();
                });
            }
        } else {
            console.warn(`[Product Details Page] fetchProductById returned empty details for ID: ${productId}`);
            container.innerHTML = `<div class="error-msg"><p>Product does not exist! <a href="index.html">Return to Collection</a></p></div>`;
        }
    } catch (error) {
        console.error(`[Product Details Page] Error initializing product detail page for ID ${productId}:`, error);
        container.innerHTML = `<div class="error-msg"><p>Error loading product details. Please try again later. <a href="index.html">Back to Collection</a></p></div>`;
    }
});
