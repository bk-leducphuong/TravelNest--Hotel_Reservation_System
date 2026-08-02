// src/services/http.js
import axios from 'axios'
import { getAccessToken } from './keycloak.service'

const API_PREFIX = '/api/v1'
const configuredBaseURL = (import.meta.env.VITE_SERVER_HOST || '').replace(/\/$/, '')

export const apiBaseURL = configuredBaseURL.endsWith(API_PREFIX)
  ? configuredBaseURL
  : `${configuredBaseURL}${API_PREFIX}`

const http = axios.create({
  baseURL: apiBaseURL,
  timeout: 30000,
  withCredentials: false
})

async function attachBearerToken(config) {
  const token = await getAccessToken().catch(() => null)

  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
}

http.interceptors.request.use(attachBearerToken)
axios.interceptors.request.use(attachBearerToken)

http.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config || {}

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const token = await getAccessToken(0).catch(() => null)
      if (token) {
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${token}`
        return http(originalRequest)
      }
    }

    return Promise.reject(error)
  }
)

export default http
