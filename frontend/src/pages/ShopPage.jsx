import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import { FiFilter, FiX, FiSearch } from 'react-icons/fi';

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [size, setSize] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  const categories = ['Men', 'Women', 'Accessories'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  useEffect(() => {
    fetchProducts();
  }, [category, minPrice, maxPrice, sortBy]);

  useEffect(() => {
    // Apply search and size filter client-side
    let filtered = [...products];
    if (searchTerm) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (size) {
      filtered = filtered.filter(p => {
        let variants = p.variants;
        if (typeof variants === 'string') {
          try { variants = JSON.parse(variants); } catch(e) { variants = []; }
        }
        return variants?.some(v => v.size === size);
      });
    }
    setFilteredProducts(filtered);
  }, [searchTerm, size, products]);

  const fetchProducts = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.append('category', category.toLowerCase());
    if (minPrice) params.append('minPrice', minPrice);
    if (maxPrice) params.append('maxPrice', maxPrice);
    if (sortBy === 'price_asc') params.append('sort', 'price_asc');
    if (sortBy === 'price_desc') params.append('sort', 'price_desc');
    try {
      const res = await api.get(`/products?${params.toString()}`);
      setProducts(res.data);
      setFilteredProducts(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setCategory('');
    setSize('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setSearchTerm('');
    setSearchParams({});
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold">Shop</h1>
        <div className="relative w-full md:w-80">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded-full py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-black"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="md:hidden flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full"
        >
          <FiFilter /> Filters
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className={`${filtersOpen ? 'block' : 'hidden'} md:block w-full md:w-64 flex-shrink-0 bg-white p-4 rounded-xl shadow-md h-fit`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">Filters</h2>
            <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-black">Clear all</button>
            <button className="md:hidden" onClick={() => setFiltersOpen(false)}><FiX /></button>
          </div>

          {/* Category */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Category</h3>
            {categories.map(cat => (
              <label key={cat} className="flex items-center gap-2 mb-1">
                <input type="radio" name="category" value={cat} checked={category === cat} onChange={() => setCategory(cat)} />
                {cat}
              </label>
            ))}
          </div>

          {/* Size */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Size</h3>
            <div className="flex flex-wrap gap-2">
              {sizes.map(s => (
                <button
                  key={s}
                  onClick={() => setSize(size === s ? '' : s)}
                  className={`px-3 py-1 border rounded-full text-sm ${size === s ? 'bg-black text-white' : 'hover:border-black'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Price (ETB)</h3>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)} className="border p-2 w-24 rounded" />
              <span>-</span>
              <input type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="border p-2 w-24 rounded" />
            </div>
          </div>

          {/* Sort */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Sort by</h3>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full border p-2 rounded">
              <option value="newest">Newest</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="bg-gray-300 h-48 mb-4 rounded"></div>
                  <div className="h-4 bg-gray-300 mb-2 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 mb-2 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                </div>
              ))};
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No products found.</p>
              <button onClick={clearFilters} className="btn-primary mt-4 inline-block">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}