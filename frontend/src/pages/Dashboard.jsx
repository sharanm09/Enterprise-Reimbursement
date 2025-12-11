import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  FiFileText, 
  FiCheckCircle, 
  FiXCircle,
  FiUsers, 
  FiBriefcase, 
  FiDollarSign, 
  FiFolder,
  FiCalendar,
  FiX,
  FiSearch,
  FiPlus,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';
import axios from 'axios';
import logger from '../utils/logger';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const Dashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    cards: [],
    activity: {
      reimbursements: 0,
      pending: 0,
      approved: 0
    },
    recentReimbursements: [],
    pendingApprovals: []
  });
  const [chartData, setChartData] = useState({
    monthlyTrend: [],
    statusDistribution: [],
    departmentWise: [],
    amountTrend: [],
    weeklyTrend: [],
    dailyData: [],
    categoryWise: []
  });
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');

  useEffect(() => {
    fetchDashboardStats();
    fetchChartData();
  }, [user, dateRangeStart, dateRangeEnd]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.REACT_APP_API_URL;
      
      const params = new URLSearchParams();
      if (dateRangeStart) params.append('startDate', dateRangeStart);
      if (dateRangeEnd) params.append('endDate', dateRangeEnd);
      const queryString = params.toString();
      const urlSuffix = queryString ? `?${queryString}` : '';
      
      const cardsResponse = await axios.get(`${apiUrl}/dashboard/stats-cards${urlSuffix}`, { withCredentials: true });
      
      if (cardsResponse.data.success) {
        const statsCards = cardsResponse.data.data || [];
        
        let dashboardStats = {
          cards: [],
          activity: { reimbursements: 0, pending: 0, approved: 0 },
          recentReimbursements: [],
          pendingApprovals: []
        };

        try {
          const statsResponse = await axios.get(`${apiUrl}/dashboard/stats${urlSuffix}`, { withCredentials: true });
          if (statsResponse.data.success) {
            dashboardStats = statsResponse.data.data;
          }
        } catch (statsError) {
          logger.info('Stats API not available, using default values');
        }

        if (statsCards.length > 0) {
          const cardTitles = new Set();
          const updatedCards = [];
          
          dashboardStats.cards?.forEach(dynamicCard => {
            if (!cardTitles.has(dynamicCard.title)) {
              cardTitles.add(dynamicCard.title);
              const staticCard = statsCards.find(c => c.title === dynamicCard.title);
              updatedCards.push({
                ...(staticCard || {}),
                ...dynamicCard,
                value: dynamicCard.value || staticCard?.value || '0',
                subtitle: dynamicCard.subtitle || staticCard?.subtitle || ''
              });
            }
          });

          statsCards.forEach(staticCard => {
            if (!cardTitles.has(staticCard.title)) {
              cardTitles.add(staticCard.title);
              updatedCards.push({
                ...staticCard,
                value: staticCard.value || '0',
                subtitle: staticCard.subtitle || ''
              });
            }
          });

          setStats({
            ...dashboardStats,
            cards: updatedCards
          });
        } else {
          const uniqueCards = [];
          const cardTitles = new Set();
          dashboardStats.cards?.forEach(card => {
            if (!cardTitles.has(card.title)) {
              cardTitles.add(card.title);
              uniqueCards.push(card);
            }
          });
          setStats({
            ...dashboardStats,
            cards: uniqueCards
          });
        }
      } else {
        setStats({
          cards: [],
          activity: { reimbursements: 0, pending: 0, approved: 0 },
          recentReimbursements: [],
          pendingApprovals: []
        });
      }
    } catch (error) {
      logger.error('Error fetching dashboard stats', error);
      setStats({
        cards: [],
        activity: { reimbursements: 0, pending: 0, approved: 0 },
        recentReimbursements: [],
        pendingApprovals: []
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const params = new URLSearchParams();
      if (dateRangeStart) params.append('startDate', dateRangeStart);
      if (dateRangeEnd) params.append('endDate', dateRangeEnd);
      const queryString = params.toString();
      const urlSuffix = queryString ? `?${queryString}` : '';
      
      const response = await axios.get(`${apiUrl}/dashboard/charts${urlSuffix}`, { withCredentials: true });
      if (response.data.success) {
        setChartData(response.data.data);
      }
    } catch (error) {
      logger.error('Error fetching chart data', error);
    }
  };

  const clearDateRange = () => {
    setDateRangeStart('');
    setDateRangeEnd('');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1'];
  const PURPLE_COLORS = ['#8b5cf6', '#6366f1', '#a855f7', '#9333ea', '#7c3aed', '#6d28d9'];

  const iconMap = {
    'FiFileText': FiFileText,
    'FiCheckCircle': FiCheckCircle,
    'FiXCircle': FiXCircle,
    'FiUsers': FiUsers,
    'FiBriefcase': FiBriefcase,
    'FiDollarSign': FiDollarSign,
    'FiFolder': FiFolder,
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change).toFixed(1), isPositive: change >= 0 };
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'paid':
      case 'approved_by_finance':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200';
      case 'pending':
      case 'approved_by_manager':
      case 'approved_by_hr':
        return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200';
      case 'rejected':
      case 'rejected_by_finance':
      case 'rejected_by_hr':
      case 'rejected_by_manager':
        return 'bg-gradient-to-r from-red-100 to-rose-100 text-red-700 border border-red-200';
      default:
        return 'bg-gradient-to-r from-slate-100 to-blue-100 text-slate-700 border border-slate-300';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Calculate totals for key metrics with safe defaults
  const monthlyTrend = chartData.monthlyTrend || [];
  const statusDistribution = chartData.statusDistribution || [];
  const departmentWise = chartData.departmentWise || [];
  const weeklyTrend = chartData.weeklyTrend || [];
  const dailyData = chartData.dailyData || [];
  const categoryWise = chartData.categoryWise || [];

  const totalReimbursements = monthlyTrend.reduce((sum, item) => sum + (item.count || 0), 0);
  const totalAmount = monthlyTrend.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalPending = statusDistribution.find(s => s.name === 'Pending')?.value || 0;
  const totalApproved = statusDistribution.find(s => s.name === 'Approved by Finance')?.value || 0;

  // Prepare radar chart data
  const radarData = departmentWise.slice(0, 6).map(dept => ({
    subject: (dept.department || 'N/A').substring(0, 8),
    value: dept.amount || 0,
    fullMark: Math.max(...departmentWise.map(d => d.amount || 0), 1000)
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-sm text-gray-600 animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-slate-800">
              {getGreeting()}, {user?.displayName?.split(' ')[0] || 'User'}! 👋
            </h1>
            <p className="text-xs text-slate-600 mt-1">Role: <span className="font-semibold text-blue-700">{user?.role?.displayName || 'Employee'}</span></p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
              <FiCalendar className="w-4 h-4 text-blue-600" />
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
              <span className="text-[9px] text-gray-500">to</span>
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
              {(dateRangeStart || dateRangeEnd) && (
                <button onClick={clearDateRange} className="ml-2 text-gray-400 hover:text-gray-600">
                  <FiX className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      {stats.cards && stats.cards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stats.cards.map((card, index) => {
            const IconComponent = iconMap[card.icon] || FiFileText;
            const gradientColors = [
              'from-blue-500 to-cyan-500',
              'from-emerald-500 to-teal-500',
              'from-blue-600 to-indigo-600',
              'from-teal-500 to-blue-500',
              'from-sky-500 to-blue-500',
              'from-cyan-500 to-blue-500',
              'from-blue-500 to-indigo-500',
              'from-slate-500 to-blue-500'
            ];
            const gradient = gradientColors[index % gradientColors.length];
            return (
              <div
                key={`${card.title}-${index}`}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-slate-600 mb-2 uppercase tracking-wide">{card.title}</p>
                    <p className="text-lg font-bold text-slate-800 leading-tight">{card.value || '0'}</p>
                    {card.subtitle && (
                      <p className="text-xs text-slate-500 mt-1.5 leading-tight">{card.subtitle}</p>
                    )}
                  </div>
                  <div className="ml-3 flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
                      <IconComponent className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Stacked Bar Chart Widget */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 mb-3">Status Overview</h3>
          {statusDistribution && statusDistribution.length > 0 ? (
            <>
              <div className="flex justify-around mb-2 text-[9px]">
                <span className="text-blue-600">■ {totalReimbursements}</span>
                <span className="text-green-600">■ {totalApproved}</span>
                <span className="text-orange-600">■ {totalPending}</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={statusDistribution.slice(0, 9)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b' }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 8, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ fontSize: '10px', padding: '8px', borderRadius: '8px' }} />
                  <Bar dataKey="value" stackId="a" fill="#3b82f6" />
                  <Bar dataKey="amount" stackId="b" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-gray-500">No data available</div>
          )}
        </div>

        {/* Vertical Bar Chart Widget */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-800 mb-3">Monthly Comparison</h3>
          {monthlyTrend && monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#64748b' }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 8, fill: '#64748b' }} />
                <Tooltip contentStyle={{ fontSize: '10px', padding: '8px', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="amount" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-xs text-gray-500">No data available</div>
          )}
        </div>

      </div>

      {/* Recent Reimbursements and Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Reimbursements */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-800">Recent Reimbursements</h2>
            <select className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            {stats.recentReimbursements && stats.recentReimbursements.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Department</th>
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentReimbursements.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-1.5 px-2 text-[10px] text-gray-900 font-medium">{item.name}</td>
                      <td className="py-1.5 px-2 text-[10px] text-gray-600">{item.date}</td>
                      <td className="py-1.5 px-2 text-[10px] text-gray-600">{item.department_name || 'N/A'}</td>
                      <td className="py-1.5 px-2">
                        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-[10px] font-medium text-gray-900">{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-6 text-[10px] text-gray-500">
                No recent reimbursements found
              </div>
            )}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-800">Pending Approvals</h2>
            <select className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All</option>
              <option>My Team</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            {stats.pendingApprovals && stats.pendingApprovals.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Employee</th>
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Date</th>
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Department</th>
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.pendingApprovals.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-1.5 px-2 text-[10px] text-gray-900 font-medium">{item.name}</td>
                      <td className="py-1.5 px-2 text-[10px] text-gray-600">{item.date}</td>
                      <td className="py-1.5 px-2 text-[10px] text-gray-600">{item.department_name || 'N/A'}</td>
                      <td className="py-1.5 px-2">
                        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-[10px] font-medium text-gray-900">{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-6 text-[10px] text-gray-500">
                No pending approvals found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


Dashboard.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    displayName: PropTypes.string,
    email: PropTypes.string,
    role: PropTypes.shape({
      name: PropTypes.string,
      displayName: PropTypes.string
    })
  }),
};

export default Dashboard;
