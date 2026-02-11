
import React, { useState, useEffect, useMemo } from 'react';
import { User, logOut, db } from '../firebase';
// @ts-ignore
import { collection, onSnapshot } from 'firebase/firestore';
import { Product, CartItem, Category } from '../types';

interface POSProps {
  user: User;
  onSwitchView: () => void;
  isGuest?: boolean;
  onLogout?: () => void;
}

// กำหนดอีเมลสำหรับผู้ดูแลระบบ
const ADMIN_EMAIL = "nasora.nsr300@gmail.com";

const POS: React.FC<POSProps> = ({ user, onSwitchView, isGuest = false, onLogout }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(Category.DRINKS);
  
  // View Product Detail State
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  // Payment & Modals State
  const [showQR, setShowQR] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastOrderTotal, setLastOrderTotal] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ตรวจสอบสิทธิ์ Admin
  const isAdmin = !isGuest && user.email === ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'cafe'), 
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        setProducts(docs);
        setError(null);
      },
      (err) => {
        console.error("Firestore Error:", err);
        if (err.code === 'permission-denied') {
          setError("สิทธิ์การเข้าถึงไม่เพียงพอ (Permission Denied)");
        } else {
          setError("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + err.message);
        }
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.category === selectedCategory && 
      (p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       (p.type && p.type.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product: Product) => {
    if (isGuest) {
        // Guest mode cannot add to cart
        return;
    }
    if (product.status === 'Sold Out') return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handlePayment = () => {
    if (isGuest) return;
    setLastOrderTotal(total);
    setShowQR(false);
    setShowSuccess(true);
    setCart([]); // เคลียร์ตะกร้าสินค้าทันทีที่ชำระเงินสำเร็จ
  };

  const handleNewOrder = () => {
    setShowSuccess(false);
    // ตะกร้าถูกเคลียร์ไปแล้วใน handlePayment
  };
  
  const handleLogoutClick = () => {
    if (onLogout) {
        onLogout();
    } else {
        logOut();
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      
      {/* 1. TOP NAVIGATION BAR */}
      <nav className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-sm z-30 sticky top-0">
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
            <div className={`h-11 w-11 bg-gradient-to-br ${isGuest ? 'from-gray-500 to-gray-600' : 'from-blue-600 to-blue-700'} rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg ${isGuest ? 'shadow-gray-200' : 'shadow-blue-200'}`}>
                C
            </div>
            <div className="hidden md:block">
                <h1 className="text-xl font-black text-gray-800 tracking-tight leading-none">CAFE POS</h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                    {isGuest ? 'Guest View Only' : 'Point of Sale'}
                </p>
            </div>
        </div>

        {/* Center: Search Bar */}
        <div className="flex-1 max-w-xl mx-6">
            <div className="relative group">
                <input
                    type="text"
                    placeholder="ค้นหาเมนู, ประเภทสินค้า..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-100 border-transparent focus:bg-white border focus:border-blue-500 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold text-gray-700 placeholder-gray-400 transition-all shadow-inner focus:shadow-lg focus:shadow-blue-50"
                />
                <svg className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </div>
        </div>

        {/* Right: Actions & Account */}
        <div className="flex items-center gap-5">
            {/* Admin Only Button */}
            {isAdmin && (
                <button
                    onClick={onSwitchView}
                    className="hidden lg:flex items-center gap-2 bg-gray-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-gray-900 transition-all shadow-md hover:shadow-xl active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
                    <span>จัดการสินค้า</span>
                </button>
            )}

            {/* Account Management */}
            <div className="flex items-center gap-3 pl-5 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-800 leading-tight truncate max-w-[150px]">{user.displayName || user.email}</p>
                    <p className={`text-[9px] font-black uppercase tracking-widest ${isAdmin ? 'text-blue-600' : 'text-gray-400'}`}>
                        {isGuest ? 'Guest Access' : (isAdmin ? 'Administrator' : 'Staff Member')}
                    </p>
                </div>
                <div className="group relative">
                    <div className="h-10 w-10 rounded-full bg-gray-100 border-2 border-white shadow-md overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all">
                        <img
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'Guest'}&background=random`}
                            alt="User"
                            className="h-full w-full object-cover"
                        />
                    </div>
                </div>
                <button 
                    onClick={handleLogoutClick} 
                    className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all ${isGuest ? 'text-blue-500 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`} 
                    title={isGuest ? "เข้าสู่ระบบ" : "ออกจากระบบ"}
                >
                    {isGuest ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" x2="3" y1="12" y2="12"/></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
                    )}
                </button>
            </div>
        </div>
      </nav>

      {/* 2. MAIN CONTENT + CART WRAPPER */}
      <div className="flex-grow flex overflow-hidden">
        
        {/* Left Side: Product Grid Area */}
        <main className="flex-grow flex flex-col min-w-0 bg-gray-50/50">
            {/* Category Tabs */}
            <div className="px-6 pt-6 pb-2">
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {Object.values(Category).map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border ${
                                selectedCategory === cat
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-105'
                                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Grid Scroller */}
            <div className="flex-grow overflow-y-auto px-6 pb-6 pt-2 no-scrollbar">
                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-5 bg-red-50 border border-red-200 text-red-700 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <div>
                                <span className="font-bold block">เกิดข้อผิดพลาด</span>
                                <span className="text-xs">{error}</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-5 pb-20">
                    {filteredProducts.map(product => (
                        <div 
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-blue-100 ${isGuest ? 'cursor-default' : 'cursor-pointer'} ${product.status === 'Sold Out' ? 'opacity-60 grayscale' : ''}`}
                        >
                        <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                            <img src={product.image} alt={product.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            
                            {/* INFO BUTTON REMOVED FROM HERE */}

                            {product.status === 'Sold Out' && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                                    <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg transform -rotate-6 border border-white/20">หมดชั่วคราว</span>
                                </div>
                            )}
                            {product.type && (
                                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md text-gray-800 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg shadow-sm border border-gray-100">
                                    {product.type}
                                </div>
                            )}
                            {!isGuest && (
                                <div className="absolute bottom-2 right-2 bg-blue-600 text-white rounded-full p-2.5 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0 shadow-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <div className="flex items-start justify-between gap-2 h-10">
                                <h3 className="font-bold text-gray-800 line-clamp-2 text-sm leading-tight flex-grow">{product.title}</h3>
                                {/* INFO BUTTON MOVED HERE */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setViewProduct(product);
                                    }}
                                    className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-full bg-white text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-gray-100 shadow-sm transition-all active:scale-90"
                                    title="ดูรายละเอียด"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                </button>
                            </div>
                            <div className="mt-2 flex items-end justify-between">
                                <div>
                                    <span className="block text-lg font-black text-blue-600 leading-none">{product.price.toLocaleString()}</span>
                                    <span className="text-[10px] text-gray-400 font-medium">บาท / {product.unit}</span>
                                </div>
                                {product.status === 'In Stock' && (
                                    <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                )}
                            </div>
                        </div>
                        </div>
                    ))}
                </div>

                {filteredProducts.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <svg className="text-gray-300" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                        <p className="font-bold text-sm">ไม่พบสินค้าที่ค้นหา</p>
                        <p className="text-xs mt-1">ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่ใหม่</p>
                    </div>
                )}
            </div>
        </main>

        {/* Right Side: Cart Panel */}
        <aside className="w-[350px] lg:w-[390px] xl:w-[430px] flex-shrink-0 bg-white border-l border-gray-100 shadow-2xl flex flex-col z-20 transition-all duration-300">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
            <div className="flex items-center gap-3">
                <div className={`h-10 w-10 ${isGuest ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600'} rounded-xl flex items-center justify-center`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                </div>
                <div>
                    <h2 className="text-lg font-black text-gray-800">ตะกร้าสินค้า</h2>
                    <p className="text-xs text-gray-400 font-medium">{cart.length} รายการ</p>
                </div>
            </div>
            {!isGuest && (
                <button 
                    onClick={() => setCart([])} 
                    className="text-[10px] font-bold text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg uppercase tracking-wider transition-colors"
                    disabled={cart.length === 0}
                >
                    ล้างทั้งหมด
                </button>
            )}
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-3 no-scrollbar bg-gray-50/30">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-10">
                <div className="h-24 w-24 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
                </div>
                {isGuest ? (
                     <>
                        <p className="font-bold text-gray-400 text-sm">Guest Mode</p>
                        <p className="text-xs text-gray-300 mt-1">กรุณาเข้าสู่ระบบเพื่อสั่งซื้อ</p>
                     </>
                ) : (
                    <>
                        <p className="font-bold text-gray-400 text-sm">ยังไม่มีสินค้าในตะกร้า</p>
                        <p className="text-xs text-gray-300 mt-1">เลือกสินค้าจากรายการด้านซ้ายเพื่อเริ่มขาย</p>
                    </>
                )}
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="group flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all">
                  <img src={item.image} className="h-16 w-16 rounded-xl object-cover border border-gray-100" alt="" />
                  <div className="flex-grow min-w-0">
                    <h4 className="font-bold text-sm text-gray-800 truncate">{item.title}</h4>
                    <p className="text-xs font-medium text-blue-500 mt-0.5">{item.price.toLocaleString()} ฿</p>
                  </div>
                  {!isGuest && (
                      <>
                        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-100">
                            <button onClick={() => updateQuantity(item.id, -1)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-blue-600 shadow-sm transition-colors font-bold">-</button>
                            <span className="w-8 text-center text-sm font-bold text-gray-700">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, 1)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-blue-600 shadow-sm transition-colors font-bold">+</button>
                        </div>
                        <button onClick={() => removeFromCart(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>
                      </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-white border-t border-gray-100 space-y-4 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-10">
            <div className="space-y-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex justify-between text-xs font-medium text-gray-500"><span>ยอดรวมสินค้า</span><span>{(total / 1.07).toFixed(2)}</span></div>
              <div className="flex justify-between text-xs font-medium text-gray-500"><span>ภาษีมูลค่าเพิ่ม (7%)</span><span>{(total - total / 1.07).toFixed(2)}</span></div>
              <div className="flex justify-between items-end pt-3 border-t border-gray-200 mt-2">
                <span className="font-bold text-gray-800">ยอดสุทธิ</span>
                <span className="text-3xl font-black text-blue-600 leading-none">{total.toLocaleString()} <span className="text-sm font-bold text-gray-500">฿</span></span>
            </div>
            </div>
            <button 
                disabled={cart.length === 0 && !isGuest} 
                onClick={isGuest ? undefined : () => setShowQR(true)} 
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 ${
                    isGuest 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none' 
                        : 'bg-gray-900 text-white hover:bg-black hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
            >
                {isGuest ? (
                    <span>กรุณาเข้าสู่ระบบเพื่อสั่งซื้อ</span>
                ) : (
                    <>
                        <span>ชำระเงิน</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </>
                )}
            </button>
          </div>
        </aside>
      </div>

      {/* Product Detail Popup */}
      {viewProduct && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setViewProduct(null)}></div>
            <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Image Header */}
                <div className="relative h-64 w-full bg-gray-100">
                    <img src={viewProduct.image} className="h-full w-full object-cover" alt={viewProduct.title} />
                    <button
                        onClick={() => setViewProduct(null)}
                        className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center bg-black/20 text-white backdrop-blur-md rounded-full hover:bg-black/40 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">{viewProduct.category} {viewProduct.type && `• ${viewProduct.type}`}</div>
                            <h3 className="text-2xl font-black text-gray-900 leading-tight">{viewProduct.title}</h3>
                        </div>
                        <div className="text-right">
                            <div className="text-3xl font-black text-gray-900">{viewProduct.price.toLocaleString()}</div>
                            <div className="text-xs font-bold text-gray-400">บาท / {viewProduct.unit}</div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-100">
                        <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-2">รายละเอียดสินค้า</h4>
                        <p className="text-gray-600 text-sm leading-relaxed font-medium">
                            {viewProduct.detail || "ไม่มีรายละเอียดเพิ่มเติม"}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        {!isGuest && viewProduct.status !== 'Sold Out' && (
                            <button
                                onClick={() => {
                                    addToCart(viewProduct);
                                    setViewProduct(null);
                                }}
                                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/><path d="M12 9h6"/><path d="M15 6v6"/></svg>
                                เพิ่มลงตะกร้า
                            </button>
                        )}
                        {isGuest && (
                             <button disabled className="flex-1 py-4 bg-gray-200 text-gray-500 rounded-2xl font-bold cursor-not-allowed">
                                กรุณาเข้าสู่ระบบเพื่อสั่งซื้อ
                             </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Payment QR Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 text-center relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setShowQR(false)} className="absolute top-6 right-6 h-10 w-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:text-red-500 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            
            <div className="mb-6">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                </div>
                <h3 className="text-2xl font-black text-gray-800">สแกนชำระเงิน</h3>
                <p className="text-gray-500 text-sm mt-1">พร้อมเพย์ (PromptPay)</p>
            </div>

            <div className="bg-blue-600 p-4 rounded-3xl shadow-xl shadow-blue-200 mb-6">
                <div className="bg-white p-2 rounded-2xl">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PROMPTPAY:BILL:${total}`} alt="QR Code" className="w-full rounded-xl" />
                </div>
            </div>
            
            <div className="flex justify-between items-center mb-6 px-2">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">ยอดชำระ</span>
                <span className="text-3xl font-black text-blue-600">{total.toLocaleString()} ฿</span>
            </div>

            <button onClick={handlePayment} className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold shadow-lg hover:bg-green-600 active:scale-95 transition-all">
                ยืนยันการชำระเงิน
            </button>
          </div>
        </div>
      )}

      {/* Success Popup Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 text-center relative animate-in zoom-in-95 duration-300 overflow-hidden">
             {/* Background Decoration */}
             <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-green-50 to-transparent z-0"></div>
             
             <div className="relative z-10">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 mb-6 shadow-inner ring-8 ring-green-50 animate-in zoom-in spin-in-180 duration-500">
                    <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                
                <h3 className="text-2xl font-black text-gray-800 mb-2">ชำระเงินสำเร็จ!</h3>
                <p className="text-gray-500 text-sm mb-8">ขอบคุณที่ใช้บริการ</p>
                
                <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">ยอดเงินที่ชำระ</p>
                    <p className="text-4xl font-black text-gray-800 tracking-tight">{lastOrderTotal.toLocaleString()} <span className="text-lg text-gray-400 font-bold">฿</span></p>
                </div>

                <div className="space-y-3">
                    <button onClick={handleNewOrder} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all">
                        เริ่มออเดอร์ใหม่
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
