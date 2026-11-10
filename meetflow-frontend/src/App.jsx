
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CreateMeeting from "./pages/CreateMeeting";
import JoinMeeting from "./pages/JoinMeeting";
import MeetingRoom from "./pages/MeetingRoom";

// Checks whether the user is logged in
const isAuthenticated = () => {
    return Boolean(localStorage.getItem("accessToken"));
};

// Protects routes that require authentication
const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

// Redirects logged-in users away from login/register
const PublicRoute = ({ children }) => {
    if (isAuthenticated()) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* Default route */}
                <Route
                    path="/"
                    element={
                        <Navigate
                            to={isAuthenticated() ? "/dashboard" : "/login"}
                            replace
                        />
                    }
                />

                {/* Authentication routes */}
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />

                <Route
                    path="/register"
                    element={
                        <PublicRoute>
                            <Register />
                        </PublicRoute>
                    }
                />

                {/* Dashboard */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                {/* Create Meeting */}
                <Route
                    path="/meetings/create"
                    element={
                        <ProtectedRoute>
                            <CreateMeeting />
                        </ProtectedRoute>
                    }
                />

                {/* Join Meeting */}
                <Route
                    path="/meetings/join"
                    element={
                        <ProtectedRoute>
                            <JoinMeeting />
                        </ProtectedRoute>
                    }
                />

                {/* Unknown routes */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to={isAuthenticated() ? "/dashboard" : "/login"}
                            replace
                        />
                    }
                />

                <Route
                    path="/meetings/room/:meetingId"
                    element={
                        <ProtectedRoute>
                            <MeetingRoom />
                        </ProtectedRoute>
                    }
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
