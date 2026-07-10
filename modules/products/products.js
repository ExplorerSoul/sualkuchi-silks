// Product Data Fetching Module
import { db, collection, getDocs, getDoc, doc } from '../core/db.js';

/**
 * Fetch all products from Firestore
 * @returns {Promise<Array>} List of product objects with IDs
 */
export async function fetchProducts() {
    try {
        console.log("[Products DB] Querying all products from Firestore collection...");
        const querySnapshot = await getDocs(collection(db, "products"));
        const products = [];
        querySnapshot.forEach((doc) => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        console.log(`[Products DB] Successfully loaded ${products.length} products from database.`);
        return products;
    } catch (error) {
        console.error("[Products DB] Failed to fetch catalog products:", error);
        throw error;
    }
}

/**
 * Fetch a single product by ID from Firestore
 * @param {string} productId - Firestore document ID
 * @returns {Promise<Object|null>} Product data or null if not found
 */
export async function fetchProductById(productId) {
    if (!productId) {
        console.warn("[Products DB] fetchProductById called without a valid document ID.");
        return null;
    }
    try {
        console.log(`[Products DB] Fetching single product document details for ID: ${productId}`);
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            console.log(`[Products DB] Document found for ID: ${productId}`);
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        }
        console.warn(`[Products DB] No product document exists matching ID: ${productId}`);
        return null;
    } catch (error) {
        console.error(`[Products DB] Failed to retrieve product details for ID ${productId}:`, error);
        throw error;
    }
}
