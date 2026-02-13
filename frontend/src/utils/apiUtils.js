// Shared API utilities with JWT support
import axios from 'axios';
import logger from './logger';

const API_URL = process.env.REACT_APP_API_URL;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // No need to pass refreshToken in body, it's in an httpOnly cookie
        await axios.post(`${API_URL}/auth/refresh-token`, {}, { withCredentials: true });

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token expired or invalid
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export async function apiGet(endpoint, params = {}) {
  try {
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all') {
        urlParams.append(key, value);
      }
    });

    const response = await api.get(`${endpoint}?${urlParams.toString()}`);
    return response.data;
  } catch (error) {
    logger.error(`API GET error for ${endpoint}:`, error);
    throw error;
  }
}

export async function apiPost(endpoint, data) {
  try {
    const response = await api.post(endpoint, data);
    return response.data;
  } catch (error) {
    logger.error(`API POST error for ${endpoint}:`, error);
    throw error;
  }
}

export async function apiPut(endpoint, data) {
  try {
    const response = await api.put(endpoint, data);
    return response.data;
  } catch (error) {
    logger.error(`API PUT error for ${endpoint}:`, error);
    throw error;
  }
}

export async function apiDelete(endpoint) {
  try {
    const response = await api.delete(endpoint);
    return response.data;
  } catch (error) {
    logger.error(`API DELETE error for ${endpoint}:`, error);
    throw error;
  }
}


