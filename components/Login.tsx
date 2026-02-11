
import React, { useState } from 'react';
import { 
  signInWithGoogle, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  auth 
} from '../firebase';

interface LoginProps {
  onGuestLogin?: () => void;
}

const Login: React.FC<LoginProps> = ({ onGuestLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const currentHostname = window.location.hostname;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowHelp(false);
    try {
      if (isSignUp) {
        // สมัครสมาชิกใหม่
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
      } else {
        // เข้าสู่ระบบ
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth Error Code:", err.code);
      
      // จัดการข้อผิดพลาด auth/invalid-credential 
      // (Firebase ใช้โค้ดนี้แทน User Not Found หรือ Wrong Password เพื่อความปลอดภัย)
      if (err.code === 'auth/invalid-credential') {
        setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่มีบัญชีนี้ในระบบ');
        setShowHelp(true);
      } else if (err.code === 'auth/email-already-in-use') {
        setError('อีเมลนี้ถูกใช้งานไปแล้ว กรุณาเข้าสู่ระบบแทน');
        setIsSignUp(false);
      } else if (err.code === 'auth/weak-password') {
        setError('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('ยังไม่ได้เปิดใช้งาน Email Auth ใน Firebase Console');
        setShowHelp(true);
      } else if (err.code === 'auth/network-request-failed') {
        setError('ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้');
      } else {
        setError('เกิดข้อผิดพลาด: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    setShowHelp(false);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Auth Error:", err.code);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`โดเมน "${currentHostname}" ยังไม่ได้รับอนุญาตใน Firebase`);
        setShowHelp(true);
      } else if (err.code === 'auth/popup-blocked') {
        setError('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัพ');
      } else {
        setError('Google Sign-in ล้มเหลว: ' + err.message);
        setShowHelp(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-cover bg-center px-4" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000')" }}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
      
      <div className="z-10 w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white shadow-2xl transition-all duration-300">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-10 text-center text-white">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Cafe POS</h1>
          <p className="mt-2 text-sm text-blue-100 font-medium">
            {isSignUp ? 'สร้างบัญชีผู้ใช้งานใหม่' : 'เข้าสู่ระบบเพื่อจัดการร้านของคุณ'}
          </p>
        </div>
        
        <div className="p-8 space-y-6">
          {error && (
            <div className="rounded-2xl bg-red-50 p-5 border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-red-100 p-1 text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div className="flex-grow">
                  <p className="text-xs font-bold text-red-800 leading-tight mb-1">{error}</p>
                  <button 
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-[10px] font-black uppercase text-red-500 underline hover:text-red-700 transition-colors"
                  >
                    {showHelp ? 'ปิดคำแนะนำ' : 'วิธีแก้: บัญชีใหม่ / ตั้งค่า Firebase'}
                  </button>
                </div>
              </div>
              
              {showHelp && (
                <div className="mt-4 space-y-3 border-t border-red-100 pt-4 text-[10px] text-red-700 leading-relaxed font-medium">
                  <p className="font-black uppercase tracking-wider text-red-800">🛠️ แนะนำการแก้ไข:</p>
                  <ul className="list-decimal list-inside space-y-2">
                    {!isSignUp && (
                      <li>หากคุณยังไม่เคยใช้งาน ให้เลือก <strong>"สมัครสมาชิกที่นี่"</strong> ด้านล่างเพื่อสร้างบัญชีใหม่</li>
                    )}
                    <li>ไปที่ <strong>Firebase Console</strong> > <strong>Authentication</strong> > <strong>Sign-in method</strong></li>
                    <li>ตรวจสอบว่า <strong>Email/Password</strong> เปลี่ยนสถานะเป็น <strong>Enabled</strong> แล้ว</li>
                    <li>หากใช้ Google: ตรวจสอบ <strong>Authorized domains</strong> และเพิ่ม <code className="bg-red-100 px-1 rounded font-bold text-red-900">{currentHostname}</code></li>
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">ชื่อผู้ใช้งาน</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                  placeholder="ชื่อของคุณ"
                  required={isSignUp}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">อีเมล</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest ml-1">รหัสผ่าน</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm font-medium focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-2xl bg-blue-600 py-4 font-black text-white shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              <span className="relative z-10">{loading ? 'กำลังดำเนินการ...' : (isSignUp ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ')}</span>
            </button>
          </form>

          <div className="space-y-3">
            <div className="text-center">
              <button 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setShowHelp(false);
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors py-2"
              >
                {isSignUp ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ยังไม่มีบัญชี? สมัครสมาชิกที่นี่'}
              </button>
            </div>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="mx-4 text-[10px] font-black uppercase tracking-widest text-gray-300">หรือเชื่อมต่อด้วย</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>
            
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-4 font-bold text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-200 active:scale-95 transition-all disabled:opacity-50"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="h-5 w-5" alt="Google" />
              เข้าสู่ระบบด้วย Google
            </button>

            {onGuestLogin && (
              <button
                type="button"
                onClick={onGuestLogin}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-transparent py-3.5 font-bold text-gray-500 hover:border-gray-400 hover:text-gray-600 active:scale-95 transition-all"
              >
                เข้าชมเมนู (Guest Mode)
              </button>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 p-6 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Security powered by Firebase Auth
        </div>
      </div>
    </div>
  );
};

export default Login;
