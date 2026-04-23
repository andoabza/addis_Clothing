import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';
import ConfirmModal from './ConfirmModal';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Brown', 'Gray', 'Navy'];

export default function VariantManager({ productId }) {
  const [variants, setVariants] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, variantId: null });
  const [form, setForm] = useState({
    size: 'M',
    color: 'Black',
    stock: 0,
    price_adjustment: 0,
    sku: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (productId) fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    const res = await api.get(`/admin/products/${productId}/variants`);
    setVariants(res.data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingVariant) {
        await api.put(`/admin/variants/${editingVariant.id}`, form);
        toast.success('Variant updated');
      } else {
        await api.post('/admin/variants', { ...form, product_id: productId });
        toast.success('Variant added');
      }
      await fetchVariants();
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const deleteVariant = async (id) => {
    setDeleteModal({ isOpen: true, variantId: id });
  };

  const handleDelete = async () => {
    const variantId = deleteModal.variantId;
    try {
      await api.delete(`/admin/variants/${variantId}`);
      toast.success('Variant deleted');
      await fetchVariants();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    } finally {
      setDeleteModal({ isOpen: false, variantId: null });
    }
  }

  const handleCloseDeleteModal = () => {
    setDeleteModal({ isOpen: false, variantId: null });
  };

  const resetForm = () => {
    setForm({ size: 'M', color: 'Black', stock: 0, price_adjustment: 0, sku: '' });
    setEditingVariant(null);
    setShowForm(false);
  };

  const editVariant = (variant) => {
    setEditingVariant(variant);
    setForm({
      size: variant.size,
      color: variant.color,
      stock: variant.stock,
      price_adjustment: variant.price_adjustment,
      sku: variant.sku || ''
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-md">Variants (Size & Color)</h3>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-black text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
        >
          <FiPlus size={14} /> Add Variant
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="text-gray-500 text-sm">No variants yet. Add size/color combinations.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Size</th>
                <th className="p-2 text-left">Color</th>
                <th className="p-2 text-left">Stock</th>
                <th className="p-2 text-left">Price Adj.</th>
                <th className="p-2 text-left">SKU</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map(v => (
                <tr key={v.id} className="border-b">
                  <td className="p-2">{v.size}</td>
                  <td className="p-2">
                    <span className="inline-block w-4 h-4 rounded-full mr-1" style={{ backgroundColor: v.color.toLowerCase() }}></span>
                    {v.color}
                  </td>
                  <td className="p-2">{v.stock}</td>
                  <td className="p-2">ETB {v.price_adjustment}</td>
                  <td className="p-2 text-xs">{v.sku || '-'}</td>
                  <td className="p-2 text-center">
                    <button onClick={() => editVariant(v)} className="text-blue-600 mr-2"><FiEdit2 size={16} /></button>
                    <button onClick={() => deleteVariant(v.id)} className="text-red-500"><FiTrash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for variant form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">{editingVariant ? 'Edit Variant' : 'Add Variant'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Size</label>
                  <select
                    value={form.size}
                    onChange={e => setForm({ ...form, size: e.target.value })}
                    className="w-full border rounded p-2"
                    required
                  >
                    {SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Color</label>
                  <select
                    value={form.color}
                    onChange={e => setForm({ ...form, color: e.target.value })}
                    className="w-full border rounded p-2"
                    required
                  >
                    {COLORS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={e => setForm({ ...form, stock: parseInt(e.target.value) })}
                  className="w-full border rounded p-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Price Adjustment (ETB)</label>
                <input
                  type="number"
                  step="10"
                  value={form.price_adjustment}
                  onChange={e => setForm({ ...form, price_adjustment: parseFloat(e.target.value) })}
                  className="w-full border rounded p-2"
                />
                <p className="text-xs text-gray-500">Add or subtract from base price</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SKU (optional)</label>
                <input
                  type="text"
                  value={form.sku}
                  onChange={e => setForm({ ...form, sku: e.target.value })}
                  className="w-full border rounded p-2"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-black text-white px-4 py-2 rounded-full flex-1"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="border px-4 py-2 rounded-full"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
              isOpen={deleteModal.isOpen}
              onClose={handleCloseDeleteModal}
              onConfirm={handleDelete}
              title="Delete Variant"
              message="Are you sure you want to delete this variant? This action cannot be undone."
              confirmText="Yes, Delete"
              cancelText="No, Keep It"
            />
    </div>
  );
}