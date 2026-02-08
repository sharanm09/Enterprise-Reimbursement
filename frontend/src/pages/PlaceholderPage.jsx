import React from 'react';
import PropTypes from 'prop-types';
import { 
  FiBriefcase, 
  FiDollarSign, 
  FiFolder, 
  FiFileText, 
  FiPlus, 
  FiCheckCircle, 
  FiList, 
  FiShoppingBag, 
  FiClipboard, 
  FiBarChart2,
  FiInfo
} from 'react-icons/fi';

const iconMap = {
  'FiBriefcase': FiBriefcase,
  'FiDollarSign': FiDollarSign,
  'FiFolder': FiFolder,
  'FiFileText': FiFileText,
  'FiPlus': FiPlus,
  'FiCheckCircle': FiCheckCircle,
  'FiList': FiList,
  'FiShoppingBag': FiShoppingBag,
  'FiClipboard': FiClipboard,
  'FiBarChart2': FiBarChart2,
  'FiInfo': FiInfo
};

const PlaceholderPage = ({ title, icon }) => {
  const IconComponent = iconMap[icon] || FiInfo;

  return (
    <div className="space-y-4 min-h-[64px]">
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
        <h1 className="text-sm font-semibold text-gray-800">
          {title}
        </h1>
        <p className="text-xs text-gray-600 mt-0.5">This page is currently under development and will be available in the next phase.</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200 text-center">
        <div className="flex justify-center mb-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <IconComponent className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        <h2 className="text-xs font-semibold text-gray-800 mb-1">Coming Soon</h2>
        <p className="text-xs text-gray-600">
          This feature will be available in the next phase.
        </p>
      </div>
    </div>
  );
};


PlaceholderPage.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
};

PlaceholderPage.propTypes = {
  title: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired
};

export default PlaceholderPage;

