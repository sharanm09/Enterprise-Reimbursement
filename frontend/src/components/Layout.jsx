import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  FiLayout, 
  FiUsers, 
  FiBriefcase, 
  FiDollarSign, 
  FiFolder, 
  FiFileText, 
  FiPlus, 
  FiCheckCircle, 
  FiList, 
  FiChevronDown,
  FiLogOut,
  FiMenu,
  FiX
} from 'react-icons/fi';
import bgImage from '../images/bg.png';

const Layout = ({ children, user, onLogout, onNavigate, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const [isManuallyToggled, setIsManuallyToggled] = useState(false);
  const dropdownRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  const toggleSidebar = () => {
    setIsManuallyToggled(true);
    setSidebarOpen(prev => !prev);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
  };

  const handleSidebarMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    if (!sidebarOpen && !isManuallyToggled) {
      setSidebarOpen(true);
    }
  };

  const handleSidebarMouseLeave = () => {
    if (!isManuallyToggled && sidebarOpen) {
      const timeout = setTimeout(() => {
        setSidebarOpen(false);
      }, 200);
      setHoverTimeout(timeout);
    }
  };

  const navigationGroups = [
    {
      name: 'Main',
      roles: ['superadmin', 'finance', 'hr', 'manager', 'employee'],
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: FiLayout, roles: ['superadmin', 'finance', 'hr', 'manager', 'employee'] },
        { name: 'User Management', path: '/users', icon: FiUsers, roles: ['superadmin'] },
      ]
    },
    {
      name: 'Master Data',
      roles: ['superadmin', 'hr'],
      items: [
        { name: 'Departments', path: '/departments', icon: FiBriefcase, roles: ['superadmin', 'hr'] },
        { name: 'Cost Centers', path: '/cost-centers', icon: FiDollarSign, roles: ['superadmin', 'hr'] },
        { name: 'Projects', path: '/projects', icon: FiFolder, roles: ['superadmin', 'hr'] },
      ]
    },
    {
      name: 'Reimbursements',
      roles: ['superadmin', 'finance', 'hr', 'manager', 'employee'],
      items: [
        { name: 'My Reimbursements', path: '/my-reimbursements', icon: FiFileText, roles: ['superadmin', 'finance', 'hr', 'manager', 'employee'] },
        { name: 'Create Reimbursement', path: '/create-reimbursement', icon: FiPlus, roles: ['superadmin', 'employee'] },
        { name: 'Approvals', path: '/superadmin-approvals', icon: FiCheckCircle, roles: ['superadmin'] },
        { name: 'Manager Approvals', path: '/manager-approvals', icon: FiCheckCircle, roles: ['manager'] },
        { name: 'HR Approvals', path: '/hr-approvals', icon: FiCheckCircle, roles: ['hr'] },
        { name: 'Finance Approvals', path: '/finance-approvals', icon: FiCheckCircle, roles: ['finance'] },
        { name: 'All Reimbursements', path: '/all-reimbursements', icon: FiList, roles: ['superadmin', 'hr'] },
      ]
    },
  ];

  const getVisibleNavGroups = () => {
    return navigationGroups
      .map(group => {
        const visibleItems = group.items.filter(item =>
          item.roles.includes(user?.role?.name)
        );
        return { ...group, items: visibleItems };
      })
      .filter(group => group.items.length > 0);
  };

  const visibleNavGroups = getVisibleNavGroups();

  const handleNavigation = (path) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  const isActive = (path) => {
    const pageMap = {
      '/dashboard': 'dashboard',
      '/users': 'users',
      '/departments': 'departments',
      '/cost-centers': 'cost-centers',
      '/projects': 'projects',
      '/my-reimbursements': 'my-reimbursements',
      '/create-reimbursement': 'create-reimbursement',
      '/manager-approvals': 'manager-approvals',
      '/hr-approvals': 'hr-approvals',
      '/finance-approvals': 'finance-approvals',
      '/all-reimbursements': 'all-reimbursements'
    };
    return pageMap[path] === currentPage;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts.at(-1)[0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 flex overflow-hidden">
      <aside 
        ref={sidebarRef}
        className={`${sidebarOpen ? 'w-56' : 'w-18'} bg-white/80 backdrop-blur-lg border-r border-slate-200 transition-all duration-300 ease-in-out flex flex-col h-screen fixed left-0 top-0 z-30 shadow-xl`}
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%)' }}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div className="p-4 flex items-center justify-between border-b border-slate-200 flex-shrink-0 h-16">
          {sidebarOpen && (
            <div className="flex items-center space-x-2.5 flex-1">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-xs">E</span>
              </div>
              <h1 className="text-slate-700 font-bold text-xs tracking-wide">
                Enterprise
              </h1>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center mx-auto shadow-md">
              <span className="text-white font-bold text-xs">E</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`${sidebarOpen ? 'ml-2' : 'mx-auto'} p-1.5 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors`}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <FiX className="w-4 h-4" />
            ) : (
              <FiMenu className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-1">
            {visibleNavGroups.map((group) => (
              <React.Fragment key={group.name}>
                {group.items.map((item) => {
                  const IconComponent = item.icon;
                  const active = isActive(item.path);
                  return (
                    <li key={item.path}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigation(item.path);
                          if (!sidebarOpen) {
                            setIsManuallyToggled(false);
                          }
                        }}
                        className={(() => {
                          const baseClasses = 'w-full flex items-center transition-all duration-200';
                          if (sidebarOpen) {
                            const sidebarClasses = 'space-x-3 px-3 py-2.5 rounded-lg';
                            const activeClasses = active 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' 
                              : 'text-slate-700 hover:bg-blue-50 hover:text-slate-900';
                            return `${baseClasses} ${sidebarClasses} ${activeClasses}`;
                          }
                          const collapsedClasses = 'justify-center px-2 py-2.5 rounded-lg';
                          const activeClasses = active 
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md' 
                            : 'text-slate-700 hover:bg-blue-50 hover:text-slate-900';
                          return `${baseClasses} ${collapsedClasses} ${activeClasses}`;
                        })()}
                      >
                        <IconComponent className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-blue-600'}`} />
                        {sidebarOpen && (
                          <span className={`truncate text-xs font-medium ${active ? 'text-white' : 'text-slate-700'}`}>{item.name}</span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </React.Fragment>
            ))}
          </ul>
        </nav>

      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/90 backdrop-blur-lg flex-shrink-0 h-16 border-b border-slate-200 w-full fixed top-0 left-0 z-40 shadow-md">
          <div className="px-5 py-3 flex items-center justify-between h-full">
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition-colors"
                aria-label="Toggle sidebar"
              >
                <FiMenu className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-[10px]">E</span>
              </div>
              <h1 className="text-slate-700 font-bold text-sm">
                Enterprise Reimbursement
              </h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-2.5 px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                    {getInitials(user?.displayName)}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">{user?.displayName}</div>
                    <div className="text-[10px] text-slate-600 leading-tight">{user?.role?.displayName || 'Employee'}</div>
                  </div>
                  <FiChevronDown className={`w-4 h-4 text-blue-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50 border border-slate-200">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-blue-50 transition-colors flex items-center space-x-2"
                    >
                      <FiLogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden relative" style={{ marginTop: '64px', marginLeft: sidebarOpen ? '224px' : '72px' }}>
          {/* Background image - fixed to viewport, doesn't move with sidebar */}
          <div 
            className="fixed z-0 pointer-events-none"
            style={{
              backgroundImage: `url(${bgImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center center',
              backgroundRepeat: 'no-repeat',
              opacity: '0.5',
              filter: 'brightness(0.9)',
              top: '64px',
              left: '0',
              right: '0',
              bottom: '0',
              width: '100%',
              height: 'calc(100vh - 64px)'
            }}
          />
          {/* Content wrapper */}
          <main className={`flex-1 overflow-y-auto transition-all duration-300 relative z-10`} style={{ padding: '20px', background: 'transparent' }}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  user: PropTypes.shape({
    displayName: PropTypes.string,
    role: PropTypes.shape({
      name: PropTypes.string,
      displayName: PropTypes.string
    })
  }),
  onLogout: PropTypes.func.isRequired,
  onNavigate: PropTypes.func,
  currentPage: PropTypes.string
};

export default Layout;
