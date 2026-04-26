import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  User, 
  KeyRound, 
  LogOut, 
  Save, 
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id?: string;
    name: string;
    email?: string;
    role: string;
  } | null;
  onLogout: () => void;
  onUpdate: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  user, 
  onLogout,
  onUpdate 
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', password: '', confirm: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  if (!isOpen || !user) return null;

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (profileForm.password && profileForm.password !== profileForm.confirm) {
      setMessage({ type: 'error', text: 'كلمات المرور الجديدة غير متطابقة' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      await api.put('/user', { 
        name: profileForm.name, 
        password: profileForm.password || undefined 
      });
      setMessage({ type: 'success', text: 'تم تحديث الملف الشخصي بنجاح ✅' });
      setProfileForm({ ...profileForm, password: '', confirm: '' });
      onUpdate();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'حدث خطأ أثناء تحديث الملف الشخصي' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="vercel-card w-full max-w-md bg-background border-border/50 shadow-2xl overflow-hidden p-0"
        >
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold border border-primary/20">
                {user.name[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg">{user.name}</h3>
                <p className="text-xs text-muted-foreground">{user.email || 'لا يوجد بريد'}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {message && (
              <div className={`p-3 rounded-lg flex items-start gap-2 mb-6 text-sm font-bold ${
                message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
              }`}>
                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                <p>{message.text}</p>
              </div>
            )}

            <div className="flex items-center gap-2 mb-6 p-1 bg-muted rounded-xl">
              <button
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'info' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('info')}
              >
                معلومات الحساب
              </button>
              <button
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'password' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab('password')}
              >
                تحديث البيانات
              </button>
            </div>

            {activeTab === 'info' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-border/50 bg-secondary/30 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">الدور</span>
                    <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-md">{user.role}</span>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-all font-bold border border-transparent hover:border-destructive/20"
                >
                  <LogOut className="w-4 h-4" />
                  تسجيل الخروج
                </button>
              </div>
            ) : (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold">الاسم (اسم المستخدم)</label>
                  <div className="relative">
                    <User className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                    <input
                      required
                      type="text"
                      className="vercel-input pr-10 w-full h-10 px-3 rounded-md border border-input bg-background"
                      placeholder="الاسم الكامل"
                      value={profileForm.name}
                      onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">كلمة المرور الجديدة (اختياري)</label>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      className="vercel-input pr-10 w-full h-10 px-3 rounded-md border border-input bg-background"
                      placeholder="••••••••"
                      value={profileForm.password}
                      onChange={e => setProfileForm({ ...profileForm, password: e.target.value })}
                      minLength={6}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <KeyRound className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      className="vercel-input pr-10 w-full h-10 px-3 rounded-md border border-input bg-background"
                      placeholder="••••••••"
                      value={profileForm.confirm}
                      onChange={e => setProfileForm({ ...profileForm, confirm: e.target.value })}
                      minLength={6}
                    />
                  </div>
                </div>
                <button
                  disabled={isSaving}
                  className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 mt-4 rounded-xl font-bold flex items-center justify-center"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ml-2" /> حفظ التغييرات</>}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
