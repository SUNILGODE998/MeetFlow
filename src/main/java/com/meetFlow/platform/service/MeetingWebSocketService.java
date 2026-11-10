package com.meetFlow.platform.service;


import com.meetFlow.platform.dto.enums.ParticipantStatus;
import com.meetFlow.platform.dto.request.MeetingParticipant;
import com.meetFlow.platform.dto.request.PresenceEvent;
import com.meetFlow.platform.dto.request.SignalMessage;
import com.meetFlow.platform.dto.response.ParticipantResponse;
import com.meetFlow.platform.entity.User.AppUser;
import com.meetFlow.platform.exception.ParticipantException;
import com.meetFlow.platform.repository.MeetingParticipantRepository;
import com.meetFlow.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.Principal;
import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MeetingWebSocketService {

    private final MeetingParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MeetingParticipantService participantService;
    private final SimpMessagingTemplate messagingTemplate;

    // =========================================================
    // PARTICIPANT JOINS WEBSOCKET ROOM
    // =========================================================

    public void joinRoom(UUID meetingId, String email) {

        MeetingParticipant participant =
                findJoinedParticipant(meetingId, email);

        AppUser user = participant.getUser();

        PresenceEvent event = new PresenceEvent(
                "JOINED",
                user.getEmail(),
                user.getFullName(),
                Instant.now()
        );

        messagingTemplate.convertAndSend(
                "/topic/meetings/" + meetingId,
                event
        );
    }

    // =========================================================
    // PARTICIPANT LEAVES MEETING
    // =========================================================

    public ParticipantResponse leaveRoom(UUID meetingId, String email) {

        ParticipantResponse response =
                participantService.leaveMeeting(meetingId, email);

        PresenceEvent event = new PresenceEvent(
                "LEFT",
                response.email(),
                response.fullName(),
                Instant.now()
        );

        messagingTemplate.convertAndSend(
                "/topic/meetings/" + meetingId,
                event
        );

        return response;
    }

    // =========================================================
    // SEND WEBRTC SIGNALING MESSAGE
    // =========================================================

    public void sendSignal(
            UUID meetingId,
            String senderEmail,
            SignalMessage message
    ) {

        if (message.targetEmail() == null
                || message.targetEmail().isBlank()) {
            throw new ParticipantException(
                    "Target participant email is required"
            );
        }

        if (message.type() == null || message.payload() == null) {
            throw new ParticipantException(
                    "Signal type and payload are required"
            );
        }

        // Verify sender is admitted to this meeting.
        findJoinedParticipant(meetingId, senderEmail);

        // Verify target is admitted to the same meeting.
        findJoinedParticipant(meetingId, message.targetEmail());

        // Forward signaling message to the target user's private queue.
        SignalMessage outgoingMessage = new SignalMessage(
                senderEmail,
                message.targetEmail(),
                message.type(),
                message.payload()
        );

        messagingTemplate.convertAndSendToUser(
                message.targetEmail(),
                "/queue/signaling",
                outgoingMessage
        );
    }

    // =========================================================
    // VERIFY JOINED PARTICIPANT
    // =========================================================

    private MeetingParticipant findJoinedParticipant(
            UUID meetingId,
            String email
    ) {

        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ParticipantException("User not found"));

        MeetingParticipant participant = participantRepository
                .findByMeeting_IdAndUser_Id(
                        meetingId,
                        user.getId()
                )
                .orElseThrow(() ->
                        new ParticipantException(
                                "You are not a participant of this meeting"
                        ));

        if (participant.getStatus() != ParticipantStatus.JOINED) {
            throw new ParticipantException(
                    "You must be admitted to the meeting first"
            );
        }

        return participant;
    }
}

