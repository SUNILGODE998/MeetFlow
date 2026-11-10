
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    LayoutDashboard,
    CalendarDays,
    History,
    Users,
    Settings,
    Plus,
    Video,
    LogOut,
    Clock,
    RefreshCw,
    ArrowUpRight
} from "lucide-react";

import api from "../services/api";
import "../styles/Dashboard.css";

function Dashboard() {
    const navigate = useNavigate();

    const [meetings, setMeetings] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadMeetings = async () => {
        setLoading(true);
        setError("");

        try {
            const [myResponse, upcomingResponse] = await Promise.all([
                api.get("/api/meetings/my"),
                api.get("/api/meetings/upcoming")
            ]);

            const myData = myResponse.data;
            const upcomingData = upcomingResponse.data;

            setMeetings(
                Array.isArray(myData)
                    ? myData
                    : myData?.content || myData?.data || []
            );

            setUpcoming(
                Array.isArray(upcomingData)
                    ? upcomingData
                    : upcomingData?.content || upcomingData?.data || []
            );
        } catch (err) {
            console.error("Dashboard loading error:", err);

            setError(
                err.response?.data?.message ||
                `Unable to load meetings. ${
                    err.response ? `HTTP ${err.response.status}` : "Check your backend connection."
                }`
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMeetings();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
    };

    const formatDate = (date) => {
        if (!date) return "Not scheduled";

        return new Date(date).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
        });
    };

    const getInitials = (name) => {
        if (!name) return "U";

        return name
            .split(" ")
            .map(part => part[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
    };

    return (
        <div className="dashboard-layout">

            {/* Sidebar */}
            <aside className="dashboard-sidebar">

                <div className="brand">
                    <div className="brand-icon">
                        <Video size={23} />
                    </div>
                    <span>MeetFlow</span>
                </div>

                <div className="sidebar-section">
                    <p className="sidebar-label">WORKSPACE</p>

                    <Link to="/dashboard" className="sidebar-link active">
                        <LayoutDashboard size={19} />
                        <span>Overview</span>
                    </Link>

                    <Link to="/dashboard" className="sidebar-link">
                        <CalendarDays size={19} />
                        <span>My Meetings</span>
                    </Link>

                    <Link to="/dashboard" className="sidebar-link">
                        <History size={19} />
                        <span>Meeting History</span>
                    </Link>

                    <Link to="/dashboard" className="sidebar-link">
                        <Users size={19} />
                        <span>Team Members</span>
                    </Link>
                </div>

                <div className="sidebar-bottom">
                    <Link to="/dashboard" className="sidebar-link">
                        <Settings size={19} />
                        <span>Settings</span>
                    </Link>

                    <button
                        className="sidebar-link logout-button"
                        onClick={handleLogout}
                    >
                        <LogOut size={19} />
                        <span>Log out</span>
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="dashboard-main">

                <header className="dashboard-header">
                    <div>
                        <p className="header-eyebrow">WORKSPACE OVERVIEW</p>
                        <h1>Dashboard</h1>
                        <p className="header-subtitle">
                            Manage your meetings and collaborate with your team.
                        </p>
                    </div>

                    <div className="header-actions">
                        <button
                            className="icon-button"
                            onClick={loadMeetings}
                            title="Refresh meetings"
                        >
                            <RefreshCw size={18} />
                        </button>

                        <div className="user-avatar">U</div>
                    </div>
                </header>

                {/* Welcome banner */}
                <section className="welcome-banner">
                    <div>
                        <span className="welcome-tag">YOUR WORKSPACE</span>
                        <h2>Meet. Collaborate. Achieve.</h2>
                        <p>
                            Everything you need for productive meetings,
                            all in one place.
                        </p>
                    </div>

                    <div className="welcome-icon">
                        <Video size={65} />
                    </div>
                </section>

                {/* Meeting statistics */}
                <section className="stats-grid">

                    <div className="stat-card">
                        <div className="stat-icon purple">
                            <CalendarDays size={21} />
                        </div>
                        <p>Total meetings</p>
                        <h2>{meetings.length}</h2>
                        <span>Meetings in your workspace</span>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon blue">
                            <Clock size={21} />
                        </div>
                        <p>Upcoming meetings</p>
                        <h2>{upcoming.length}</h2>
                        <span>Scheduled meetings</span>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon green">
                            <Video size={21} />
                        </div>
                        <p>Live meetings</p>
                        <h2>
                            {meetings.filter(
                                meeting => meeting.status === "LIVE"
                            ).length}
                        </h2>
                        <span>Currently active</span>
                    </div>

                </section>

                {/* Quick actions */}
                <section className="quick-actions">
                    <div className="section-heading">
                        <div>
                            <h2>Quick actions</h2>
                            <p>Get started with your next meeting.</p>
                        </div>
                    </div>

                    <div className="action-grid">
                        <button
                            className="action-card create-action"
                            onClick={() => navigate("/meetings/create")}
                        >
                            <div className="action-icon">
                                <Plus size={23} />
                            </div>
                            <div>
                                <h3>Create a meeting</h3>
                                <p>Start a new meeting instantly.</p>
                            </div>
                            <ArrowUpRight size={19} />
                        </button>

                        <button
                            className="action-card join-action"
                            onClick={() => navigate("/meetings/join")}
                        >
                            <div className="action-icon">
                                <Video size={23} />
                            </div>
                            <div>
                                <h3>Join a meeting</h3>
                                <p>Enter a meeting code to join.</p>
                            </div>
                            <ArrowUpRight size={19} />
                        </button>
                    </div>
                </section>

                {/* Upcoming meetings */}
                <section className="meetings-section">
                    <div className="section-heading">
                        <div>
                            <h2>Upcoming meetings</h2>
                            <p>Your scheduled meetings at a glance.</p>
                        </div>

                        <button
                            className="text-button"
                            onClick={loadMeetings}
                        >
                            Refresh
                        </button>
                    </div>

                    {loading ? (
                        <div className="empty-state">
                            Loading your meetings...
                        </div>
                    ) : error ? (
                        <div className="error-state">
                            <p>{error}</p>
                            <button onClick={loadMeetings}>
                                Try again
                            </button>
                        </div>
                    ) : upcoming.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <CalendarDays size={30} />
                            </div>
                            <h3>No upcoming meetings</h3>
                            <p>
                                Your scheduled meetings will appear here.
                            </p>
                            <button
                                className="primary-button"
                                onClick={() => navigate("/meetings/create")}
                            >
                                <Plus size={17} />
                                Create your first meeting
                            </button>
                        </div>
                    ) : (
                        <div className="meeting-list">
                            {upcoming.map(meeting => (
                                <div
                                    className="meeting-card"
                                    key={meeting.id}
                                >
                                    <div className="meeting-icon">
                                        <Video size={21} />
                                    </div>

                                    <div className="meeting-info">
                                        <h3>{meeting.title}</h3>
                                        <p>
                                            {formatDate(meeting.scheduledAt)}
                                        </p>
                                        <span>
                                            Host: {meeting.hostName || "Unknown"}
                                        </span>
                                    </div>

                                    <div className="meeting-meta">
                                        <span className={`status ${(
                                            meeting.status || "SCHEDULED"
                                        ).toLowerCase()}`}>
                                            {meeting.status || "SCHEDULED"}
                                        </span>

                                        <span className="meeting-code">
                                            {meeting.meetingCode}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <footer className="dashboard-footer">
                    MeetFlow © 2026. All rights reserved.
                </footer>

            </main>
        </div>
    );
}

export default Dashboard;
