// Product Card Component HTML Generator

/**
 * Generates card markup for a given product
 * @param {Object} product - Product record
 * @returns {string} HTML string representing the product card
 */
export function renderProductCard(product) {
    if (!product) return '';
    
    // Format pricing for standard Indian currency presentation (e.g. ₹ 15,000)
    let formattedPrice = product.price;
    try {
        const numericPrice = Number(product.price);
        if (!isNaN(numericPrice)) {
            formattedPrice = numericPrice.toLocaleString('en-IN');
        }
    } catch (e) {
        console.warn("Could not format price for product:", product.id, e);
    }
    
    return `
        <a href="product.html?id=${product.id}" class="card-link">
            <div class="card">
                <img src="${product.image || 'download.jpg'}" alt="${product.name}" loading="lazy">
                <div class="details">
                    <h4>${product.name}</h4>
                    <span class="price">₹ ${formattedPrice}</span>
                </div>
            </div>
        </a>
    `;
}

/**
 * Generates horizontal list-row markup for search results listing
 * @param {Object} product - Product record
 * @returns {string} HTML string representing the product row
 */
export function renderProductListRow(product) {
    if (!product) return '';
    
    let formattedPrice = product.price;
    try {
        const numericPrice = Number(product.price);
        if (!isNaN(numericPrice)) {
            formattedPrice = numericPrice.toLocaleString('en-IN');
        }
    } catch (e) {}
    
    return `
        <a href="product.html?id=${product.id}" class="list-row-link">
            <div class="product-list-row">
                <img src="${product.image || 'download.jpg'}" alt="${product.name}" loading="lazy">
                <div class="list-row-info">
                    <h4>${product.name}</h4>
                    <span class="list-row-category">${product.category || 'Handloom Item'}</span>
                    <p class="list-row-desc">${product.description || 'Authentic Assam handloom creation.'}</p>
                </div>
                <div class="list-row-price-actions">
                    <span class="price">₹ ${formattedPrice}</span>
                    <span class="btn-sm" style="background: var(--maroon); color: var(--white); display: inline-block; text-align: center; border-radius: 4px; margin-top: 10px; font-weight: bold; width: 100%; border: none;">View Details</span>
                </div>
            </div>
        </a>
    `;
}
