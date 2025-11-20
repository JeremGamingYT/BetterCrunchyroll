import React, { useEffect, useState } from 'react';
import { Search, User, ChevronDown, Bell, Menu } from 'lucide-react';

interface NavbarProps {
  onHomeClick?: () => void;
  onNavigate: (view: string) => void;
  onSearchClick: () => void;
  onNotificationsClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onHomeClick, onNavigate, onSearchClick, onNotificationsClick }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'New', hasDropdown: false },
    { name: 'Popular', hasDropdown: false },
    { name: 'Simulcast', hasDropdown: false },
    { name: 'Category', hasDropdown: true },
    { name: 'Manga', hasDropdown: false },
    { name: 'Games', hasDropdown: false },
    { name: 'Shop', hasDropdown: false },
    { name: 'News', hasDropdown: false },
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 transition-all duration-500 ${
        scrolled 
          ? 'bg-black/70 backdrop-blur-xl border-b border-white/5 py-3' 
          : 'bg-gradient-to-b from-black/80 to-transparent py-5'
      }`}
    >
      <div className="flex items-center gap-8 xl:gap-12">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={onHomeClick}
        >
          <svg 
            className="h-6 sm:h-8 w-auto fill-current text-white group-hover:text-brand-orange transition-colors duration-300" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 303 52" 
            data-t="crunchyroll-horizontal-svg" 
            aria-hidden="true" 
            role="img"
          >
            <path d="M62.1772 26.0647C62.1772 17.3803 69.1876 10.3699 77.872 10.3699C84.2042 10.3699 89.2693 13.8967 91.8466 19.0081L85.425 22.1742C84.0686 19.2794 81.3094 17.1091 77.872 17.1091C73.1676 17.1091 69.3233 20.9996 69.3233 26.0647C69.3233 31.1299 73.1676 35.0667 77.872 35.0667C81.3094 35.0667 84.0686 32.8963 85.425 30.0015L91.8466 33.1676C89.2693 38.279 84.2042 41.8058 77.872 41.8058C69.1876 41.8058 62.1772 34.7954 62.1772 26.0647Z M94.3376 18.7368H101.077V22.3992C102.298 20.0933 104.197 18.7368 106.506 18.7368H108.405V25.3865H106.188C102.976 25.3865 101.484 27.1499 101.484 30.2728V41.3526H94.3376V18.7368Z M110.754 31.6724V18.7368H117.9V31.6724C117.9 34.1603 119.484 35.6986 121.88 35.6986C124.275 35.6986 125.86 34.1603 125.86 31.6724V18.7368H133.006V31.6724C133.006 37.6871 128.301 41.8027 121.88 41.8027C115.458 41.8027 110.754 37.6871 110.754 31.6724Z M136.4 18.7368H143.41V21.4959C144.995 19.6863 147.208 18.5117 149.789 18.5117C155.307 18.5117 158.926 22.538 158.926 28.3275V41.3526H151.78V28.3275C151.78 25.9291 150.017 24.1195 147.665 24.1195C145.312 24.1195 143.549 25.9291 143.549 28.3275V41.3526H136.403V18.7368H136.4Z M178.691 32.1256L184.526 34.8848C182.671 38.9541 178.647 41.8058 173.761 41.8058C167.158 41.8058 161.864 36.5588 161.864 30.0447C161.864 23.5306 167.158 18.2836 173.761 18.2836C178.691 18.2836 182.717 21.1784 184.573 25.2478L178.694 28.0532C177.926 25.9723 176.024 24.5264 173.764 24.5264C170.78 24.5264 168.517 26.968 168.517 30.0447C168.517 33.1214 170.78 35.563 173.764 35.563C175.981 35.563 177.88 34.1603 178.694 32.1256H178.691Z M186.832 10.8231H193.978V21.4528C195.563 19.6432 197.733 18.5117 200.221 18.5117C205.739 18.5117 209.359 22.538 209.359 28.3275V41.3526H202.213V28.3275C202.213 25.9291 200.449 24.1195 198.097 24.1195C195.745 24.1195 193.981 25.9291 193.981 28.3275V41.3526H186.835V10.8231H186.832Z M222.337 32.215L227.131 18.7368H234.277L225.14 42.7091C223.241 47.6848 220.254 49.8089 215.188 49.8089H211.933V43.5661H215.188C217.134 43.5661 218.129 42.7522 218.672 41.3958L209.67 18.7368H217.312L222.334 32.215H222.337Z M236.087 18.7368H242.826V22.3992C244.047 20.0933 245.946 18.7368 248.255 18.7368H250.154V25.3865H247.938C244.725 25.3865 243.233 27.1499 243.233 30.2728V41.3526H236.087V18.7368Z M251.15 30.0447C251.15 23.5769 256.443 18.2836 263.136 18.2836C269.829 18.2836 275.122 23.5769 275.122 30.0447C275.122 36.5125 269.829 41.8058 263.136 41.8058C256.443 41.8058 251.15 36.5588 251.15 30.0447ZM257.8 30.0447C257.8 33.2108 260.152 35.563 263.136 35.563C266.12 35.563 268.472 33.2108 268.472 30.0447C268.472 26.8786 266.12 24.5264 263.136 24.5264C260.152 24.5264 257.8 26.8786 257.8 30.0447Z M286.427 41.3526C280.502 41.3526 278.06 38.7291 278.06 33.1214V10.8231H285.206V33.1214C285.206 34.3884 285.749 35.1129 287.016 35.1129H288.19V41.3557H286.427V41.3526Z M298.367 41.3526C292.442 41.3526 290 38.7291 290 33.1214V10.8231H297.146V33.1214C297.146 34.3884 297.689 35.1129 298.956 35.1129H300.13V41.3557H298.367V41.3526Z M7.81735 28.8732C7.82968 17.2231 17.2848 7.78652 28.9349 7.79885C40.0886 7.81118 49.2108 16.4771 49.9568 27.4366C49.9846 26.968 50 26.4963 50 26.0247C50.0123 12.7684 39.2809 2.01234 26.0247 2.00001C12.7684 1.98768 2.01234 12.7222 2.00001 25.9753C1.98768 39.2316 12.7222 49.9877 25.9753 50C26.5241 50 27.0667 49.9815 27.6062 49.9476C16.5542 49.2724 7.80502 40.0917 7.81735 28.8732Z M40.3846 29.1846C35.8559 29.1815 32.1873 25.5037 32.1935 20.9749C32.1965 17.4235 34.4594 14.4023 37.6193 13.2647C35.1191 11.9453 32.2705 11.1961 29.2432 11.1931C19.2948 11.1838 11.2208 19.2393 11.2116 29.1877C11.2023 39.136 19.2578 47.21 29.2062 47.2193C39.1545 47.2285 47.2285 39.173 47.2378 29.2216C47.2378 28.0933 47.136 26.9927 46.9387 25.9198C45.4405 27.9021 43.0636 29.1846 40.3846 29.1815V29.1846Z"></path>
          </svg>
        </div>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8 text-sm font-medium text-gray-300">
           {navLinks.map((item) => (
             <div 
              key={item.name} 
              className="group relative cursor-pointer flex items-center gap-1 hover:text-white transition-colors duration-300"
              onClick={() => onNavigate(item.name.toLowerCase())}
             >
                <span className="relative tracking-wide">
                  {item.name}
                  <span className="absolute -bottom-1.5 left-0 w-0 h-0.5 bg-brand-orange transition-all duration-300 group-hover:w-full opacity-0 group-hover:opacity-100"></span>
                </span>
                {item.hasDropdown && (
                  <ChevronDown size={14} className="group-hover:text-brand-orange transition-transform duration-300 group-hover:rotate-180" />
                )}
             </div>
           ))}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-2 sm:gap-4">
           <button 
             className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all"
             onClick={onSearchClick}
           >
             <Search className="w-5 h-5" />
           </button>
           <button 
             className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-all hidden sm:block relative"
             onClick={onNotificationsClick}
           >
             <Bell className="w-5 h-5" />
             <span className="absolute top-2 right-2 w-2 h-2 bg-brand-orange rounded-full border border-black"></span>
           </button>
        </div>
        
        <div className="flex items-center gap-3 cursor-pointer group">
           <div className="w-9 h-9 rounded-full bg-brand-surface overflow-hidden border border-white/10 group-hover:border-brand-orange/50 transition-colors shadow-lg">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                alt="User" 
                className="w-full h-full object-cover"
              />
           </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="lg:hidden p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
};