// Wishlist & Orders Tracker controller
import { db, collection, getDocs, query, where, doc, getDoc, auth, onAuthStateChanged } from '../core/db.js';
import { renderProductCard } from './product-card.js';

let allBookmarkedProducts = [];

document.addEventListener('DOMContentLoaded', () => {
    // Tab togglers
    const tabWishlistBtn = document.getElementById('tab-wishlist-btn');
    const tabOrdersBtn = document.getElementById('tab-orders-btn');
    const panelWishlist = document.getElementById('panel-wishlist');
    const panelOrders = document.getElementById('panel-orders');

    // Customer Orders inputs
    const trackerLoginBox = document.getElementById('tracker-login-box');
    const trackerDashboard = document.getElementById('tracker-dashboard');
    const trackerPhoneInput = document.getElementById('tracker-phone-input');
    const trackerSubmitBtn = document.getElementById('tracker-submit-btn');
    const trackerPhoneLabel = document.getElementById('tracker-phone-label');
    const trackerLogoutBtn = document.getElementById('tracker-logout-btn');

    if (!tabWishlistBtn) return;

    // 1. Tab Navigation click logic
    tabWishlistBtn.addEventListener('click', () => {
        tabWishlistBtn.classList.add('active');
        tabOrdersBtn.classList.remove('active');
        panelWishlist.classList.add('active');
        panelOrders.classList.remove('active');
        
        loadWishlistItems();
    });

    tabOrdersBtn.addEventListener('click', () => {
        tabOrdersBtn.classList.add('active');
        tabWishlistBtn.classList.remove('active');
        panelOrders.classList.add('active');
        panelWishlist.classList.remove('active');
        
        initOrdersTracker();
    });

    // 2. Initial Wishlist Render
    loadWishlistItems();

    // 3. Customer tracker login validation
    if (trackerSubmitBtn) {
        trackerSubmitBtn.addEventListener('click', () => {
            const rawPhone = trackerPhoneInput.value.trim();
            if (!rawPhone) {
                alert("Please enter your contact number.");
                return;
            }

            let phone = rawPhone;
            if (!phone.startsWith('+')) {
                // If it is a 10 digit number, add standard Indian code default
                phone = '+91' + phone.replace(/^0+/, '');
            }

            console.log(`[Orders Tracker] Registering phone lookup session for number: ${phone}`);
            localStorage.setItem('clientPhone', phone);
            
            trackerPhoneInput.value = "";
            initOrdersTracker();
        });
    }

    if (trackerLogoutBtn) {
        trackerLogoutBtn.addEventListener('click', async () => {
            console.log("[Orders Tracker] Clearing client session.");
            localStorage.removeItem('clientPhone');
            if (auth.currentUser) {
                await signOut(auth);
            }
            initOrdersTracker();
        });
    }

    // Initialize tracking dashboard checks
    function initOrdersTracker() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const snap = await getDoc(doc(db, "customers", user.uid));
                    if (snap.exists()) {
                        const customer = snap.data();
                        trackerLoginBox.style.display = 'none';
                        trackerDashboard.style.display = 'block';
                        trackerPhoneLabel.innerText = `${customer.phone} (${customer.name})`;
                        loadPlacedOrders(customer.phone, user.uid);
                    } else {
                        checkLocalSession();
                    }
                } catch(e) {
                    console.error("[Orders Tracker] Auth check failed:", e);
                    checkLocalSession();
                }
            } else {
                checkLocalSession();
            }
        });
    }

    function checkLocalSession() {
        const phone = localStorage.getItem('clientPhone');
        if (!phone) {
            trackerLoginBox.style.display = 'block';
            trackerDashboard.style.display = 'none';
        } else {
            trackerLoginBox.style.display = 'none';
            trackerDashboard.style.display = 'block';
            trackerPhoneLabel.innerText = phone;
            loadPlacedOrders(phone, null);
        }
    }

    // Trigger initialization
    initOrdersTracker();
});

/**
 * Load bookmarks from sessionStorage and render
 */
function loadWishlistItems() {
    const grid = document.getElementById('wishlist-items-grid');
    if (!grid) return;

    try {
        const cache = sessionStorage.getItem('wishlist');
        allBookmarkedProducts = cache ? JSON.parse(cache) : [];
        console.log(`[Wishlist UI] Loaded ${allBookmarkedProducts.length} bookmarks from session storage.`);
    } catch (e) {
        console.error("[Wishlist UI] Failed to load session storage bookmarks:", e);
        allBookmarkedProducts = [];
    }

    grid.innerHTML = ""; // Clear

    if (allBookmarkedProducts.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--gray); padding: 50px 10px;">
            Your showroom wishlist is empty! Go browse our heritage catalog and tap the heart icon on designs you like.
        </p>`;
        return;
    }

    allBookmarkedProducts.forEach(product => {
        const container = document.createElement('div');
        container.className = 'wishlist-item-container';
        container.innerHTML = `
            <button class="remove-bookmark-btn" data-id="${product.id}" title="Remove Bookmark">&times;</button>
            ${renderProductCard(product)}
        `;
        grid.appendChild(container);
    });

    // Attach click handlers to remove buttons
    document.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            removeBookmark(id);
        });
    });
}

/**
 * Remove a specific product bookmark from list
 */
function removeBookmark(productId) {
    console.log(`[Wishlist UI] Removing bookmark item ID: ${productId}`);
    allBookmarkedProducts = allBookmarkedProducts.filter(item => item.id !== productId);
    sessionStorage.setItem('wishlist', JSON.stringify(allBookmarkedProducts));
    
    // Re-render
    loadWishlistItems();
}

/**
 * Fetch custom handloom orders from Firestore matching user phone number
 */
async function loadPlacedOrders(phone, uid) {
    const listContainer = document.getElementById('tracker-orders-list');
    if (!listContainer) return;

    listContainer.innerHTML = "<p style='text-align: center; color: var(--gray); padding: 40px 0;'>Querying custom orders database...</p>";

    try {
        let q;
        if (uid) {
            console.log(`[Orders Tracker DB] Querying custom orders matching user UID: ${uid}`);
            q = query(collection(db, "custom_orders"), where("customerUid", "==", uid));
        } else {
            console.log(`[Orders Tracker DB] Querying custom orders matching phone: ${phone}`);
            q = query(collection(db, "custom_orders"), where("customerContact", "==", phone));
        }
        const querySnapshot = await getDocs(q);

        listContainer.innerHTML = ""; // Clear loader

        if (querySnapshot.empty) {
            console.log("[Orders Tracker DB] Query finished: No custom orders found.");
            listContainer.innerHTML = `<p style="text-align: center; color: var(--gray); padding: 40px 10px;">
                No custom handloom orders have been recorded under this contact number.
            </p>`;
            return;
        }

        const orders = [];
        querySnapshot.forEach(docSnap => {
            orders.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        // Sort newest first
        orders.sort((a, b) => {
            const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
            const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
            return timeB - timeA;
        });

        console.log(`[Orders Tracker DB] Rendering ${orders.length} orders...`);

        for (const order of orders) {
            // Load weaver details dynamically using sellerId
            let shopName = "Sualkuchi Weaver Shop";
            let weaverPhone = "+919394769289";
            
            if (order.sellerId) {
                try {
                    const sellerDoc = await getDoc(doc(db, "sellers", order.sellerId));
                    if (sellerDoc.exists()) {
                        const sellerData = sellerDoc.data();
                        shopName = sellerData.shopName || shopName;
                        weaverPhone = sellerData.phone || weaverPhone;
                    }
                } catch (err) {
                    console.error("[Orders Tracker DB] Failed to query weaver info for sellerId: ", order.sellerId, err);
                }
            }

            let formattedBudget = order.budget;
            try {
                formattedBudget = Number(order.budget).toLocaleString('en-IN');
            } catch (e) {}

            let formattedAdvance = order.advancePaid;
            try {
                formattedAdvance = Number(order.advancePaid).toLocaleString('en-IN');
            } catch (e) {}

            const status = order.status || "Paid";
            let statusBadgeClass = "badge-paid";
            if (status.toLowerCase() === "acknowledged" || status.toLowerCase() === "in progress") {
                statusBadgeClass = "badge-ack";
            }

            // WhatsApp link details
            const cleanWeaverPhone = weaverPhone.replace(/[^0-9]/g, '');
            const whatsappText = `Hello! I am checking in regarding my custom handloom order *ID: ${order.id}* ('${order.description}') placed at your shop.`;
            const whatsappUrl = `https://wa.me/${cleanWeaverPhone}?text=${encodeURIComponent(whatsappText)}`;

            const orderCard = `
                <div class="order-tracker-card">
                    <div class="order-tracker-details">
                        <h4>Order ID: #${order.id}</h4>
                        <p><strong>Weaver Shop:</strong> ${shopName}</p>
                        <p><strong>Design Specifications:</strong> ${order.description}</p>
                        <p><strong>Estimated Budget:</strong> ₹${formattedBudget}</p>
                        <p><strong>Advance Deposit Paid:</strong> ₹${formattedAdvance}</p>
                        <p style="font-size: 0.85rem; color: var(--gray); margin-top: 10px;">Placed on: ${order.timestamp?.toDate ? order.timestamp.toDate().toLocaleDateString() : new Date(order.timestamp || '').toLocaleDateString()}</p>
                    </div>
                    <div class="order-tracker-status">
                        <span class="badge-large ${statusBadgeClass}">${status}</span>
                        <a href="${whatsappUrl}" target="_blank" class="order-discuss-btn">Discuss on WhatsApp</a>
                    </div>
                </div>
            `;
            listContainer.innerHTML += orderCard;
        }

    } catch (error) {
        console.error("[Orders Tracker DB] Query custom orders database failed:", error);
        listContainer.innerHTML = `<p style="text-align: center; color: var(--error); padding: 40px 10px;">
            Error retrieving your placed orders details. Please check your network and try again.
        </p>`;
    }
}
