import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiPlus, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import VariantManager from './VariantManager';
import ConfirmModal from './ConfirmModal';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Brown', 'Gray', 'Navy'];

export default function ProductsAdmin() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedProduct, setExpandedProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelModal, setCancelModal] = useState({ isOpen: false, productId: null });
  const [uploadError, setUploadError] = useState('');
  const [retryFile, setRetryFile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    base_price: '',
    category_id: '',
    image_url: '',
    is_featured: false
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    const res = await api.get('/admin/products');
    setProducts(res.data);
  };

  const fetchCategories = async () => {
    const res = await api.get('/products/categories');
    setCategories(res.data);
    if (res.data.length > 0 && !form.category_id) {
      setForm(prev => ({ ...prev, category_id: res.data[0].id }));
    }
  };


const handleImageUpload = async (file) => {
  if (!file) return;
  setUploadError('');
  const formData = new FormData();
  formData.append('image', file);
  try {
    const res = await api.post('/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setForm({ ...form, image_url: res.data.url });
    toast.success('Image uploaded');
    setRetryFile(null);
  } catch (err) {
    setUploadError(err.response?.data?.message || 'Upload failed');
    setRetryFile(file); // save file for retry
    toast.error('Upload failed');
  } finally {
    setUploading(false);
  }
};

const onFileSelect = (e) => {
  const file = e.target.files[0];
  if (file) {
    handleImageUpload(file);
  }
};

const retryUpload = () => {
  if (retryFile) {
    handleImageUpload(retryFile);
  }
};



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category_id) {
      toast.error('Please select a category');
      return;
    }
    setLoading(true);
    try {
      if (editingProduct) {
        await api.put(`/admin/products/${editingProduct.id}`, form);
        toast.success('Product updated');
      } else {
        await api.post('/admin/products', form);
        toast.success('Product added');
      }
      await fetchProducts();
      resetProductForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteProduct = async (id) => {
    setCancelModal({ isOpen: true, productId: id });
  };

  const handleConfirmDelete = async () => {
    const { productId } = cancelModal;
    try {
      await api.delete(`/admin/products/${productId}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setCancelModal({ isOpen: false, productId: null });
    }
  };

  const handleCloseModal = () => {
    setCancelModal({ isOpen: false, productId: null });
  };

  const editProduct = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      base_price: product.base_price,
      category_id: product.category_id,
      image_url: product.image_url || '',
      is_featured: product.is_featured || false
    });
    setShowProductForm(true);
  };

  const resetProductForm = () => {
    setForm({
      name: '',
      description: '',
      base_price: '',
      category_id: categories[0]?.id || '',
      image_url: '',
      is_featured: false
    });
    setEditingProduct(null);
    setShowProductForm(false);
  };

  return (
    <div>
      {/* Button to toggle product form */}
      <div className="mb-6">
        <button
          onClick={() => setShowProductForm(!showProductForm)}
          className="bg-black text-white px-4 py-2 rounded-full flex items-center gap-2"
        >
          <FiPlus /> {showProductForm ? 'Cancel' : 'Add New Product'}
        </button>
      </div>

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-screen overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Product Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Base Price (ETB)</label>
                  <input
                    type="number"
                    step="10"
                    value={form.base_price}
                    onChange={e => setForm({ ...form, base_price: e.target.value })}
                    className="w-full border rounded-lg p-2"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium mb-1">Category</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg p-2"
                  rows="3"
                />
              </div>
            <div>
  <label className="block font-medium mb-1">Product Image (optional)</label>
  <input type="file" accept="image/*" onChange={onFileSelect} className="w-full border rounded-lg p-2" />
  {uploading && <p className="text-sm text-blue-500 mt-1">Uploading...</p>}
  {uploadError && (
    <div className="mt-1 flex items-center gap-2">
      <p className="text-sm text-red-500">{uploadError}</p>
      <button type="button" onClick={retryUpload} className="text-xs bg-gray-200 px-2 py-1 rounded">Retry</button>
    </div>
  )}
  {form.image_url && (
    <div className="mt-2 flex items-start gap-3">
      <img src={form.image_url} alt="preview" className="h-20 w-20 object-cover rounded border" />
      <button
        type="button"
        onClick={() => setForm({ ...form, image_url: '' })}
        className="text-red-500 text-sm underline mt-1"
      >
        Remove
      </button>
    </div>
  )}
</div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={e => setForm({ ...form, is_featured: e.target.checked })}
                />
                Feature this product on homepage
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="bg-black text-white px-6 py-2 rounded-full flex-1 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
                <button
                  type="button"
                  onClick={resetProductForm}
                  className="border px-6 py-2 rounded-full"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products List */}
      <h2 className="text-xl font-bold mb-4">Products</h2>
      <div className="space-y-2">
        {/* skeleton with pulse animation if no product for */}
        {products.length === 0 && (
           [...Array(3)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="bg-gray-300 h-20 mb-4 rounded"></div>
                  <div className="h-2 bg-gray-300 mb-2 rounded w-3/4"></div>
                  <div className="h-2 bg-gray-300 mb-2 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-300 rounded w-1/4"></div>
                </div>
       )))};

        {products.map(product => (
          <div key={product.id} className="border rounded-lg overflow-hidden">
            <div className="p-4 flex justify-between items-center bg-white hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-4 flex-1">
                {product.image_url && (
                  <img src={product.image_url} alt={product.name} className="h-12 w-12 object-cover rounded" />
                )}
                <div>
                  <span className="font-semibold">{product.name}</span>
                  <span className="text-gray-500 text-sm ml-2">ETB {product.base_price}</span>
                  {product.is_featured && (
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded">Featured</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); editProduct(product); }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <FiEdit2 size={18} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteProduct(product.id); }}
                  className="text-red-500 hover:text-red-700"
                >
                  <FiTrash2 size={18} />
                </button>
                <button
                  onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                  className="text-gray-500"
                >
                  {expandedProduct === product.id ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                </button>
              </div>
            </div>
            {expandedProduct === product.id && (
              <div className="border-t p-4 bg-gray-50">
                <VariantManager productId={product.id} />
              </div>
            )}
          </div>
        ))}
      </div>
      <ConfirmModal
        isOpen={cancelModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="No, Keep It"
      />
    </div>
  );
}