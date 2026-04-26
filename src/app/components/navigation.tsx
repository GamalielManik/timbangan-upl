'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from './utils';
import { Home, PlusCircle, Clock, FileText, Menu, X, Bell, BellRing } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const navigation = [
  { name: 'Beranda', href: '/', icon: Home },
  { name: 'Input Data', href: '/input', icon: PlusCircle },
  { name: 'Riwayat', href: '/history', icon: Clock },
  { name: 'Log Aktivitas', href: '/log-aktivitas', icon: FileText },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isSupported, isSubscribed, loading, subscribeToPush } = usePushNotifications();
  
  const handleSubscribe = async () => {
    // VAPID Public Key from environment or hardcoded if safe (it is public anyway)
    // For now we use the process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      alert("VAPID Public Key belum dikonfigurasi.");
      return;
    }
    await subscribeToPush(vapidKey);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <nav className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <img
              src="/timbangan-upl/logo.svg"
              alt="Logo UPL"
              className="h-8 sm:h-10 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="text-sm sm:text-lg md:text-xl font-bold text-gray-900 leading-tight">
                BARANG MASUK
              </span>
              <span className="text-xs sm:text-sm font-semibold text-blue-600 leading-tight">
                UPL
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-6 lg:space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
            
            {/* Push Notification Button */}
            {isSupported && (
              <button
                onClick={handleSubscribe}
                disabled={isSubscribed || loading}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isSubscribed 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                )}
                title={isSubscribed ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
              >
                {isSubscribed ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {loading ? 'Memproses...' : isSubscribed ? 'Notifikasi Aktif' : 'Aktifkan Notif'}
              </button>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 w-64 bg-white shadow-2xl z-50 md:hidden transform transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <img
              src="/timbangan-upl/logo.svg"
              alt="Logo UPL"
              className="h-8 w-auto object-contain"
            />
            <span className="text-lg font-bold text-gray-900">Menu</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Mobile Menu Items */}
        <div className="py-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-6 py-4 text-base font-medium transition-colors border-l-4',
                  pathname === item.href
                    ? 'text-blue-600 bg-blue-50 border-blue-600'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 border-transparent'
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
          
          {/* Mobile Push Notification Button */}
          {isSupported && (
            <button
              onClick={handleSubscribe}
              disabled={isSubscribed || loading}
              className={cn(
                'w-full flex items-center gap-3 px-6 py-4 text-base font-medium transition-colors border-l-4',
                isSubscribed 
                  ? 'text-green-600 bg-green-50 border-green-600' 
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50 border-transparent'
              )}
            >
              {isSubscribed ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
              {loading ? 'Memproses...' : isSubscribed ? 'Notifikasi Aktif' : 'Aktifkan Notif'}
            </button>
          )}
        </div>

        {/* Mobile Menu Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Aplikasi Pencatatan Penimbangan
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">
            Limbah Plastik UPL
          </p>
        </div>
      </div>
    </nav>
  );
}