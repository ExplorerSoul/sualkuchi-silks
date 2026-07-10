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
