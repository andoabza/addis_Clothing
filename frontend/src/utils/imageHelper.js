// Curated fashion images from Unsplash (clothing only)
const FASHION_PLACEHOLDERS = [
  'https://images.unsplash.com/photo-1534126511673-b6899657816a?w=400&h=500&fit=crop',  // men jacket
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=500&fit=crop',  // women dress
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=500&fit=crop',  // t-shirt
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&h=500&fit=crop',  // hoodie
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&h=500&fit=crop',  // jeans
  'https://images.unsplash.com/photo-1434389676691-4f140d4ac0a0?w=400&h=500&fit=crop',  // women top
  'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop',  // men shirt
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=500&fit=crop',  // women coat
  'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&h=500&fit=crop',  // accessories
];

/**
 * Get product image URL – uses Cloudinary upload if exists, else fashion placeholder
 * @param {object} product - product object with id and image_url
 * @param {string} size - optional size (e.g., '400x500')
 * @returns {string} image URL
 */
export const getProductImage = (product, size = '400x500') => {
  if (product.image_url && product.image_url.trim() !== '') {
    return product.image_url;
  }
  const index = (product.id % FASHION_PLACEHOLDERS.length);
  return FASHION_PLACEHOLDERS[index];
};

/**
 * Get a random fashion image for categories, hero, etc.
 * @param {number} seed - any number to pick a consistent image
 * @param {string} size - e.g., '400x500'
 */
export const getFashionImage = (seed = 1, size = '400x500') => {
  const index = seed % FASHION_PLACEHOLDERS.length;
  return FASHION_PLACEHOLDERS[index];
};

// Export the array for direct use if needed
export { FASHION_PLACEHOLDERS };