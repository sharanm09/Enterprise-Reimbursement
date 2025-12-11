import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import { FiUsers, FiMail } from 'react-icons/fi';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchManagers();
  }, []);

  const fetchUsers = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/auth/users`, {
        withCredentials: true
      });
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      logger.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/auth/roles`, {
        withCredentials: true
      });
      if (response.data.success) {
        setRoles(response.data.roles);
      }
    } catch (error) {
      logger.error('Error fetching roles:', error);
    }
  };

  const fetchManagers = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/auth/users`, {
        withCredentials: true
      });
      if (response.data.success) {
        const managerRoles = ['manager', 'hr', 'superadmin'];
        const managerUsers = response.data.users.filter(user => 
          user.role && managerRoles.includes(user.role.name.toLowerCase())
        );
        setManagers(managerUsers);
      }
    } catch (error) {
      logger.error('Error fetching managers:', error);
    }
  };

  const handleRoleChange = async (userId, roleId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.put(
        `${apiUrl}/auth/users/${userId}/role`,
        { roleId },
        { withCredentials: true }
      );
      if (response.data.success) {
        await fetchUsers();
        await fetchManagers();
      }
    } catch (error) {
      logger.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const handleManagerChange = async (userId, managerId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.put(
        `${apiUrl}/auth/users/${userId}/manager`,
        { managerId: managerId || null },
        { withCredentials: true }
      );
      if (response.data.success) {
        await fetchUsers();
      }
    } catch (error) {
      logger.error('Error updating user manager:', error);
      alert('Failed to update user manager');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[10px] text-gray-500 animate-pulse">Loading...</div>
      </div>
    );
  }

  const getRoleStatusColor = (roleName) => {
    if (!roleName) return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300';
    
    switch (roleName.toLowerCase()) {
      case 'superadmin':
        return 'bg-gradient-to-r from-slate-100 to-blue-100 text-slate-700 border border-slate-300';
      case 'finance':
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200';
      case 'hr':
        return 'bg-gradient-to-r from-cyan-100 to-blue-100 text-cyan-700 border border-cyan-200';
      case 'manager':
        return 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 border border-emerald-200';
      case 'employee':
        return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200';
      default:
        return 'bg-gradient-to-r from-slate-100 to-blue-100 text-slate-700 border border-slate-300';
    }
  };

  return (
    <div className="space-y-4 min-h-[64px]">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 shadow-sm">
        <h1 className="text-sm font-bold text-slate-800">User Management</h1>
        <p className="text-xs text-slate-600 mt-1">Manage user roles and permissions</p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Current Role</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Change Role</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Manager</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Change Manager</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr 
                  key={user.id} 
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <div className="text-[10px] text-gray-900 font-medium">{user.displayName}</div>
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <div className="text-[10px] text-gray-600">{user.email}</div>
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    {user.role ? (
                      <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getRoleStatusColor(user.role.name)}`}>
                        {user.role.displayName}
                      </span>
                    ) : (
                      <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded ${getRoleStatusColor(null)}`}>
                        No Role
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <select
                      value={user.roleId || ''}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className="text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.displayName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    {user.managerName ? (
                      <div>
                        <div className="text-[10px] text-gray-900 font-medium">{user.managerName}</div>
                        <div className="text-[9px] text-gray-500">{user.managerEmail}</div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-500">No Manager</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <select
                      value={user.managerId || ''}
                      onChange={(e) => handleManagerChange(user.id, e.target.value)}
                      className="text-[9px] border border-gray-300 rounded px-2 py-1 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">No Manager</option>
                      {managers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.displayName} ({manager.role?.displayName || 'No Role'})
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
