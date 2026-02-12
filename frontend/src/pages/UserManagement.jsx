import React, { useState, useEffect } from 'react';
import axios from 'axios';
import logger from '../utils/logger';
import { FiUsers, FiMail, FiPlus, FiX, FiEdit2, FiTrash2, FiUpload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchManagers();
    fetchDepartments();
  }, []);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    displayName: '',
    email: '',
    roleId: '',
    managerId: '',
    bankAccountNo: '',
    employeeId: '',
    ifscCode: '',
    isIciciBank: false,
    departmentId: '',
    costCenter: '',
    location: ''
  });

  const [departments, setDepartments] = useState([]);

  const [editingUser, setEditingUser] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|csv)$/)) {
      alert('Please select an Excel (.xlsx) or CSV (.csv) file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.post(`${apiUrl}/auth/users/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      });

      if (response.data.success) {
        setImportSummary(response.data.summary);
        fetchUsers(); // Refresh list
      }
    } catch (error) {
      logger.error('Error importing users:', error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        alert('Your session has expired or you do not have permission. Please log in again.');
      } else {
        alert(error.response?.data?.message || 'Failed to import users');
      }
    } finally {
      setLoading(false);
      // Reset input
      e.target.value = null;
    }
  };

  const closeSummaryModal = () => {
    setImportSummary(null);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.REACT_APP_API_URL;

      if (editingUser) {
        // Update existing user
        const response = await axios.put(
          `${apiUrl}/auth/users/${editingUser.id}`,
          {
            displayName: newUser.displayName,
            email: newUser.email,
            bankAccountNo: newUser.bankAccountNo,
            employeeId: newUser.employeeId,
            ifscCode: newUser.ifscCode,
            isIciciBank: newUser.isIciciBank,
            departmentId: newUser.departmentId,
            costCenter: newUser.costCenter,
            location: newUser.location
          },
          { withCredentials: true }
        );

        if (response.data.success) {
          setShowAddUserModal(false);
          setEditingUser(null);
          setNewUser({ displayName: '', email: '', roleId: '', managerId: '', bankAccountNo: '' });
          fetchUsers();
          setTimeout(() => {
            alert('User updated successfully');
          }, 100);
        }
      } else {
        // Create new user
        const response = await axios.post(
          `${apiUrl}/auth/users`,
          newUser,
          { withCredentials: true }
        );
        if (response.data.success) {
          alert('User created successfully');
          setShowAddUserModal(false);
          setNewUser({ displayName: '', email: '', roleId: '', managerId: '', bankAccountNo: '' });
          fetchUsers();
        }
      }
    } catch (error) {
      logger.error('Error saving user:', error);
      alert(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleCreateUser = handleSaveUser; // Keep compatibility if needed, but we used handleSaveUser in form

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.delete(`${apiUrl}/auth/users/${userId}`, {
        withCredentials: true
      });

      if (response.data.success) {
        alert('User deleted successfully');
        fetchUsers();
      }
    } catch (error) {
      logger.error('Error deleting user:', error);
      alert(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setNewUser({
      displayName: user.displayName,
      email: user.email,
      roleId: user.roleId || (user.role ? user.role.id : ''),
      managerId: user.managerId || '',
      bankAccountNo: user.bankAccountNo || '',
      employeeId: user.employeeId || '',
      ifscCode: user.ifscCode || '',
      isIciciBank: user.isIciciBank || false,
      departmentId: user.departmentId || '',
      costCenter: user.costCenter || '',
      location: user.location || ''
    });
    setShowAddUserModal(true);
  };

  const openAddModal = () => {
    setEditingUser(null);
    setNewUser({
      displayName: '',
      email: '',
      roleId: '',
      managerId: '',
      bankAccountNo: '',
      employeeId: '',
      ifscCode: '',
      isIciciBank: false,
      departmentId: '',
      costCenter: '',
      location: ''
    });
    setShowAddUserModal(true);
  };

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

  const fetchDepartments = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/master-data/departments`, {
        withCredentials: true
      });
      console.log('Departments response:', response.data);
      if (response.data.success) {
        setDepartments(response.data.departments || response.data.data || []);
      } else if (Array.isArray(response.data)) {
        setDepartments(response.data);
      }
    } catch (error) {
      logger.error('Error fetching departments:', error);
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

      <div className="flex justify-end">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx, .csv"
          className="hidden"
        />
        <button
          onClick={handleImportClick}
          className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium shadow-sm mr-2"
        >
          <FiUpload className="w-3.5 h-3.5" />
          <span>Import User</span>
        </button>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium shadow-sm"
        >
          <FiPlus className="w-3.5 h-3.5" />
          <span>Add User</span>
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Emp ID</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Current Role</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Change Role</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Dept</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Manager</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Change Manager</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Bank A/C No</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">IFSC</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Center</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Loc</th>
                <th className="text-left py-1.5 px-2 text-[9px] font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <div className="text-[10px] text-gray-900">{user.employeeId || '-'}</div>
                  </td>
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
                    <div className="text-[10px] text-gray-600">
                      {departments.find(d => d.id === user.departmentId)?.name || '-'}
                    </div>
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
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <div className="text-[10px] text-gray-600">{user.bankAccountNo || '-'}</div>
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <div className="text-[10px] text-gray-600">{user.ifscCode || '-'}</div>
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <div className="text-[10px] text-gray-600">{user.costCenter || '-'}</div>
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <div className="text-[10px] text-gray-600">{user.location || '-'}</div>
                  </td>
                  <td className="py-1.5 px-2 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit User"
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete User"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>


      {/* Add User Modal */}
      {
        showAddUserModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">{editingUser ? 'Edit User' : 'Add New User'}</h3>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveUser} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={newUser.employeeId}
                    onChange={(e) => setNewUser({ ...newUser, employeeId: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="EMP001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="john@example.com"
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Role *</label>
                    <select
                      required
                      value={newUser.roleId}
                      onChange={(e) => setNewUser({ ...newUser, roleId: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Select Role</option>
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>{role.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}

                {!editingUser && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Manager</label>
                    <select
                      value={newUser.managerId}
                      onChange={(e) => setNewUser({ ...newUser, managerId: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    >
                      <option value="">Select Manager</option>
                      {managers.map(manager => (
                        <option key={manager.id} value={manager.id}>{manager.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
                  <select
                    value={newUser.departmentId}
                    onChange={(e) => setNewUser({ ...newUser, departmentId: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Bank Account No</label>
                  <input
                    type="text"
                    value={newUser.bankAccountNo}
                    onChange={(e) => setNewUser({ ...newUser, bankAccountNo: e.target.value })}
                    className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter Bank Account Number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={newUser.ifscCode}
                      onChange={(e) => setNewUser({ ...newUser, ifscCode: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="IFSC"
                    />
                  </div>
                  <div className="flex items-center mt-6">
                    <input
                      type="checkbox"
                      id="isIciciBank"
                      checked={newUser.isIciciBank}
                      onChange={(e) => setNewUser({ ...newUser, isIciciBank: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isIciciBank" className="ml-2 block text-xs text-gray-900">
                      ICICI Bank Account
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cost Center</label>
                    <input
                      type="text"
                      value={newUser.costCenter}
                      onChange={(e) => setNewUser({ ...newUser, costCenter: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Cost Center"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={newUser.location}
                      onChange={(e) => setNewUser({ ...newUser, location: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Location"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    className="px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                  >
                    {editingUser ? 'Update User' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Import Summary Modal */}
      {importSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900 flex items-center">
                <FiCheckCircle className="text-green-500 mr-2" />
                Import Summary
              </h3>
              <button
                onClick={closeSummaryModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
                  <div className="text-xs text-blue-600 uppercase font-semibold mb-1">Total</div>
                  <div className="text-xl font-bold text-blue-800">{importSummary.totalRows}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center border border-green-100">
                  <div className="text-xs text-green-600 uppercase font-semibold mb-1">Inserted</div>
                  <div className="text-xl font-bold text-green-800">{importSummary.inserted}</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg text-center border border-amber-100">
                  <div className="text-xs text-amber-600 uppercase font-semibold mb-1">Updated</div>
                  <div className="text-xl font-bold text-amber-800">{importSummary.updated}</div>
                </div>
                <div className="bg-red-50 p-3 rounded-lg text-center border border-red-100">
                  <div className="text-xs text-red-600 uppercase font-semibold mb-1">Failed</div>
                  <div className="text-xl font-bold text-red-800">{importSummary.failed}</div>
                </div>
              </div>

              {importSummary.errors && importSummary.errors.length > 0 && (
                <div className="border rounded-lg overflow-hidden border-gray-200">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-700 flex items-center">
                      <FiAlertCircle className="text-red-500 mr-1.5" />
                      Failed Rows Details
                    </h4>
                  </div>
                  <div className="max-h-60 overflow-y-auto bg-gray-50/50">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Row</th>
                          <th className="px-4 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">Error</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {importSummary.errors.map((err, idx) => (
                          <tr key={idx} className="hover:bg-red-50/30">
                            <td className="px-4 py-2 text-[10px] text-gray-900 font-medium whitespace-nowrap w-16">
                              Row {err.row}
                            </td>
                            <td className="px-4 py-2 text-[10px] text-red-600">
                              {err.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={closeSummaryModal}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
