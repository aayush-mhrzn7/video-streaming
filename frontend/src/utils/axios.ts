import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:4000",
  timeout: 100000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status == 401) {
      // Generate the new  Access token and set it in the new local storage in try catch
    }
  },
);

export default axiosInstance;
