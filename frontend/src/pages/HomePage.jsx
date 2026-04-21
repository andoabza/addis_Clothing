import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../services/api';
import ProductCard from '../components/ProductCard';
import { getFashionImage, FASHION_PLACEHOLDERS } from '../utils/imageHelper';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await api.get('/products');
      setFeatured(res.data.filter(p => p.is_featured).slice(0, 4));
      setTrending(res.data.slice(0, 4));
    };
    const fetchCategories = async () => {
      const res = await api.get('/products/categories');
      setCategories(res.data);
    };
    fetchProducts();
    fetchCategories();
  }, []);

  return (
    <div>
      {/* Hero Section with fashion background */}
      <section className="relative h-screen bg-cover bg-center" style={{ backgroundImage: `url('${getFashionImage(20, '1920x1080')}')` }}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative container mx-auto h-full flex flex-col justify-center items-start px-6 text-white">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-5xl md:text-7xl font-bold mb-4">
            New Collection
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-xl mb-8 max-w-lg">
            Ethiopian inspired modern fashion — delivered to your door in Addis Ababa.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Link to="/shop" className="btn-primary text-lg">Shop Now →</Link>
          </motion.div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-16 bg-accent">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Shop by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((cat, i) => (
              <Link key={i} to={`/shop?category=${cat.name.toLowerCase()}`} className="relative group overflow-hidden rounded-2xl h-80">
                <img 
                  src={cat.image_url} 
                  alt={cat.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition" />
                <span className="absolute bottom-6 left-6 text-white text-2xl font-bold">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Featured Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featured.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Trending */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Trending Now</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trending.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      {/* Instagram Feed */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Follow @addisclothing</h2>
          <p className="mb-8">Share your style with #AddisClothing</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1,2,3].map(i => (
              <div key={i} className="aspect-square bg-gray-200 rounded-xl overflow-hidden">
                <img 
                  src={getFashionImage(i + 10, '400x400')} 
                  alt="insta" 
                  className="w-full h-full object-cover" 
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}