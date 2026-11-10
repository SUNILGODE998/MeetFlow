
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../services/auth";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await loginUser(email, password);
            navigate("/dashboard");
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Invalid email or password. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>MeetFlow</h1>
                <p className="subtitle">Welcome back. Sign in to continue.</p>

                <form onSubmit={handleLogin}>
                    <label>Email address</label>
                    <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" disabled={loading}>
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account? <Link to="/register">Create account</Link>
                </p>
            </div>
        </div>
    );
}

export default Login;
