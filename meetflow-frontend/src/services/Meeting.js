
import api from "./api";

// ==========================================
// MEETING MANAGEMENT
// ==========================================

// Create a meeting
export const createMeeting = async (meetingData) => {
    const response = await api.post(
        "/api/meetings",
        meetingData
    );

    return response.data;
};

// Get meetings created by the logged-in user
export const getMyMeetings = async () => {
    const response = await api.get(
        "/api/meetings/my"
    );

    return response.data;
};

// Get upcoming meetings
export const getUpcomingMeetings = async () => {
    const response = await api.get(
        "/api/meetings/upcoming"
    );

    return response.data;
};

// Get meeting by ID
export const getMeetingById = async (meetingId) => {
    const response = await api.get(
        `/api/meetings/${meetingId}`
    );

    return response.data;
};

// Find meeting using meeting code
export const getMeetingByCode = async (code) => {
    const response = await api.get(
        `/api/meetings/code/${encodeURIComponent(code)}`
    );

    return response.data;
};

// Start meeting - host only
export const startMeeting = async (meetingId) => {
    const response = await api.post(
        `/api/meetings/${meetingId}/start`
    );

    return response.data;
};

// End meeting - host only
export const endMeeting = async (meetingId) => {
    const response = await api.post(
        `/api/meetings/${meetingId}/end`
    );

    return response.data;
};


// ==========================================
// PARTICIPANT MANAGEMENT
// ==========================================

// Join meeting using meeting code
export const joinMeeting = async (meetingCode, password) => {
    const response = await api.post(
        "/api/meetings/join",
        {
            meetingCode,
            password: password || null
        }
    );

    return response.data;
};

// Get all participants
export const getMeetingParticipants = async (meetingId) => {
    const response = await api.get(
        `/api/meetings/${meetingId}/participants`
    );

    return response.data;
};

// Get participants currently in the waiting room
export const getWaitingParticipants = async (meetingId) => {
    const response = await api.get(
        `/api/meetings/${meetingId}/participants/waiting`
    );

    return response.data;
};

// Invite a registered participant
export const inviteParticipant = async (meetingId, email) => {
    const response = await api.post(
        `/api/meetings/${meetingId}/participants/invite`,
        { email }
    );

    return response.data;
};

// Admit a waiting participant - host only
export const admitParticipant = async (meetingId, participantId) => {
    const response = await api.post(
        `/api/meetings/${meetingId}/participants/${participantId}/admit`
    );

    return response.data;
};

// Reject a waiting participant - host only
export const rejectParticipant = async (meetingId, participantId) => {
    const response = await api.post(
        `/api/meetings/${meetingId}/participants/${participantId}/reject`
    );

    return response.data;
};

// Remove a participant - host only
export const removeParticipant = async (meetingId, participantId) => {
    const response = await api.delete(
        `/api/meetings/${meetingId}/participants/${participantId}`
    );

    return response.data;
};

// Leave meeting
export const leaveMeeting = async (meetingId) => {
    const response = await api.post(
        `/api/meetings/${meetingId}/leave`
    );

    return response.data;
};

