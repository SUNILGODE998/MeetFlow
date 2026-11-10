package com.meetFlow.platform.service;




import com.meetFlow.platform.dto.request.InviteParticipantRequest;
import com.meetFlow.platform.dto.request.JoinMeetingRequest;
import com.meetFlow.platform.dto.response.ParticipantResponse;

import java.util.List;
import java.util.UUID;

public interface MeetingParticipantService {

    ParticipantResponse inviteParticipant(
            UUID meetingId,
            InviteParticipantRequest request,
            String hostEmail
    );

    ParticipantResponse joinMeeting(
            JoinMeetingRequest request,
            String userEmail
    );

    ParticipantResponse admitParticipant(
            UUID meetingId,
            UUID participantId,
            String hostEmail
    );

    ParticipantResponse rejectParticipant(
            UUID meetingId,
            UUID participantId,
            String hostEmail
    );

    ParticipantResponse leaveMeeting(
            UUID meetingId,
            String userEmail
    );

    void removeParticipant(
            UUID meetingId,
            UUID participantId,
            String hostEmail
    );

    List<ParticipantResponse> getParticipants(
            UUID meetingId,
            String requesterEmail
    );

    List<ParticipantResponse> getWaitingParticipants(
            UUID meetingId,
            String hostEmail
    );
}
