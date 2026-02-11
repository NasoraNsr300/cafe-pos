
import React, { useState, useEffect, useMemo } from 'react';
import { db, User, auth, signInWithEmailAndPassword } from '../firebase';
// @ts-ignore
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { Product, CategoryItem, DEFAULT_CATEGORIES } from '../types';

interface ManageProductsProps {
  user: User;
  onBack: () => void;
}

const CLOUDINARY_UPLOAD_PRESET = "ml_default"; 
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dsowwhxak/image/upload";

const ManageProducts: React.FC<ManageProductsProps> = ({ user, onBack }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('ทั้งหมด');

  // Popup States
  const [deleteConfirmation, setDeleteConfirmation] = useState<{id: string, title: string} | null>(null);
  const [deleteCategoryConfirmation, setDeleteCategoryConfirmation] = useState<{id: string, name: string} | null>(null);

  // Verification State
  const [isVerified, setIsVerified] = useState(false);
  const [adminEmail, setAdminEmail] = useState(user.email || '');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [productType, setProductType] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('ชิ้น');
  const [detail, setDetail] = useState('');
  const [category, setCategory] = useState<string>('');
  const [status, setStatus] = useState<'In Stock' | 'Sold Out'>('In Stock');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  // Category Management State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  useEffect(() => {
    if (!isVerified) return;

    // 1. Fetch Products
    const unsubProducts = onSnapshot(
      collection(db, 'cafe'), 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id 
        } as Product));
        setProducts(docs);
        setError(null);
      },
      (err) => {
        console.error("Firestore Product Error:", err);
        setError(`ไม่สามารถโหลดสินค้าได้: ${err.message}`);
      }
    );

    // 2. Fetch Categories
    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const cats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as CategoryItem));
        setCategories(cats.sort((a, b) => a.name.localeCompare(b.name)));
      },
      (err) => {
        console.error("Firestore Category Error:", err);
        const defaultCats = DEFAULT_CATEGORIES.map(name => ({ id: name, name }));
        setCategories(defaultCats);
      }
    );

    // 3. Auto-Seed Categories
    const checkAndSeedCategories = async () => {
        try {
            const snap = await getDocs(collection(db, 'categories'));
            if (snap.empty) {
                console.log("Seeding default categories...");
                for (const catName of DEFAULT_CATEGORIES) {
                    await addDoc(collection(db, 'categories'), { name: catName });
                }
            }
        } catch (e: any) {
            if (e.code !== 'permission-denied') {
                console.error("Auto-seed failed", e);
            }
        }
    };
    checkAndSeedCategories();

    return () => {
        unsubProducts();
        unsubCategories();
    };
  }, [isVerified]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = selectedFilterCategory === 'ทั้งหมด' || p.category === selectedFilterCategory;
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.type && p.type.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [products, selectedFilterCategory, searchQuery]);

  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      setIsVerified(true);
    } catch (err: any) {
      setAuthError('รหัสผ่านไม่ถูกต้อง หรือบัญชีนี้ไม่มีสิทธิ์จัดการ');
    } finally {
      setVerifying(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setProductType('');
    setPrice('');
    setUnit('ชิ้น');
    setDetail('');
    setCategory(categories.length > 0 ? categories[0].name : '');
    setStatus('In Stock');
    setImageFile(null);
    setImagePreview('');
    setEditingProduct(null);
    setIsFormOpen(false);
  };

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setTitle(p.title);
    setProductType(p.type || '');
    setPrice(p.price.toString());
    setUnit(p.unit);
    setDetail(p.detail);
    setCategory(p.category);
    setStatus(p.status);
    setImagePreview(p.image);
    setIsFormOpen(true);
  };

  const requestDelete = (productId: string, productName: string) => {
    setDeleteConfirmation({ id: productId, title: productName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    const { id } = deleteConfirmation;
    setDeleteConfirmation(null);
    try {
      setDeletingId(id);
      await deleteDoc(doc(db, 'cafe', id));
    } catch (err: any) {
      setError(`ลบไม่สำเร็จ: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // --- Category Management ---
  const handleAddCategory = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCategoryName.trim()) return;
      try {
          await addDoc(collection(db, 'categories'), { name: newCategoryName.trim() });
          setNewCategoryName('');
      } catch (err: any) {
          alert('Error adding category: ' + err.message);
      }
  };

  const handleUpdateCategory = async (id: string) => {
      if (!editingCategoryName.trim()) return;
      try {
          await updateDoc(doc(db, 'categories', id), { name: editingCategoryName.trim() });
          setEditingCategoryId(null);
          setEditingCategoryName('');
      } catch (err: any) {
          alert('Error updating category: ' + err.message);
      }
  };

  const requestDeleteCategory = (id: string, name: string) => {
      setDeleteCategoryConfirmation({ id, name });
  };

  const confirmDeleteCategory = async () => {
      if (!deleteCategoryConfirmation) return;
      const { id } = deleteCategoryConfirmation;
      try {
          await deleteDoc(doc(db, 'categories', id));
          setDeleteCategoryConfirmation(null);
      } catch (err: any) {
          alert('Error deleting category: ' + err.message);
      }
  };

  const handleGenerateDescription = async () => {
    if (!title) return alert("กรุณาใส่ชื่อสินค้าก่อน");
    setLoading(true);
    try {
      // @ts-ignore
      const { GoogleGenAI } = await import("https://esm.sh/@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `ช่วยเขียนคำอธิบายสินค้าน่ารักๆ สำหรับคาเฟ่ สำหรับสินค้าชื่อ "${title}" ประเภท "${productType || category}" ให้สั้นและน่าสนใจ 1 ประโยค`,
      });
      if (response.text) setDetail(response.text.trim());
    } catch (err: any) {
      console.error(err);
      alert("AI Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let imageUrl = imagePreview;
      if (imageFile) imageUrl = await uploadImage(imageFile);

      const finalCategory = category || (categories.length > 0 ? categories[0].name : 'Uncategorized');

      const productData = { 
        title, 
        type: productType, 
        price: parseFloat(price), 
        unit, 
        detail, 
        category: finalCategory, 
        status, 
        image: imageUrl 
      };

      if (editingProduct) {
        await updateDoc(doc(db, 'cafe', editingProduct.id), productData);
      } else {
        await addDoc(collection(db, 'cafe'), productData);
      }
      resetForm();
    } catch (err: any) {
      setError(`บันทึกไม่สำเร็จ: ${err.message}`);
      alert(`บันทึกไม่สำเร็จ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isVerified) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-900/10 backdrop-blur-xl p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Admin Authentication</h2>
            <p className="mt-1 text-xs text-blue-100 font-bold uppercase tracking-widest">ยืนยันรหัสผ่านเพื่อจัดการเมนู</p>
          </div>
          <div className="p-8 space-y-6">
            {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold uppercase text-center">{authError}</div>}
            <form onSubmit={handleAdminVerify} className="space-y-4">
              <input type="email" value={adminEmail} readOnly className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm font-bold text-gray-400" />
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm font-bold focus:bg-white focus:border-blue-500 focus:outline-none transition-all" placeholder="รหัสผ่านผู้ดูแลระบบ" required />
              <button type="submit" disabled={verifying} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">
                {verifying ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบจัดการ'}
              </button>
            </form>
            <button onClick={onBack} className="w-full text-[10px] font-black uppercase tracking-widest text-gray-400">← กลับไปหน้า POS</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">จัดการรายการสินค้า</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Cloud Firestore Database</p>
          </div>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => setIsCategoryManagerOpen(true)}
                className="bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 shadow-sm active:scale-95 transition-all flex items-center gap-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                <span>จัดการหมวดหมู่</span>
            </button>
            <button onClick={() => { resetForm(); setIsFormOpen(true); }} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 active:scale-95 transition-all flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                <span>เพิ่มสินค้าใหม่</span>
            </button>
        </div>
      </header>

      {/* Categorization & Search Section */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedFilterCategory('ทั้งหมด')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedFilterCategory === 'ทั้งหมด'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
            }`}
          >
            ทั้งหมด
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedFilterCategory(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                selectedFilterCategory === cat.name
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72 group">
          <input
            type="text"
            placeholder="ค้นหาชื่อสินค้า..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-gray-700 focus:bg-white focus:border-blue-500 transition-all outline-none"
          />
          <svg className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
      </div>

      <main className="flex-grow p-6 overflow-y-auto no-scrollbar">
        {error && (
          <div className="max-w-6xl mx-auto mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold uppercase tracking-wider flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)}>✕</button>
          </div>
        )}

        <div className="max-w-6xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b">
              <tr>
                <th className="px-6 py-4">รูปภาพ</th>
                <th className="px-6 py-4">รายการสินค้า</th>
                <th className="px-6 py-4">ราคา/หน่วย</th>
                <th className="px-6 py-4">สถานะ</th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-6 py-4">
                    <img src={p.image} className="h-12 w-12 rounded-xl object-cover border bg-gray-50" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800 text-sm">{p.title}</div>
                    <div className="text-[10px] text-blue-500 font-bold uppercase">{p.category} {p.type ? `• ${p.type}` : ''}</div>
                    <div className="text-[8px] text-gray-300 font-mono mt-1">ID: {p.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-black text-gray-700 text-sm">{p.price.toLocaleString()} ฿</div>
                    <div className="text-[9px] text-gray-400 font-bold uppercase">ต่อ {p.unit}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded ${p.status === 'In Stock' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {p.status === 'In Stock' ? 'พร้อมขาย' : 'สินค้าหมด'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleEdit(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDelete(p.id, p.title);
                        }}
                        disabled={deletingId === p.id}
                        className={`p-2 rounded-lg transition-all ${deletingId === p.id ? 'bg-red-100 text-red-400' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                      >
                        {deletingId === p.id ? (
                          <div className="h-4 w-4 border-2 border-red-600 border-t-transparent animate-spin rounded-full"></div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="p-20 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
              {products.length === 0 ? "ไม่มีข้อมูลสินค้าในฐานข้อมูล" : "ไม่พบสินค้าที่ตรงกับการค้นหา"}
            </div>
          )}
        </div>
      </main>

      {/* Delete Product Confirmation Popup */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={() => setDeleteConfirmation(null)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-gray-900">ยืนยันการลบสินค้า</h3>
              <p className="text-sm text-gray-500">
                คุณต้องการลบรายการ <span className="font-bold text-gray-800">"{deleteConfirmation.title}"</span> ใช่หรือไม่? 
                <br/>การกระทำนี้ไม่สามารถเรียกคืนได้
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
              >
                ลบสินค้า
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCategoryManagerOpen(false)}></div>
            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-gray-800">จัดการหมวดหมู่</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Manage Product Categories</p>
                    </div>
                    <button onClick={() => setIsCategoryManagerOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">✕</button>
                </div>
                
                <div className="flex-grow overflow-y-auto p-6 space-y-3 no-scrollbar bg-gray-50">
                    {categories.length === 0 && (
                        <p className="text-center text-xs text-gray-400 py-4">ยังไม่มีหมวดหมู่สินค้า</p>
                    )}
                    {categories.map(cat => (
                        <div key={cat.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between group">
                            {editingCategoryId === cat.id ? (
                                <div className="flex items-center gap-2 w-full">
                                    <input 
                                        type="text" 
                                        value={editingCategoryName}
                                        onChange={(e) => setEditingCategoryName(e.target.value)}
                                        className="flex-grow bg-gray-50 border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                                        autoFocus
                                    />
                                    <button onClick={() => handleUpdateCategory(cat.id)} className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    </button>
                                    <button onClick={() => setEditingCategoryId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <span className="font-bold text-gray-700 text-sm pl-2">{cat.name}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => {
                                                setEditingCategoryId(cat.id);
                                                setEditingCategoryName(cat.name);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                                        </button>
                                        <button 
                                            onClick={() => requestDeleteCategory(cat.id, cat.name)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-4 bg-white border-t rounded-b-3xl">
                    <form onSubmit={handleAddCategory} className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="ชื่อหมวดหมู่ใหม่..." 
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white focus:border-blue-500 focus:outline-none transition-all"
                        />
                        <button 
                            type="submit"
                            disabled={!newCategoryName.trim()}
                            className="bg-gray-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            เพิ่ม
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* Delete Category Confirmation Popup */}
      {deleteCategoryConfirmation && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity" onClick={() => setDeleteCategoryConfirmation(null)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 transform transition-all scale-100 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-gray-900">ลบหมวดหมู่</h3>
              <p className="text-sm text-gray-500">
                คุณต้องการลบหมวดหมู่ <span className="font-bold text-gray-800">"{deleteCategoryConfirmation.name}"</span> ใช่หรือไม่? 
                <br/>สินค้าในหมวดหมู่นี้จะถูกแสดงเป็น "Uncategorized"
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteCategoryConfirmation(null)}
                className="flex-1 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteCategory}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Side Panel (Add/Edit Product) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={resetForm}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="px-8 py-6 border-b flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight">{editingProduct ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{editingProduct ? 'Update Product Data' : 'Create New Product'}</p>
              </div>
              <button onClick={resetForm} className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-6 no-scrollbar">
              {/* Image Upload Area */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">รูปภาพสินค้า</label>
                <div className="relative h-48 w-full rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center group hover:border-blue-400 transition-colors cursor-pointer">
                  {imagePreview ? (
                    <img src={imagePreview} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center text-gray-300">
                      <svg className="mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      <p className="text-[10px] font-black uppercase tracking-widest">อัปโหลดรูปภาพ</p>
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                </div>
              </div>

              {/* Title & Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">ชื่อสินค้า</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all" placeholder="เช่น ลาเต้เย็น" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">ประเภทสินค้า (ระบุเพิ่ม)</label>
                <input value={productType} onChange={(e) => setProductType(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:outline-none transition-all" placeholder="เช่น กาแฟนม, เค้กหน้านิ่ม..." />
              </div>

              {/* Price & Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">ราคา (บาท)</label>
                  <input required type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:outline-none transition-all" placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">หน่วยเรียก</label>
                  <input required value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:outline-none transition-all" placeholder="แก้ว, ชิ้น..." />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">หมวดหมู่หลัก</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white focus:border-blue-500 focus:outline-none transition-all appearance-none">
                  {categories.length === 0 && <option value="">ไม่พบหมวดหมู่ (เพิ่มในจัดการหมวดหมู่)</option>}
                  {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest ml-1">สถานะความพร้อม</label>
                <div className="flex gap-2">
                  {(['In Stock', 'Sold Out'] as const).map(s => (
                    <button 
                      key={s} 
                      type="button" 
                      onClick={() => setStatus(s)}
                      className={`flex-grow py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${status === s ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-gray-100'}`}
                    >
                      {s === 'In Stock' ? 'พร้อมขาย' : 'สินค้าหมด'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description & AI */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">คำอธิบาย</label>
                  <button 
                    type="button" 
                    onClick={handleGenerateDescription}
                    disabled={loading || !title}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-600 hover:text-blue-800 disabled:text-gray-300 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                    AI ช่วยเขียน
                  </button>
                </div>
                <textarea rows={3} value={detail} onChange={(e) => setDetail(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-medium focus:bg-white focus:outline-none transition-all resize-none" placeholder="รายละเอียดเพิ่มเติมของสินค้า..."></textarea>
              </div>
            </form>

            <div className="p-8 border-t bg-gray-50/50">
              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'กำลังบันทึกข้อมูล...' : (editingProduct ? 'อัปเดตรายการสินค้า' : 'บันทึกลงฐานข้อมูล')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageProducts;
