// Shared API utilities to reduce duplication
import axios from 'axios';
import logger from './logger';

export async function apiGet(endpoint, params = {}) {
  try {
    const apiUrl = process.env.REACT_APP_API_URL;
    const urlParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all') {
        urlParams.append(key, value);
      }
    });

    const response = await axios.get(
      `${apiUrl}${endpoint}?${urlParams.toString()}`,
      { withCredentials: true }
    );

    return response.data;
  } catch (error) {
    logger.error(`API GET error for ${endpoint}:`, error);
    throw error;
  }
}

export async function apiPost(endpoint, data) {
  try {
    const apiUrl = process.env.REACT_APP_API_URL;
    const response = await axios.post(
      `${apiUrl}${endpoint}`,
      data,
      { withCredentials: true }
    );

    return response.data;
  } catch (error) {
    logger.error(`API POST error for ${endpoint}:`, error);
    throw error;
  }
}

export async function apiPut(endpoint, data) {
  try {
    const apiUrl = process.env.REACT_APP_API_URL;
    const response = await axios.put(
      `${apiUrl}${endpoint}`,
      data,
      { withCredentials: true }
    );

    return response.data;
  } catch (error) {
    logger.error(`API PUT error for ${endpoint}:`, error);
    throw error;
  }
}

export async function apiDelete(endpoint) {
  try {
    const apiUrl = process.env.REACT_APP_API_URL;
    const response = await axios.delete(
      `${apiUrl}${endpoint}`,
      { withCredentials: true }
    );

    return response.data;
  } catch (error) {
    logger.error(`API DELETE error for ${endpoint}:`, error);
    throw error;
  }
}


