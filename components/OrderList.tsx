import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc } from 'firebase/firestore';
import { Order, ADMIN_EMAILS } from '../types';
import { User } from '../firebase';

interface OrderListProps {
  user: User;
  onBack: () => void;
}

const OrderList: React.FC<OrderListProps> = ({ user, onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const isAdmin = user.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    let q;
    if (isAdmin) {
      q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
    } else {
      q = query(collection(db, 'orders'), where('customerId', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      // Sort client-side if not admin to avoid requiring a composite index
      if (!isAdmin) {
        ordersData.sort((a, b) => {
          const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
          const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
          return timeB - timeA;
        });
      }

      setOrders(ordersData);
      
      // Update selected order if it's currently open
      if (selectedOrder) {
        const updatedSelected = ordersData.find(o => o.id === selectedOrder.id);
        if (updatedSelected) setSelectedOrder(updatedSelected);
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, user.uid, selectedOrder?.id]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
    } catch (error) {
      console.error("Error updating status:", error);
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-yellow-700">รอดำเนินการ</span>;
      case 'ready': return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">พร้อมรับสินค้า</span>;
      case 'completed': return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-600">เสร็จสิ้น</span>;
      case 'cancelled': return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-600">ยกเลิก</span>;
      default: return <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-500 font-bold text-sm">กำลังโหลดรายการออเดอร์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b flex items-center gap-4 bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-800">รายการออเดอร์</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Order History</p>
        </div>
      </header>

      <main className="flex-grow p-6 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              </div>
              <p className="text-gray-500 font-medium">ยังไม่มีรายการออเดอร์</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                >
                  <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 pb-4 border-b border-gray-50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusBadge(order.status)}
                        <span className="text-xs text-gray-400 font-mono">#{order.id.slice(-6)}</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{formatDate(order.timestamp)}</p>
                    </div>
                    <div className="text-right flex items-center justify-end gap-4">
                      <div>
                        <p className="text-lg font-black text-blue-600">฿{order.total.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 font-medium">
                          {order.paymentMethod === 'cash' ? 'เงินสด' : 'QR Code'} 
                          {order.customerName && ` • ${order.customerName}`}
                        </p>
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {order.items.slice(0, 2).map((item, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-400 w-6 text-center">x{item.quantity}</span>
                          <span className="text-gray-700 font-medium truncate max-w-[200px]">{item.title}</span>
                        </div>
                        <span className="text-gray-500">฿{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <div className="text-xs text-gray-400 font-medium pt-1">
                        และอีก {order.items.length - 2} รายการ...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setSelectedOrder(null)}></div>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative animate-in zoom-in-95 duration-200 shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-xl font-black text-gray-800">รายละเอียดออเดอร์</h2>
                <p className="text-xs text-gray-500 font-mono mt-0.5">#{selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className="h-10 w-10 flex items-center justify-center hover:bg-gray-200 rounded-full text-gray-500 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-grow space-y-8">
              {/* Order Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider mb-1">วันที่ทำรายการ</span>
                  <span className="font-bold text-sm text-gray-800">{formatDate(selectedOrder.timestamp)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider mb-1">ลูกค้า</span>
                  <span className="font-bold text-sm text-gray-800">{selectedOrder.customerName || 'ทั่วไป'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider mb-1">สถานะ</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-bold uppercase tracking-wider mb-1">ช่องทางชำระเงิน</span>
                  <span className="font-bold text-sm text-gray-800">{selectedOrder.paymentMethod === 'cash' ? 'เงินสด' : 'QR Code'}</span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  รายการสินค้า
                </h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl border border-gray-100 hover:border-blue-100 transition-colors bg-white">
                      <img src={item.image} alt={item.title} className="w-14 h-14 rounded-xl object-cover bg-gray-100 border border-gray-50" />
                      <div className="flex-grow">
                        <p className="font-bold text-sm text-gray-800">{item.title}</p>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">{item.price.toLocaleString()} ฿ <span className="text-gray-300 mx-1">x</span> <span className="text-blue-600 font-bold">{item.quantity}</span></p>
                      </div>
                      <div className="font-black text-gray-800">
                        {(item.price * item.quantity).toLocaleString()} ฿
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-6 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">ยอดรวมสินค้า</span>
                  <span className="font-bold text-gray-800">{(selectedOrder.total / 1.07).toFixed(2)} ฿</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">ภาษีมูลค่าเพิ่ม (7%)</span>
                  <span className="font-bold text-gray-800">{(selectedOrder.total - selectedOrder.total / 1.07).toFixed(2)} ฿</span>
                </div>
                
                <div className="flex justify-between items-end pt-4 border-t border-gray-100 mt-2">
                  <span className="font-black text-gray-800">ยอดสุทธิ</span>
                  <span className="text-3xl font-black text-blue-600">{selectedOrder.total.toLocaleString()} <span className="text-sm text-gray-500">฿</span></span>
                </div>

                {selectedOrder.paymentMethod === 'cash' && selectedOrder.cashReceived && (
                  <div className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-xl mt-4">
                    <div className="flex gap-4">
                      <span className="text-gray-500">รับเงินสด: <span className="font-bold text-gray-800">{selectedOrder.cashReceived.toLocaleString()} ฿</span></span>
                      <span className="text-gray-500">เงินทอน: <span className="font-bold text-gray-800">{selectedOrder.change?.toLocaleString()} ฿</span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                {isAdmin && selectedOrder.status === 'pending' && (
                  <button 
                    onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                    className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md"
                  >
                    ยืนยันพร้อมรับสินค้า
                  </button>
                )}
                {isAdmin && selectedOrder.status === 'ready' && (
                  <button 
                    onClick={() => updateOrderStatus(selectedOrder.id, 'completed')}
                    className="px-6 py-2.5 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-md"
                  >
                    ลูกค้ารับสินค้าแล้ว
                  </button>
                )}
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;
