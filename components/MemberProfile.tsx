import React, { useEffect, useState } from 'react';
import { User, db, auth, updateProfile } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Member } from '../types';

interface MemberProfileProps {
  user: User;
  onBack: () => void;
  onViewOrders: () => void;
}

const MemberProfile: React.FC<MemberProfileProps> = ({ user, onBack, onViewOrders }) => {
  const [memberData, setMemberData] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [address, setAddress] = useState('');
  const [birthDate, setBirthDate] = useState('');

  useEffect(() => {
    const fetchMemberData = async () => {
      if (user.uid === 'guest') {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'members', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Member;
          setMemberData(data);
          setDisplayName(data.displayName || user.displayName || '');
          setAddress(data.address || '');
          setBirthDate(data.birthDate || '');
        } else {
          // Fallback if no Firestore data yet
          setDisplayName(user.displayName || '');
        }
      } catch (error: any) {
        console.error("Error fetching member data:", error);
        if (error.code === 'permission-denied') {
          alert("ไม่สามารถเข้าถึงข้อมูลได้ (Permission Denied)\nกรุณาตรวจสอบ Firestore Rules ใน Firebase Console");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMemberData();
  }, [user]);

  const handleSave = async () => {
    if (!user || user.uid === 'guest') return;
    setSaving(true);
    try {
      // 1. Update Firestore (use setDoc with merge to create if not exists)
      const docRef = doc(db, 'members', user.uid);
      await setDoc(docRef, {
        displayName,
        address,
        birthDate,
        email: user.email, // Ensure email is saved
        uid: user.uid,     // Ensure uid is saved
        role: memberData?.role || 'member' // Preserve role or default
      }, { merge: true });

      // 2. Update Auth Profile (Display Name)
      if (auth.currentUser && displayName !== user.displayName) {
        await updateProfile(auth.currentUser, {
          displayName: displayName
        });
      }

      // 3. Update Local State
      setMemberData(prev => prev ? { ...prev, displayName, address, birthDate } : null);
      setIsEditing(false);
      alert('บันทึกข้อมูลเรียบร้อยแล้ว');
    } catch (error) {
      console.error("Error updating profile:", error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert(`ส่งอีเมลเปลี่ยนรหัสผ่านไปที่ ${user.email} เรียบร้อยแล้ว`);
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      alert('เกิดข้อผิดพลาดในการส่งอีเมลเปลี่ยนรหัสผ่าน: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-500 font-bold text-sm">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b flex items-center justify-between bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">ข้อมูลส่วนตัว</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Member Profile</p>
          </div>
        </div>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="text-blue-600 font-bold text-sm hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors"
          >
            แก้ไขข้อมูล
          </button>
        ) : (
          <div className="flex gap-2">
            <button 
              onClick={() => setIsEditing(false)}
              className="text-gray-500 font-bold text-sm hover:bg-gray-100 px-4 py-2 rounded-xl transition-colors"
              disabled={saving}
            >
              ยกเลิก
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white font-bold text-sm px-4 py-2 rounded-xl shadow-md hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>
          </div>
        )}
      </header>

      <main className="flex-grow p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Profile Header (Simple) */}
            <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row items-center gap-6">
                <div className="h-24 w-24 rounded-full bg-gray-100 border-4 border-white shadow-md overflow-hidden flex-shrink-0">
                    <img 
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random&size=256`} 
                        alt="Profile" 
                        className="h-full w-full object-cover"
                    />
                </div>
                <div className="text-center md:text-left flex-grow">
                    <h2 className="text-2xl font-bold text-gray-800">{displayName || 'Guest User'}</h2>
                    <p className="text-gray-500 text-sm">{user.email}</p>
                    <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-wide">
                        {memberData?.role || 'Member'}
                    </div>
                </div>
                <div className="mt-4 md:mt-0">
                    <button 
                        onClick={onViewOrders}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        ดูสถานะออเดอร์
                    </button>
                </div>
            </div>

            {/* Form Fields */}
            <div className="p-8 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">ชื่อ-นามสกุล</label>
                        {isEditing ? (
                            <input 
                                type="text" 
                                value={displayName} 
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                placeholder="ชื่อ-นามสกุล"
                            />
                        ) : (
                            <div className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800">
                                {displayName || '-'}
                            </div>
                        )}
                    </div>

                    {/* Birth Date */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">วันเกิด</label>
                        {isEditing ? (
                            <input 
                                type="date" 
                                value={birthDate} 
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                            />
                        ) : (
                            <div className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800">
                                {birthDate ? new Date(birthDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                            </div>
                        )}
                    </div>

                    {/* Email (Read-only) */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">อีเมล <span className="text-xs font-normal text-gray-400">(แก้ไขไม่ได้)</span></label>
                        <div className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 cursor-not-allowed">
                            {user.email}
                        </div>
                    </div>

                    {/* Password (Change via Email) */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-gray-700">รหัสผ่าน</label>
                        <div className="flex gap-2">
                            <div className="flex-grow px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-400 tracking-widest">
                                ••••••••
                            </div>
                            {isEditing && (
                                <button 
                                    onClick={handlePasswordReset}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-colors whitespace-nowrap"
                                >
                                    เปลี่ยนรหัสผ่าน
                                </button>
                            )}
                        </div>
                        {isEditing && <p className="text-xs text-gray-400 mt-1">* กดปุ่มเพื่อรับอีเมลสำหรับตั้งรหัสผ่านใหม่</p>}
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">ที่อยู่</label>
                    {isEditing ? (
                        <textarea 
                            value={address} 
                            onChange={(e) => setAddress(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"
                            placeholder="ที่อยู่จัดส่งสินค้า..."
                        />
                    ) : (
                        <div className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 min-h-[100px]">
                            {address || '-'}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};

export default MemberProfile;
