
import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, User } from './firebase';
import Login from './components/Login';
import POS from './components/POS';
import ManageProducts from './components/ManageProducts';

type View = 'pos' | 'manage';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false); // State สำหรับโหมด Guest
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('pos');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsGuest(false); // ถ้า Login จริง ให้ยกเลิก Guest mode
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGuestLogin = () => {
    setIsGuest(true);
  };

  const handleLogout = () => {
    auth.signOut();
    setIsGuest(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-600 font-medium">กำลังโหลดระบบ...</p>
        </div>
      </div>
    );
  }

  // ถ้าไม่มี user และไม่ใช่ Guest ให้แสดงหน้า Login
  if (!user && !isGuest) {
    return <Login onGuestLogin={handleGuestLogin} />;
  }

  // สร้าง User Object จำลองสำหรับ Guest (เพื่อให้ผ่าน Type Check ของ POS)
  const activeUser = user || ({
    uid: 'guest',
    email: 'guest@cafe.com',
    displayName: 'ผู้เยี่ยมชม (Guest)',
    photoURL: null,
    emailVerified: false,
    isAnonymous: true,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'guest'
  } as unknown as User);

  return (
    <div className="h-screen overflow-hidden">
      {currentView === 'pos' ? (
        <POS 
          user={activeUser} 
          onSwitchView={() => setCurrentView('manage')} 
          isGuest={isGuest}
          onLogout={handleLogout}
        />
      ) : (
        <ManageProducts user={activeUser} onBack={() => setCurrentView('pos')} />
      )}
    </div>
  );
};

export default App;
