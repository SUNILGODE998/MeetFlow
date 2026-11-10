
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Video, Lock, ArrowRight, Users, CalendarDays,
    ShieldCheck, LoaderCircle, CheckCircle2
} from "lucide-react";

import {
    getMeetingByCode,
    getMeetingParticipants,
    joinMeeting,
    leaveMeeting
} from "../services/meeting";

import "../styles/JoinMeeting.css";

function getCurrentUserEmail() {
    try {
        const token = localStorage.getItem("accessToken");
        if (!token) return localStorage.getItem("userEmail") || "";

        const payload = token.split(".")[1];
        const decoded = JSON.parse(
            atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        );

        return decoded.sub || decoded.email || "";
    } catch {
        return localStorage.getItem("userEmail") || "";
    }
}

function JoinMeeting() {
    const navigate = useNavigate();

    const [meetingCode, setMeetingCode] = useState("");
    const [password, setPassword] = useState("");
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(false);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState("");
    const [waiting, setWaiting] = useState(false);
    const [waitingStatus, setWaitingStatus] = useState("WAITING");

    const currentEmail = getCurrentUserEmail();

    const getErrorMessage = (err) =>
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Something went wrong.";

    const handleFindMeeting = async (e) => {
        e.preventDefault();

        if (!meetingCode.trim()) {
            setError("Please enter a meeting code.");
            return;
        }

        setLoading(true);
        setError("");
        setMeeting(null);
        setWaiting(false);

        try {
            const result = await getMeetingByCode(meetingCode.trim());
            setMeeting(result);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleJoinMeeting = async () => {
        if (!meeting) return;

        setJoining(true);
        setError("");

        try {
            const result = await joinMeeting(meetingCode.trim(), password);
            const status = String(result?.status || "").toUpperCase();

            if (status === "WAITING") {
                setWaitingStatus("WAITING");
                setWaiting(true);
                return;
            }

            if (status === "JOINED") {
                navigate(`/meetings/room/${meeting.id}`);
                return;
            }

            setError(`Unexpected join response status: ${status || "unknown"}.`);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setJoining(false);
        }
    };

    // Check whether the host has admitted or rejected this user.
    useEffect(() => {
        if (!waiting || !meeting?.id) return;

        let active = true;

        const checkStatus = async () => {
            try {
                const data = await getMeetingParticipants(meeting.id);
                const participants = Array.isArray(data) ? data : [];

                const me = participants.find(
                    p => p.email?.toLowerCase() === currentEmail.toLowerCase()
                );

                if (!active || !me) return;

                if (me.status === "JOINED") {
                    navigate(`/meetings/room/${meeting.id}`);
                } else if (me.status === "REJECTED" || me.status === "REMOVED") {
                    setWaitingStatus(me.status);
                    setWaiting(false);
                    setError("The host did not admit you to this meeting.");
                } else if (me.status === "LEFT") {
                    setWaitingStatus("LEFT");
                    setWaiting(false);
                    setError("You are no longer in the waiting room.");
                }
            } catch (err) {
                console.error("Waiting room status check failed:", err);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 3000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [waiting, meeting, currentEmail, navigate]);

    const handleCancelWaiting = async () => {
        try {
            await leaveMeeting(meeting.id);
            setWaiting(false);
            setWaitingStatus("LEFT");
            setError("You left the waiting room.");
        } catch (err) {
            setError(getErrorMessage(err));
        }
    };

    const formatDate = (date) => {
        if (!date) return "Not scheduled";

        return new Date(date).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short"
        });
    };

    return (
        <div className="join-page">
            <nav className="join-navbar">
                <Link to="/dashboard" className="join-brand">
                    <div className="join-brand-icon">
                        <Video size={22} />
                    </div>
                    <span>MeetFlow</span>
                </Link>

                <Link to="/dashboard" className="join-back-link">
                    Back to Dashboard
                </Link>
            </nav>

            <main className="join-main">
                <div className="join-heading">
                    <div className="join-heading-icon">
                        <Video size={28} />
                    </div>

                    <span className="join-eyebrow">CONNECT WITH YOUR TEAM</span>
                    <h1>Join a meeting</h1>
                    <p>Enter the meeting code shared by your host.</p>
                </div>

                <div className="join-card">
                    {!waiting && (
                        <>
                            <form onSubmit={handleFindMeeting}>
                                <label htmlFor="meetingCode">Meeting code</label>

                                <input
                                    id="meetingCode"
                                    type="text"
                                    placeholder="Enter meeting code"
                                    value={meetingCode}
                                    onChange={(e) => {
                                        setMeetingCode(e.target.value);
                                        setMeeting(null);
                                        setError("");
                                    }}
                                    required
                                />

                                <p className="join-input-hint">
                                    Ask your host for the meeting code.
                                </p>

                                {!meeting && (
                                    <button
                                        type="submit"
                                        className="join-primary-button"
                                        disabled={loading}
                                    >
                                        {loading
                                            ? <><LoaderCircle className="spin" size={18} /> Finding meeting...</>
                                            : <>Find meeting <ArrowRight size={18} /></>}
                                    </button>
                                )}
                            </form>

                            {meeting && (
                                <div className="meeting-preview">
                                    <div className="meeting-preview-header">
                                        <div>
                                            <span className="preview-label">MEETING FOUND</span>
                                            <h2>{meeting.title}</h2>
                                        </div>
                                        <div className="preview-status">{meeting.status}</div>
                                    </div>

                                    {meeting.description && (
                                        <p className="preview-description">{meeting.description}</p>
                                    )}

                                    <div className="preview-details">
                                        <div className="preview-detail">
                                            <Users size={18} />
                                            <div>
                                                <span>Host</span>
                                                <strong>{meeting.hostName || "Meeting host"}</strong>
                                            </div>
                                        </div>

                                        <div className="preview-detail">
                                            <CalendarDays size={18} />
                                            <div>
                                                <span>Scheduled</span>
                                                <strong>{formatDate(meeting.scheduledAt)}</strong>
                                            </div>
                                        </div>

                                        <div className="preview-detail">
                                            <ShieldCheck size={18} />
                                            <div>
                                                <span>Security</span>
                                                <strong>
                                                    {meeting.passwordProtected
                                                        ? "Password protected"
                                                        : "No password required"}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    {meeting.passwordProtected && (
                                        <div className="join-password-field">
                                            <label htmlFor="meetingPassword">
                                                <Lock size={15} /> Meeting password
                                            </label>
                                            <input
                                                id="meetingPassword"
                                                type="password"
                                                placeholder="Enter meeting password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="join-primary-button"
                                        onClick={handleJoinMeeting}
                                        disabled={joining}
                                    >
                                        {joining
                                            ? <><LoaderCircle className="spin" size={18} /> Joining meeting...</>
                                            : <>Join meeting <ArrowRight size={18} /></>}
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {waiting && (
                        <div className="join-success-card">
                            <div className="success-icon">
                                <Users size={32} />
                            </div>

                            <h2>You're in the waiting room</h2>
                            <p>
                                Your request has been sent. Please wait while the host admits you.
                            </p>

                            <div className="waiting-live-status">
                                <LoaderCircle className="spin" size={18} />
                                Waiting for host approval...
                            </div>

                            <div className="success-meeting-info">
                                <strong>{meeting?.title}</strong>
                                <span>Meeting code: {meetingCode}</span>
                            </div>

                            <button
                                type="button"
                                className="join-secondary-button"
                                onClick={handleCancelWaiting}
                            >
                                Cancel and leave waiting room
                            </button>
                        </div>
                    )}

                    {error && <div className="join-error">{error}</div>}
                </div>

                <div className="join-footer">
                    <Lock size={14} />
                    Your meetings are protected with secure authentication.
                </div>
            </main>
        </div>
    );
}

export default JoinMeeting;
