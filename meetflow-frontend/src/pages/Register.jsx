
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        password: "",
        role: "ATTENDEE"
    });

    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (form.password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        setLoading(true);

        try {
            await api.post("/api/auth/register", form);
            navigate("/login", {
                state: { message: "Registration successful. Please sign in." }
            });
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Unable to create account."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card register-card">

                <h1>MeetFlow</h1>
                <p className="subtitle">
                    Create your account and start collaborating.
                </p>

                <form onSubmit={handleSubmit}>
                    <label>Full name</label>
                    <input
                        type="text"
                        name="fullName"
                        placeholder="Enter your full name"
                        value={form.fullName}
                        onChange={handleChange}
                        required
                    />

                    <label>Email address</label>
                    <input
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        value={form.email}
                        onChange={handleChange}
                        required
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        name="password"
                        placeholder="Create a password"
                        value={form.password}
                        onChange={handleChange}
                        minLength={8}
                        required
                    />

                    <label>Confirm password</label>
                    <input
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />

                    <label>Account role</label>
                    <select
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                    >
                        <option value="ATTENDEE">Attendee</option>
                        <option value="DEVELOPER">Developer</option>
                    </select>

                    {error && (
                        <p className="error-message">{error}</p>
                    )}

                    <button type="submit" disabled={loading}>
                        {loading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account?{" "}
                    <Link to="/login">Sign in</Link>
                </p>
            </div>
        </div>
    );
}
