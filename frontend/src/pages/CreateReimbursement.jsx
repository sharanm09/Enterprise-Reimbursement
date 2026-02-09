import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import logger from '../utils/logger';
import { FiPlus, FiTrash2, FiSave, FiSend, FiUpload, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const CreateReimbursement = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [projects, setProjects] = useState([]);
  // const [expenseCategories, setExpenseCategories] = useState([]); // Removed as per request

  const [formData, setFormData] = useState({
    department_id: '',
    cost_center_id: '',
    project_id: '',
    description: '',
    status: 'draft'
  });

  const [items, setItems] = useState([
    {
      expense_category_id: '',
      expense_type: '',
      amount: '',
      description: '',
      expense_date: '',
      meal_type: '',
      people_count: '',
      travel_purpose: '',
      lodging_city: '',
      attachments: []
    }
  ]);

  useEffect(() => {
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (formData.department_id) {
      fetchCostCenters(formData.department_id);
    } else {
      setCostCenters([]);
      setFormData(prev => ({ ...prev, cost_center_id: '' }));
    }
  }, [formData.department_id]);

  const fetchMasterData = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const [deptRes, projRes] = await Promise.all([
        axios.get(`${apiUrl}/reimbursements/departments`, { withCredentials: true }),
        axios.get(`${apiUrl}/reimbursements/projects`, { withCredentials: true }),
        // axios.get(`${apiUrl}/reimbursements/expense-categories`, { withCredentials: true }) // Removed
      ]);

      if (deptRes.data.success) setDepartments(deptRes.data.data);
      if (projRes.data.success) setProjects(projRes.data.data);
      // if (catRes.data.success) setExpenseCategories(catRes.data.data);
    } catch (error) {
      logger.error('Error fetching master data:', error);
    }
  };

  const fetchCostCenters = async (departmentId) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const response = await axios.get(`${apiUrl}/reimbursements/cost-centers?department_id=${departmentId}`, { withCredentials: true });
      if (response.data.success) {
        setCostCenters(response.data.data);
      }
    } catch (error) {
      logger.error('Error fetching cost centers:', error);
    }
  };

  const addItem = () => {
    setItems([...items, {
      expense_category_id: '',
      expense_type: '',
      amount: '',
      description: '',
      expense_date: '',
      meal_type: '',
      people_count: '',
      travel_purpose: '',
      lodging_city: '',
      attachments: []
    }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'expense_type') {
      updatedItems[index].meal_type = '';
      updatedItems[index].people_count = '';
      updatedItems[index].travel_purpose = '';
      updatedItems[index].lodging_city = '';
    }

    setItems(updatedItems);
  };

  const handleItemFileChange = (itemIndex, e) => {
    const files = Array.from(e.target.files);
    const updatedItems = [...items];
    updatedItems[itemIndex].attachments = [...(updatedItems[itemIndex].attachments || []), ...files];
    setItems(updatedItems);
    // Reset the input so the same file can be selected again
    e.target.value = '';
  };

  const removeItemAttachment = (itemIndex, fileIndex) => {
    const updatedItems = [...items];
    updatedItems[itemIndex].attachments = updatedItems[itemIndex].attachments.filter((_, i) => i !== fileIndex);
    setItems(updatedItems);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async (status) => {
    if (!formData.department_id || !formData.cost_center_id) {
      alert('Please select Department and Cost Center');
      return;
    }

    const validItems = items.filter(item =>
      item.expense_type && item.amount && item.expense_date
    );

    if (validItems.length === 0) {
      alert('Please add at least one valid expense item');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const formDataToSend = new FormData();

      formDataToSend.append('data', JSON.stringify({
        ...formData,
        status,
        items: validItems.map((item, index) => ({
          ...item,
          amount: Number.parseFloat(item.amount),
          people_count: item.people_count ? Number.parseInt(item.people_count, 10) : null,
          itemIndex: index // Track item index for file mapping
        }))
      }));

      // Append item-specific attachments
      for (const [itemIndex, item] of validItems.entries()) {
        if (item.attachments && item.attachments.length > 0) {
          for (const file of item.attachments) {
            formDataToSend.append(`item_${itemIndex}_attachments`, file);
          }
        }
      }

      const response = await axios.post(
        `${apiUrl}/reimbursements`,
        formDataToSend,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        alert(status === 'draft' ? 'Reimbursement saved as draft' : 'Reimbursement submitted successfully');
        navigate('/my-reimbursements');
      }
    } catch (error) {
      logger.error('Error creating reimbursement:', error);
      alert(error.response?.data?.message || 'Failed to create reimbursement');
    } finally {
      setLoading(false);
    }
  };

  const getConditionalFields = (expenseType, index) => {
    switch (expenseType) {
      case 'Food':
        return (
          <>
            <div>
              <label htmlFor={`meal_type_${index}`} className="text-xs font-medium text-gray-700 mb-0.5 block">Meal Type</label>
              <select
                id={`meal_type_${index}`}
                value={items[index]?.meal_type || ''}
                onChange={(e) => updateItem(index, 'meal_type', e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
              >
                <option value="">Select Meal Type</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snacks">Snacks</option>
              </select>
            </div>
            <div>
              <label htmlFor={`people_count_food_${index}`} className="text-xs font-medium text-gray-700 mb-0.5 block">People Count</label>
              <input
                id={`people_count_food_${index}`}
                type="number"
                min="1"
                value={items[index]?.people_count || ''}
                onChange={(e) => updateItem(index, 'people_count', e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                placeholder="Number of people"
              />
            </div>
          </>
        );
      case 'Travel':
        return (
          <>
            <div>
              <label htmlFor={`travel_purpose_${index}`} className="text-xs font-medium text-gray-700 mb-0.5 block">Travel Purpose</label>
              <input
                id={`travel_purpose_${index}`}
                type="text"
                value={items[index]?.travel_purpose || ''}
                onChange={(e) => updateItem(index, 'travel_purpose', e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                placeholder="Purpose of travel"
              />
            </div>
            <div>
              <label htmlFor={`people_count_accommodation_${index}`} className="text-xs font-medium text-gray-700 mb-0.5 block">Number of People</label>
              <input
                id={`people_count_accommodation_${index}`}
                type="number"
                min="1"
                value={items[index]?.people_count || ''}
                onChange={(e) => updateItem(index, 'people_count', e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                placeholder="Number of people"
              />
            </div>
          </>
        );
      case 'Accommodation':
        return (
          <>
            <div>
              <label htmlFor={`lodging_city_${index}`} className="text-xs font-medium text-gray-700 mb-0.5 block">Lodging City</label>
              <input
                id={`lodging_city_${index}`}
                type="text"
                value={items[index]?.lodging_city || ''}
                onChange={(e) => updateItem(index, 'lodging_city', e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                placeholder="City name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 mb-0.5 block">Number of People</label>
              <input
                type="number"
                min="1"
                value={items[index]?.people_count || ''}
                onChange={(e) => updateItem(index, 'people_count', e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                placeholder="Number of people"
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 min-h-[64px]">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 shadow-sm">
        <h1 className="text-sm font-bold text-slate-800">Create Reimbursement</h1>
        <p className="text-xs text-slate-600 mt-1">Fill in the details below to create a new reimbursement request</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
        <h2 className="text-xs font-semibold text-gray-800 mb-3">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="department_id" className="text-xs font-medium text-gray-700 mb-0.5 block">Department *</label>
            <select
              id="department_id"
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value, cost_center_id: '' })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
              required
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cost_center_id" className="text-xs font-medium text-gray-700 mb-0.5 block">Cost Center *</label>
            <select
              id="cost_center_id"
              value={formData.cost_center_id}
              onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
              disabled={!formData.department_id}
              required
            >
              <option value="">Select Cost Center</option>
              {costCenters.map(cc => (
                <option key={cc.id} value={cc.id}>{cc.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="project_id" className="text-xs font-medium text-gray-700 mb-0.5 block">Project (Optional)</label>
            <select
              id="project_id"
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
            >
              <option value="">Select Project</option>
              {projects.map(proj => (
                <option key={proj.id} value={proj.id}>{proj.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="text-xs font-medium text-gray-700 mb-0.5 block">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
              rows="2"
              placeholder="Additional notes or description"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-800">Expense Items</h2>
          <button
            onClick={addItem}
            className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            <FiPlus className="w-3 h-3" />
            <span>Add Item</span>
          </button>
        </div>

        {items.map((item, index) => (
          <div key={`item-${index}-${item.expense_type || 'new'}`} className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700">Item {index + 1}</span>
              {items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <FiTrash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Expense Category Removed */}

              <div>
                <label htmlFor={`expense_type_${index}`} className="text-xs font-medium text-gray-700 mb-0.5 block">Expense Type *</label>
                <select
                  id={`expense_type_${index}`}
                  value={item.expense_type}
                  onChange={(e) => updateItem(index, 'expense_type', e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="Food">Food</option>
                  <option value="Travel">Travel</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Material">Material</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label htmlFor={`amount_${index}`} className="text-xs font-medium text-gray-700 mb-0.5 block">Amount *</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-xs">₹</span>
                  <input
                    id={`amount_${index}`}
                    type="number"
                    step="1"
                    min="0"
                    value={item.amount}
                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded pl-6 pr-2 py-1 text-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor={`expense_date_${index}`} className="text-xs font-medium text-gray-700 mb-0.5 block">Expense Date *</label>
                <input
                  id={`expense_date_${index}`}
                  type="date"
                  value={item.expense_date}
                  onChange={(e) => updateItem(index, 'expense_date', e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor={`item_description_${index}`} className="text-xs font-medium text-gray-700 mb-0.5 block">Description</label>
                <textarea
                  id={`item_description_${index}`}
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-gray-600"
                  rows="2"
                  placeholder="Item description"
                />
              </div>

              {item.expense_type && (
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {getConditionalFields(item.expense_type, index)}
                </div>
              )}

              {/* Item-specific file upload */}
              <div className="md:col-span-2">
                <label htmlFor={`file_upload_${index}`} className="text-xs font-medium text-gray-700 mb-1 block">Attachments (Receipts/Documents)</label>
                <label htmlFor={`file_upload_${index}`} className="flex items-center justify-center w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <div className="flex flex-col items-center">
                    <FiUpload className="w-3.5 h-3.5 text-gray-600 mb-1" />
                    <span className="text-xs text-gray-600 font-medium">Click to upload files</span>
                    <span className="text-xs text-gray-500">PDF, Images (Max 10MB per file)</span>
                  </div>
                  <input
                    id={`file_upload_${index}`}
                    type="file"
                    multiple
                    onChange={(e) => handleItemFileChange(index, e)}
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  />
                </label>

                {item.attachments && item.attachments.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {item.attachments.map((file, fileIndex) => (
                      <div key={`file-${fileIndex}-${file.name}`} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <FiUpload className="w-3 h-3 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeItemAttachment(index, fileIndex)}
                          className="flex-shrink-0 p-1 text-red-600 hover:text-red-700"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end space-x-2">
        <button
          onClick={() => handleSubmit('draft')}
          disabled={loading}
          className="flex items-center space-x-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium disabled:opacity-50"
        >
          <FiSave className="w-3.5 h-3.5" />
          <span>Save as Draft</span>
        </button>
        <button
          onClick={() => handleSubmit('submitted')}
          disabled={loading}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium disabled:opacity-50"
        >
          <FiSend className="w-3.5 h-3.5" />
          <span>Submit</span>
        </button>
      </div>
    </div>
  );
};


CreateReimbursement.propTypes = {
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

export default CreateReimbursement;

