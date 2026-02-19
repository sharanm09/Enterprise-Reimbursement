import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiSave, FiPlus, FiTrash2, FiUploadCloud, FiCheck, FiGlobe, FiMapPin, FiBriefcase, FiCreditCard, FiImage, FiActivity } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CompanyMaster = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [companyInfo, setCompanyInfo] = useState({
        companyName: '',
        gstNo: '',
        panNo: '',
        registerOffice: '',
        corporateOffice: '',
        website: '',
        portfolio: ''
    });

    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState(null);
    const [bankAccounts, setBankAccounts] = useState([]);

    const [showAddBankModal, setShowAddBankModal] = useState(false);
    const [newBank, setNewBank] = useState({
        bankName: '',
        accountNumber: '',
        ifsc: '',
        branch: '',
        isDefault: false
    });

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchCompanyDetails();
    }, []);

    const fetchCompanyDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${apiUrl}/company`);
            if (response.data.success) {
                if (response.data.company) {
                    setCompanyInfo({
                        companyName: response.data.company.companyName || '',
                        gstNo: response.data.company.gstNo || '',
                        panNo: response.data.company.panNo || '',
                        registerOffice: response.data.company.registerOffice || '',
                        corporateOffice: response.data.company.corporateOffice || '',
                        website: response.data.company.website || '',
                        portfolio: response.data.company.portfolio || ''
                    });
                    if (response.data.company.logoPath) {
                        // Assuming backend serves uploads at /uploads
                        setLogoPreview(`${process.env.REACT_APP_API_URL?.replace('/api', '')}${response.data.company.logoPath}`);
                    }
                }
                if (response.data.bankAccounts) {
                    setBankAccounts(response.data.bankAccounts);
                }
            }
        } catch (error) {
            console.error('Error fetching company details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInfoChange = (e) => {
        const { name, value } = e.target;
        setCompanyInfo(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogo(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const formData = new FormData();
            Object.keys(companyInfo).forEach(key => {
                formData.append(key, companyInfo[key]);
            });
            if (logo) {
                formData.append('logo', logo);
            }

            const response = await axios.post(`${apiUrl}/company`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                alert('Company details saved successfully!');
                fetchCompanyDetails(); // Refresh to get updated logo path if changed
                // Update logo preview if server returned a path, but file reader preview is faster UI
            }
        } catch (error) {
            console.error('Error saving company details:', error);
            alert('Failed to save details. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddBank = async () => {
        try {
            const response = await axios.post(`${apiUrl}/company/bank-account`, {
                bankName: newBank.bankName,
                accountNumber: newBank.accountNumber,
                ifsc: newBank.ifsc,
                branch: newBank.branch,
                isDefault: newBank.isDefault
            });

            if (response.data.success) {
                setShowAddBankModal(false);
                setNewBank({ bankName: '', accountNumber: '', ifsc: '', branch: '', isDefault: false });
                fetchCompanyDetails(); // Refresh list
            }
        } catch (error) {
            console.error('Error adding bank account:', error);
            alert('Failed to add bank account.');
        }
    };

    const handleDeleteBank = async (id) => {
        if (!window.confirm('Are you sure you want to delete this bank account?')) return;
        try {
            const response = await axios.delete(`${apiUrl}/company/bank-account/${id}`);
            if (response.data.success) {
                fetchCompanyDetails();
            }
        } catch (error) {
            console.error('Error deleting bank account:', error);
        }
    };

    const handleSetDefaultBank = async (id) => {
        try {
            const response = await axios.put(`${apiUrl}/company/bank-account/${id}/default`);
            if (response.data.success) {
                fetchCompanyDetails();
            }
        } catch (error) {
            console.error('Error setting default bank account:', error);
        }
    };

    const statsData = [
        { name: 'Jan', value: 4000 },
        { name: 'Feb', value: 3000 },
        { name: 'Mar', value: 2000 },
        { name: 'Apr', value: 2780 },
        { name: 'May', value: 1890 },
        { name: 'Jun', value: 2390 },
    ];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-6 min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/50">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-white/50 p-6 shadow-lg shadow-indigo-100/50 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-4 z-10 transition-all duration-300 hover:shadow-xl">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">Company Master</h1>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Manage your organization's identity and financial details</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed`}
                >
                    {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                        <FiSave className="w-4 h-4" />
                    )}
                    <span className="font-semibold tracking-wide">{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column - Basic Info & Logo */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Company Information Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-100">
                        <div className="px-8 py-5 border-b border-slate-50 bg-gradient-to-r from-slate-50 to-white flex items-center">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg mr-3">
                                <FiBriefcase className="w-5 h-5" />
                            </div>
                            <h2 className="text-base font-bold text-slate-800">Company Information</h2>
                        </div>

                        <div className="p-8 space-y-8">
                            <div className="flex flex-col md:flex-row items-start gap-8">
                                {/* Logo Upload */}
                                <div className="w-full md:w-auto flex-shrink-0 flex flex-col items-center space-y-3">
                                    <label className="block text-sm font-semibold text-slate-700">Company Logo</label>
                                    <div className="relative group cursor-pointer w-40 h-40">
                                        <div className={`w-40 h-40 rounded-2xl border-2 border-dashed flex items-center justify-center bg-slate-50 transition-all duration-300 overflow-hidden group-hover:border-indigo-400 group-hover:bg-indigo-50 ${logoPreview ? 'border-indigo-200 p-2' : 'border-slate-300'}`}>
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain rounded-xl" />
                                            ) : (
                                                <div className="text-center p-4">
                                                    <div className="bg-white p-3 rounded-full shadow-sm inline-block mb-3 group-hover:scale-110 transition-transform">
                                                        <FiUploadCloud className="w-6 h-6 text-indigo-500" />
                                                    </div>
                                                    <span className="text-xs text-slate-500 font-medium block">Click to upload</span>
                                                    <span className="text-[10px] text-slate-400 block mt-1">PNG, JPG up to 5MB</span>
                                                </div>
                                            )}
                                            {/* Hover Overlay */}
                                            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <FiImage className="text-white w-8 h-8" />
                                            </div>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                                    </div>
                                </div>

                                {/* Basic Fields */}
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Company Name</label>
                                        <input
                                            type="text"
                                            name="companyName"
                                            value={companyInfo.companyName}
                                            onChange={handleInfoChange}
                                            className="w-full text-base border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-indigo-300 bg-slate-50/30 focus:bg-white placeholder:text-slate-400"
                                            placeholder="Enter company name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">GST No.</label>
                                        <input
                                            type="text"
                                            name="gstNo"
                                            value={companyInfo.gstNo}
                                            onChange={handleInfoChange}
                                            className="w-full text-sm border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-indigo-300 bg-slate-50/30 focus:bg-white uppercase placeholder:text-slate-400 font-mono"
                                            placeholder="22AAAAA0000A1Z5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">PAN Number</label>
                                        <input
                                            type="text"
                                            name="panNo"
                                            value={companyInfo.panNo}
                                            onChange={handleInfoChange}
                                            className="w-full text-sm border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-indigo-300 bg-slate-50/30 focus:bg-white uppercase placeholder:text-slate-400 font-mono"
                                            placeholder="ABCDE1234F"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                                <div>
                                    <label className="flex items-center text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                                        <FiMapPin className="mr-1.5 text-indigo-500" /> Registered Office
                                    </label>
                                    <textarea
                                        name="registerOffice"
                                        value={companyInfo.registerOffice}
                                        onChange={handleInfoChange}
                                        rows="4"
                                        className="w-full text-sm border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-indigo-300 bg-slate-50/30 focus:bg-white resize-none placeholder:text-slate-400"
                                        placeholder="Enter registered office address"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                                        <FiMapPin className="mr-1.5 text-indigo-500" /> Corporate Office
                                    </label>
                                    <textarea
                                        name="corporateOffice"
                                        value={companyInfo.corporateOffice}
                                        onChange={handleInfoChange}
                                        rows="4"
                                        className="w-full text-sm border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm hover:border-indigo-300 bg-slate-50/30 focus:bg-white resize-none placeholder:text-slate-400"
                                        placeholder="Enter corporate office address"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bank Accounts Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-50 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
                            <div className="flex items-center">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg mr-3">
                                    <FiCreditCard className="w-5 h-5" />
                                </div>
                                <h2 className="text-base font-bold text-slate-800">Bank Accounts</h2>
                            </div>
                            <button
                                onClick={() => setShowAddBankModal(true)}
                                className="text-xs flex items-center bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors font-semibold border border-emerald-100 hover:shadow-sm"
                            >
                                <FiPlus className="mr-1.5 w-3.5 h-3.5" /> Add Account
                            </button>
                        </div>

                        <div className="p-8">
                            {bankAccounts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {bankAccounts.map((account) => (
                                        <div
                                            key={account.id}
                                            className={`relative group rounded-xl border p-5 transition-all duration-300 hover:shadow-md ${account.isDefault
                                                    ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 shadow-sm'
                                                    : 'bg-white border-slate-100 hover:border-indigo-100'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-sm">{account.bankName}</h3>
                                                    <p className="text-xs text-slate-500 font-medium mt-0.5">{account.branch}</p>
                                                </div>
                                                {account.isDefault && (
                                                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex items-center">
                                                        <FiCheck className="mr-1 w-3 h-3" /> Primary
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-1 mb-4">
                                                <div className="flex justify-between">
                                                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Account No</span>
                                                    <span className="text-xs font-mono text-slate-700">{account.accountNumber}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-[10px] text-slate-400 uppercase font-semibold">IFSC</span>
                                                    <span className="text-xs font-mono text-slate-700">{account.ifsc}</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center pt-3 border-t border-slate-200/50">
                                                <label className="flex items-center cursor-pointer text-xs text-slate-600 hover:text-indigo-600 transition-colors">
                                                    <input
                                                        type="radio"
                                                        name="primaryBank"
                                                        checked={account.isDefault}
                                                        onChange={() => handleSetDefaultBank(account.id)}
                                                        className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                    />
                                                    Set as Primary
                                                </label>
                                                <button
                                                    onClick={() => handleDeleteBank(account.id)}
                                                    className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Delete Account"
                                                >
                                                    <FiTrash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                    <div className="bg-white p-3 rounded-full shadow-sm inline-block mb-3">
                                        <FiCreditCard className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-600">No Bank Accounts</h3>
                                    <p className="text-xs text-slate-400 mt-1">Add a bank account to process reimbursements</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column - Other Info & Stats */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Other Details */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-50 bg-gradient-to-r from-slate-50 to-white flex items-center">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-3">
                                <FiGlobe className="w-5 h-5" />
                            </div>
                            <h2 className="text-base font-bold text-slate-800">Online Presence</h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Website URL</label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        name="website"
                                        value={companyInfo.website}
                                        onChange={handleInfoChange}
                                        className="w-full text-sm border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all shadow-sm hover:border-purple-300 bg-slate-50/30 focus:bg-white placeholder:text-slate-400"
                                        placeholder="https://company.com"
                                    />
                                    <FiGlobe className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">Portfolio / Social</label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        name="portfolio"
                                        value={companyInfo.portfolio}
                                        onChange={handleInfoChange}
                                        className="w-full text-sm border-slate-200 rounded-xl px-4 py-3 pl-10 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all shadow-sm hover:border-purple-300 bg-slate-50/30 focus:bg-white placeholder:text-slate-400"
                                        placeholder="Link"
                                    />
                                    <FiGlobe className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Company Statistics */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-50 bg-gradient-to-r from-slate-50 to-white flex items-center">
                            <div className="p-2 bg-pink-100 text-pink-600 rounded-lg mr-3">
                                <FiActivity className="w-5 h-5" />
                            </div>
                            <h2 className="text-base font-bold text-slate-800">Stats Overview</h2>
                        </div>
                        <div className="p-6 h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748B', fontWeight: 500 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fontSize: 10, fill: '#64748B' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24}>
                                        {statsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={`url(#colorGradient-${index % 2})`} />
                                        ))}
                                    </Bar>
                                    <defs>
                                        <linearGradient id="colorGradient-0" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#6366f1" />
                                            <stop offset="100%" stopColor="#818cf8" />
                                        </linearGradient>
                                        <linearGradient id="colorGradient-1" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#a855f7" />
                                            <stop offset="100%" stopColor="#c084fc" />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Bank Modal */}
            {showAddBankModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-white/50">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <h3 className="text-base font-bold text-slate-800">Add Bank Account</h3>
                            <button
                                onClick={() => setShowAddBankModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1 hover:bg-slate-100"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Bank Name</label>
                                <input
                                    type="text"
                                    value={newBank.bankName}
                                    onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
                                    className="w-full text-sm border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50 focus:bg-white"
                                    placeholder="e.g. HDFC Bank"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Account Number</label>
                                <input
                                    type="text"
                                    value={newBank.accountNumber}
                                    onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
                                    className="w-full text-sm border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50 focus:bg-white"
                                    placeholder="Account Number"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">IFSC Code</label>
                                    <input
                                        type="text"
                                        value={newBank.ifsc}
                                        onChange={(e) => setNewBank({ ...newBank, ifsc: e.target.value })}
                                        className="w-full text-sm border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50 focus:bg-white uppercase"
                                        placeholder="IFSC"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Branch</label>
                                    <input
                                        type="text"
                                        value={newBank.branch}
                                        onChange={(e) => setNewBank({ ...newBank, branch: e.target.value })}
                                        className="w-full text-sm border-slate-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all bg-slate-50/50 focus:bg-white"
                                        placeholder="Branch Name"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center space-x-2 pt-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                                <input
                                    type="checkbox"
                                    id="defaultBank"
                                    checked={newBank.isDefault}
                                    onChange={(e) => setNewBank({ ...newBank, isDefault: e.target.checked })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                />
                                <label htmlFor="defaultBank" className="text-sm font-medium text-indigo-900 cursor-pointer">Set as primary account</label>
                            </div>
                            <div className="pt-4 flex justify-end space-x-3 border-t border-slate-50 mt-2">
                                <button
                                    onClick={() => setShowAddBankModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddBank}
                                    className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-lg shadow-indigo-200"
                                >
                                    Add Account
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompanyMaster;
