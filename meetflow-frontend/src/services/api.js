
import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
    headers: {
        "Content-Type": "application/json"
    },
    withCredentials: true
});

// Prevent multiple refresh requests at the same time
let refreshPromise = null;

// Attach access token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("accessToken");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Handle expired access tokens
api.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 403) {
            console.error("Access forbidden:", error.response.data);
            return Promise.reject(error);
        }

        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest.url?.includes("/api/auth/login") &&
            !originalRequest.url?.includes("/api/auth/register") &&
            !originalRequest.url?.includes("/api/auth/refresh") &&
            !originalRequest.url?.includes("/api/auth/logout")
        ) {
            originalRequest._retry = true;

            try {
                // Share one refresh request between concurrent API calls
                if (!refreshPromise) {
                    refreshPromise = api.post("/api/auth/refresh")
                        .then((response) => {
                            const newAccessToken = response.data.accessToken;

                            if (!newAccessToken) {
                                throw new Error("Refresh response did not contain an access token");
                            }

                            localStorage.setItem("accessToken", newAccessToken);

                            return newAccessToken;
                        })
                        .finally(() => {
                            refreshPromise = null;
                        });
                }

                const newAccessToken = await refreshPromise;

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                // Retry the original failed request
                return api(originalRequest);

            } catch (refreshError) {
                localStorage.removeItem("accessToken");

                console.error("Session expired. Please log in again.");

                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
