
import api from "./api";

export const loginUser = async (email, password) => {
    const response = await api.post("/api/auth/login", {
        email,
        password
    });

    const { accessToken } = response.data;

    if (!accessToken) {
        throw new Error("Login response did not contain an access token");
    }

    localStorage.setItem("accessToken", accessToken);

    return response.data;
};


export const logoutUser = async () => {
    try {
        await api.post("/api/auth/logout");
    } finally {
        localStorage.removeItem("accessToken");
    }
};

