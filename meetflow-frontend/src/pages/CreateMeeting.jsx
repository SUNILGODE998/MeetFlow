
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Video,
    CalendarDays,
    Lock,
    Users,
    ArrowLeft,
    LoaderCircle,
    ShieldCheck
} from "lucide-react";

import {
    createMeeting,
    startMeeting
} from "../services/meeting";

import "../styles/CreateMeeting.css";

function CreateMeeting() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: "",
        description: "",
        meetingType: "INSTANT",
        scheduledAt: "",
        password: "",
        waitingRoomEnabled: true,
        recordingEnabled: false
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        if (!form.title.trim()) {
            setError("Please enter a meeting title.");
            return;
        }

        if (
            form.meetingType === "SCHEDULED" &&
            !form.scheduledAt
        ) {
            setError("Please select a meeting date and time.");
            return;
        }

        setLoading(true);

        try {
            const meetingData = {
                title: form.title.trim(),
                description: form.description.trim(),
                meetingType: form.meetingType,
                scheduledAt:
                    form.meetingType === "SCHEDULED"
                        ? new Date(form.scheduledAt).toISOString()
                        : null,
                password: form.password.trim() || null,
                waitingRoomEnabled: form.waitingRoomEnabled,
                recordingEnabled: form.recordingEnabled
            };

            // Create meeting
            const createdMeeting = await createMeeting(meetingData);

            if (!createdMeeting?.id) {
                throw new Error(
                    "Meeting was created, but the server did not return its ID."
                );
            }

            // Start instant meetings
            if (form.meetingType === "INSTANT") {
                await startMeeting(createdMeeting.id);
            }

            // Navigate to meeting room
            navigate(`/meetings/room/${createdMeeting.id}`);

        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Unable to create meeting."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-meeting-page">

            <header className="create-header">
                <Link to="/dashboard" className="create-back-link">
                    <ArrowLeft size={18} />
                    Dashboard
                </Link>

                <div className="create-brand">
                    <Video size={22} />
                    MeetFlow
                </div>
            </header>

            <main className="create-main">

                <div className="create-heading">
                    <span>MEETFLOW MEETINGS</span>
                    <h1>Create a meeting</h1>
                    <p>
                        Bring your team together with a secure meeting.
                    </p>
                </div>

                <form className="create-card" onSubmit={handleSubmit}>

                    <div className="create-field">
                        <label>Meeting title</label>
                        <input
                            type="text"
                            name="title"
                            placeholder="e.g. Weekly Team Meeting"
                            value={form.title}
                            onChange={handleChange}
                            maxLength={150}
                            required
                        />
                    </div>

                    <div className="create-field">
                        <label>Description</label>
                        <textarea
                            name="description"
                            placeholder="What is this meeting about?"
                            value={form.description}
                            onChange={handleChange}
                            rows={3}
                        />
                    </div>

                    <div className="create-field">
                        <label>Meeting type</label>

                        <div className="meeting-type-options">

                            <button
                                type="button"
                                className={
                                    form.meetingType === "INSTANT"
                                        ? "meeting-type-option selected"
                                        : "meeting-type-option"
                                }
                                onClick={() =>
                                    setForm({
                                        ...form,
                                        meetingType: "INSTANT"
                                    })
                                }
                            >
                                <Video size={22} />
                                <strong>Instant meeting</strong>
                                <span>Start immediately</span>
                            </button>

                            <button
                                type="button"
                                className={
                                    form.meetingType === "SCHEDULED"
                                        ? "meeting-type-option selected"
                                        : "meeting-type-option"
                                }
                                onClick={() =>
                                    setForm({
                                        ...form,
                                        meetingType: "SCHEDULED"
                                    })
                                }
                            >
                                <CalendarDays size={22} />
                                <strong>Schedule meeting</strong>
                                <span>Choose a date and time</span>
                            </button>

                        </div>
                    </div>

                    {form.meetingType === "SCHEDULED" && (
                        <div className="create-field">
                            <label>Meeting date and time</label>

                            <input
                                type="datetime-local"
                                name="scheduledAt"
                                value={form.scheduledAt}
                                min={new Date(
                                    Date.now() -
                                    new Date().getTimezoneOffset() * 60000
                                ).toISOString().slice(0, 16)}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}

                    <div className="create-field">
                        <label>
                            <Lock size={15} />
                            Meeting password (optional)
                        </label>

                        <input
                            type="password"
                            name="password"
                            placeholder="Set a meeting password"
                            value={form.password}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="create-settings">

                        <label className="create-setting">
                            <div>
                                <ShieldCheck size={20} />
                                <span>
                                    <strong>Waiting room</strong>
                                    <small>
                                        Host admits participants
                                    </small>
                                </span>
                            </div>

                            <input
                                type="checkbox"
                                name="waitingRoomEnabled"
                                checked={form.waitingRoomEnabled}
                                onChange={handleChange}
                            />
                        </label>

                        <label className="create-setting">
                            <div>
                                <Users size={20} />
                                <span>
                                    <strong>Enable recording</strong>
                                    <small>
                                        Save recording preference
                                    </small>
                                </span>
                            </div>

                            <input
                                type="checkbox"
                                name="recordingEnabled"
                                checked={form.recordingEnabled}
                                onChange={handleChange}
                            />
                        </label>

                    </div>

                    {error && (
                        <div className="create-error">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="create-submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <LoaderCircle className="create-spin" size={18} />
                                Creating meeting...
                            </>
                        ) : (
                            <>
                                <Video size={18} />
                                {form.meetingType === "INSTANT"
                                    ? "Create Instant Meeting"
                                    : "Schedule Meeting"}
                            </>
                        )}
                    </button>

                </form>

            </main>
        </div>
    );
}

export default CreateMeeting;
