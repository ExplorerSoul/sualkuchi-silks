// Admin Inventory Dashboard Controller
import { db, auth, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, setDoc, query, where } from '../core/db.js';

let isEditing = false;
let currentImageBase64 = "";

/**
 * Saves or updates a seller's shop profile in the 'sellers' collection
 * @param {Object} profileData - ShopName, Address, Latitude, Longitude
 * @returns {Promise<boolean>} Status of the save operation
 */
export async function saveSellerProfile(profileData) {
    const user = auth.currentUser;
    if (!user) {
        console.warn("[Dashboard DB] saveSellerProfile aborted: No active user session.");
        alert("You must be logged in to setup a profile.");
        return false;
    }

    try {
        console.log(`[Dashboard DB] Saving profile for user ID ${user.uid}...`);
        const sellerDocRef = doc(db, "sellers", user.uid);
        await setDoc(sellerDocRef, {
            shopName: profileData.shopName || "",
            address: profileData.address,
            phone: profileData.phone || user.phoneNumber || "",
            latitude: profileData.latitude,
            longitude: profileData.longitude,
            timestamp: new Date()
        });
        console.log("[Dashboard DB] Seller profile saved successfully.");
        return true;
    } catch (e) {
        console.error("[Dashboard DB] Failed to save seller profile:", e);
        alert("Failed to save profile: " + e.message);
        return false;
    }
}

/**
 * Loads products from Firestore belonging ONLY to the logged-in seller
 */
export async function loadInventory() {
    const inventoryTable = document.getElementById('inventory-table');
    if (!inventoryTable) return;

    const user = auth.currentUser;
    if (!user) {
        console.warn("[Dashboard UI] loadInventory aborted: User is not authenticated.");
        inventoryTable.innerHTML = "<tr><td colspan='4'>Please log in.</td></tr>";
        return;
    }

    console.log(`[Dashboard UI] Loading inventory for seller UID: ${user.uid}`);
    inventoryTable.innerHTML = "<tr><td colspan='4'>Loading inventory...</td></tr>";

    try {
        const q = query(collection(db, "products"), where("sellerId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        inventoryTable.innerHTML = ""; // Clear loader

        if (querySnapshot.empty) {
            console.log("[Dashboard UI] Inventory query completed: No products found for this user.");
            inventoryTable.innerHTML = "<tr><td colspan='4'>No products in your inventory. Upload up to 5 items!</td></tr>";
            return;
        }

        console.log(`[Dashboard UI] Rendering ${querySnapshot.size} inventory rows...`);

        querySnapshot.forEach((document) => {
            const item = document.data();
            const id = document.id;

            let formattedPrice = item.price;
            try {
                const numericPrice = Number(item.price);
                if (!isNaN(numericPrice)) {
                    formattedPrice = numericPrice.toLocaleString('en-IN');
                }
            } catch (e) {}

            const row = `
                <tr>
                    <td><img src="${item.image || 'download.jpg'}" class="thumb-img"></td>
                    <td>${item.name}</td>
                    <td>₹${formattedPrice}</td>
                    <td>
                        <button class="btn-sm btn-edit" data-id="${id}">Edit</button>
                        <button class="btn-sm btn-delete" data-id="${id}">Delete</button>
                    </td>
                </tr>
            `;
            inventoryTable.innerHTML += row;
        });

        // Attach action listeners
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                deleteProduct(id);
            });
        });
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                startEdit(id);
            });
        });

    } catch (error) {
        console.error("[Dashboard UI] Failed to load inventory rows:", error);
        inventoryTable.innerHTML = "<tr><td colspan='4'>Failed to load inventory.</td></tr>";
    }
}

/**
 * Remove product from Firestore
 * @param {string} id - Document ID
 */
async function deleteProduct(id) {
    if (confirm("Are you sure you want to delete this cloth?")) {
        try {
            console.log(`[Dashboard DB] Deleting product ID: ${id}`);
            await deleteDoc(doc(db, "products", id));
            console.log(`[Dashboard DB] Product ${id} deleted successfully.`);
            alert("Product deleted!");
            loadInventory();
        } catch (error) {
            console.error(`[Dashboard DB] Failed to delete product ${id}:`, error);
            alert("Failed to delete product: " + error.message);
        }
    }
}

/**
 * Populates editing fields and toggles view state to editing mode
 * @param {string} id - Document ID
 */
async function startEdit(id) {
    try {
        console.log(`[Dashboard UI] Loading product details for edit mode. ID: ${id}`);
        const docRef = doc(db, "products", id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            const product = docSnap.data();
            isEditing = true;
            document.getElementById('edit-id').value = id;
            document.getElementById('p-name').value = product.name;
            document.getElementById('p-price').value = product.price;
            document.getElementById('p-category').value = product.category || "Mekhela Sador";
            document.getElementById('p-desc').value = product.description || '';
            document.getElementById('image-preview').innerText = "Current image loaded. Upload new to change.";

            currentImageBase64 = product.image; // Keep old image

            // Adjust form UI elements
            document.getElementById('form-title').innerText = "Edit Product";
            document.getElementById('save-btn').innerText = "Update Product";
            document.getElementById('cancel-btn').style.display = 'inline-block';

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        console.error(`[Dashboard UI] Failed to fetch product details for edit ID ${id}:`, error);
        alert("Failed to load details: " + error.message);
    }
}

/**
 * Clear form entries and reset dashboard editing states
 */
function resetForm() {
    console.log("[Dashboard UI] Resetting CRUD form state.");
    isEditing = false;
    currentImageBase64 = "";

    document.getElementById('p-name').value = "";
    document.getElementById('p-price').value = "";
    document.getElementById('p-category').value = "Mekhela Sador";
    document.getElementById('p-desc').value = "";
    document.getElementById('p-image').value = "";
    document.getElementById('edit-id').value = "";
    document.getElementById('image-preview').innerText = "";

    document.getElementById('form-title').innerText = "Add New Product";
    document.getElementById('save-btn').innerText = "Upload Product";
    document.getElementById('cancel-btn').style.display = 'none';
}

/**
 * Save new item or apply edits to Firestore (including 5-product limit check)
 */
async function handleSave() {
    const name = document.getElementById('p-name').value.trim();
    const price = document.getElementById('p-price').value.trim();
    const category = document.getElementById('p-category').value;
    const desc = document.getElementById('p-desc').value.trim();
    const fileInput = document.getElementById('p-image');
    const file = fileInput ? fileInput.files[0] : null;
    const status = document.getElementById('status-msg');

    const user = auth.currentUser;
    if (!user) {
        console.warn("[Dashboard UI] handleSave aborted: User session is empty.");
        alert("You must be logged in to save products.");
        return;
    }

    if (!name || !price) {
        alert("Name and Price are required!");
        return;
    }

    console.log(`[Dashboard UI] Initiating save request. Mode: ${isEditing ? 'EDIT' : 'ADD'}`);
    if (status) status.innerText = "Processing...";

    // 1. Guardrail Check: Enforce maximum limit of 5 products per seller for new items
    if (!isEditing) {
        try {
            console.log("[Dashboard UI] Checking weaver product limit in database...");
            const q = query(collection(db, "products"), where("sellerId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            console.log(`[Dashboard UI] Current product count: ${querySnapshot.size}/5`);
            
            if (querySnapshot.size >= 5) {
                console.warn(`[Dashboard UI] Upload blocked: seller ${user.uid} has reached the 5-product limit.`);
                alert("Upload Blocked: You have reached the maximum limit of 5 products per weaver.");
                if (status) status.innerText = "Upload blocked: 5 items limit reached.";
                return;
            }
        } catch (e) {
            console.error("[Dashboard UI] Failed to check database product count constraint:", e);
        }
    }

    let finalImage = currentImageBase64;

    if (file) {
        if (file.size > 800000) {
            console.warn(`[Dashboard UI] Image upload rejected: File size is ${file.size} bytes (limit is 800KB).`);
            alert("Image size is too large! Maximum limit is 800KB.");
            if (status) status.innerText = "";
            return;
        }
        try {
            console.log("[Dashboard UI] Processing selected image to Base64...");
            finalImage = await toBase64(file);
        } catch (e) {
            console.error("[Dashboard UI] Image conversion failed:", e);
            alert("Failed to convert image format.");
            if (status) status.innerText = "";
            return;
        }
    } else if (!isEditing) {
        alert("Please select an image file for new products.");
        if (status) status.innerText = "";
        return;
    }

    try {
        const productData = {
            name: name,
            price: Number(price),
            category: category,
            description: desc,
            image: finalImage,
            sellerId: user.uid,
            sellerPhone: user.phoneNumber || "",
            timestamp: new Date()
        };

        if (isEditing) {
            const id = document.getElementById('edit-id').value;
            console.log(`[Dashboard DB] Updating document ID ${id} in Firestore...`);
            await updateDoc(doc(db, "products", id), productData);
            console.log(`[Dashboard DB] Document ${id} updated successfully.`);
            alert("Product Updated!");
        } else {
            console.log("[Dashboard DB] Inserting new product document into Firestore...");
            await addDoc(collection(db, "products"), productData);
            console.log("[Dashboard DB] Product document inserted successfully.");
            alert("Product Added!");
        }

        resetForm();
        loadInventory();
        if (status) status.innerText = "";

    } catch (error) {
        console.error("[Dashboard DB] Failed to save product data:", error);
        alert("Failed to save product: " + error.message);
        if (status) status.innerText = "Error occurred.";
    }
}

// Convert File selection object to Base64 data string
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

// Bind form action listeners
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');

    if (saveBtn) {
        saveBtn.addEventListener('click', handleSave);
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetForm);
    }
});

/**
 * Loads custom orders from Firestore belonging ONLY to the logged-in seller
 */
export async function loadCustomOrders() {
    const ordersTable = document.getElementById('orders-table');
    if (!ordersTable) return;

    const user = auth.currentUser;
    if (!user) {
        console.warn("[Dashboard Orders] loadCustomOrders aborted: User is not authenticated.");
        ordersTable.innerHTML = "<tr><td colspan='6'>Please log in.</td></tr>";
        return;
    }

    console.log(`[Dashboard Orders] Loading custom orders for UID: ${user.uid}`);
    ordersTable.innerHTML = "<tr><td colspan='6'>Loading client orders...</td></tr>";

    try {
        const q = query(collection(db, "custom_orders"), where("sellerId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        ordersTable.innerHTML = ""; // Clear loader

        if (querySnapshot.empty) {
            console.log("[Dashboard Orders] No custom orders found for this weaver.");
            ordersTable.innerHTML = "<tr><td colspan='6' style='text-align: center; color: var(--gray); padding: 30px;'>No custom handloom orders received yet.</td></tr>";
            return;
        }

        console.log(`[Dashboard Orders] Rendering ${querySnapshot.size} custom order rows...`);

        // Sort orders by timestamp descending
        const orders = [];
        querySnapshot.forEach(docSnap => {
            orders.push({
                id: docSnap.id,
                ...docSnap.data()
            });
        });
        orders.sort((a, b) => {
            const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp || 0);
            const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp || 0);
            return timeB - timeA;
        });

        orders.forEach((order) => {
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
            } else if (status.toLowerCase() === "completed") {
                statusBadgeClass = "badge-completed";
            }

            const cleanPhone = (order.customerContact || '').replace(/[^0-9]/g, '');
            const whatsappText = `Hello ${order.customerName}, I have acknowledged your custom order for '${order.description}' (Advance paid: ₹${formattedAdvance}). Let's finalize your design!`;
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappText)}`;

            const actionButton = status.toLowerCase() === "paid"
                ? `<button class="btn-sm btn-edit btn-ack-order" data-id="${order.id}" data-whatsapp="${whatsappUrl}">Acknowledge & Discuss</button>`
                : `<a href="${whatsappUrl}" target="_blank" class="btn-sm btn-edit" style="background-color: var(--success); display: inline-block; text-align: center; border-radius: 4px;">Chat on WhatsApp</a>`;

            const row = `
                <tr>
                    <td>
                        <div class="customer-info">
                            <p><strong>Name:</strong> ${order.customerName}</p>
                            <p><strong>Contact:</strong> ${order.customerContact}</p>
                        </div>
                    </td>
                    <td style="max-width: 250px; white-space: normal; word-break: break-word;">${order.description}</td>
                    <td>₹${formattedBudget}</td>
                    <td>₹${formattedAdvance}</td>
                    <td><span class="badge ${statusBadgeClass}">${status}</span></td>
                    <td>${actionButton}</td>
                </tr>
            `;
            ordersTable.innerHTML += row;
        });

        // Attach event listeners for Acknowledge buttons
        document.querySelectorAll('.btn-ack-order').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = e.currentTarget.getAttribute('data-id');
                const whatsappUrl = e.currentTarget.getAttribute('data-whatsapp');
                
                if (confirm("Would you like to acknowledge this order and contact the customer?")) {
                    await acknowledgeOrder(orderId, whatsappUrl);
                }
            });
        });

    } catch (err) {
        console.error("[Dashboard Orders] Failed to query custom orders list:", err);
        ordersTable.innerHTML = "<tr><td colspan='6'>Failed to query custom orders.</td></tr>";
    }
}

/**
 * Updates a custom order status to Acknowledged and opens WhatsApp chat
 */
async function acknowledgeOrder(orderId, whatsappUrl) {
    try {
        console.log(`[Dashboard Orders DB] Updating order status to Acknowledged for ID: ${orderId}`);
        const orderDocRef = doc(db, "custom_orders", orderId);
        await updateDoc(orderDocRef, {
            status: "Acknowledged"
        });
        
        console.log("[Dashboard Orders DB] Status updated successfully. Opening WhatsApp chat redirect...");
        window.open(whatsappUrl, '_blank');
        
        // Reload custom orders to refresh UI status badges
        loadCustomOrders();
    } catch (e) {
        console.error(`[Dashboard Orders DB] Failed to update order status for ID ${orderId}:`, e);
        alert("Failed to update status: " + e.message);
    }
}
