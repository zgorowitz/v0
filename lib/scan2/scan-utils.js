import React from 'react';

export const DetailRow = ({ label, value }) => (
  <div className="flex justify-between items-center py-1">
    <span className="text-gray-600 text-sm">{label}</span>
    <span className="font-medium text-gray-900 text-sm">
      {value || 'No Disponible'}
    </span>
  </div>
);

export const TechDetail = ({ label, value }) => (
  <div className="space-y-1">
    <div className="text-gray-500 font-medium">{label}</div>
    <div className="font-mono text-gray-700 text-xs bg-gray-50 px-2 py-1 rounded">
      {value || 'N/A'}
    </div>
  </div>
);

export const formatVariationAttributes = (attributes) => {
  if (!attributes || typeof attributes !== 'object') return '';
  
  return Object.entries(attributes)
    .map(([key, value]) => {
      if (value && typeof value === 'object' && value.value_name) {
        return `${value.name || key}: ${value.value_name}`;
      }
      return `${key}: ${value}`;
    })
    .join(', ');
};

export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Enhanced vibration patterns
export const vibrationPatterns = {
  scan: [50],
  success: [100, 50, 100],
  error: [200, 100, 200, 100, 200],
  click: [25]
};

export const triggerVibration = (pattern = 'click') => {
  if (navigator.vibrate && vibrationPatterns[pattern]) {
    navigator.vibrate(vibrationPatterns[pattern]);
  }
};