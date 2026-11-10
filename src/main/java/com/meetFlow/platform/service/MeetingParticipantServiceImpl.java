
package com.meetFlow.platform.service;

import com.meetFlow.platform.dto.enums.MeetingStatus;
import com.meetFlow.platform.dto.enums.ParticipantRole;
import com.meetFlow.platform.dto.enums.ParticipantStatus;
import com.meetFlow.platform.dto.request.InviteParticipantRequest;
import com.meetFlow.platform.dto.request.JoinMeetingRequest;
import com.meetFlow.platform.dto.request.MeetingParticipant;
import com.meetFlow.platform.dto.response.ParticipantResponse;
import com.meetFlow.platform.entity.Meeting.Meeting;
import com.meetFlow.platform.entity.User.AppUser;
import com.meetFlow.platform.exception.ParticipantException;
import com.meetFlow.platform.repository.MeetingParticipantRepository;
import com.meetFlow.platform.repository.MeetingRepository;
import com.meetFlow.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MeetingParticipantServiceImpl
        implements MeetingParticipantService {

    private final MeetingParticipantRepository participantRepository;
    private final MeetingRepository meetingRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final MeetingEventPublisher eventPublisher;

    @Override
    public ParticipantResponse inviteParticipant(
            UUID meetingId,
            InviteParticipantRequest request,
            String hostEmail
    ) {
        Meeting meeting = findMeeting(meetingId);
        verifyHost(meeting, hostEmail);

        if (meeting.getStatus() == MeetingStatus.ENDED
                || meeting.getStatus() == MeetingStatus.CANCELLED) {
            throw new ParticipantException(
                    "Cannot invite participants to a closed meeting"
            );
        }

        AppUser user = findUser(request.email());

        if (user.getId().equals(meeting.getHost().getId())) {
            throw new ParticipantException(
                    "Host cannot invite themselves"
            );
        }

        MeetingParticipant participant = participantRepository
                .findByMeeting_IdAndUser_Id(meetingId, user.getId())
                .orElse(null);

        if (participant != null) {
            if (participant.getStatus() == ParticipantStatus.JOINED
                    || participant.getStatus() == ParticipantStatus.WAITING
                    || participant.getStatus() == ParticipantStatus.INVITED) {
                throw new ParticipantException(
                        "User is already invited or participating"
                );
            }

            participant.setParticipantRole(ParticipantRole.PARTICIPANT);
            participant.setStatus(ParticipantStatus.INVITED);
            participant.setInvitedAt(Instant.now());
            participant.setJoinedAt(null);
            participant.setLeftAt(null);
        } else {
            participant = MeetingParticipant.builder()
                    .meeting(meeting)
                    .user(user)
                    .participantRole(ParticipantRole.PARTICIPANT)
                    .status(ParticipantStatus.INVITED)
                    .invitedAt(Instant.now())
                    .build();
        }

        return toResponse(participantRepository.save(participant));
    }

    @Override
    public ParticipantResponse joinMeeting(
            JoinMeetingRequest request,
            String userEmail
    ) {
        AppUser user = findUser(userEmail);

        Meeting meeting = meetingRepository
                .findByMeetingCode(request.meetingCode().toUpperCase())
                .orElseThrow(() ->
                        new ParticipantException("Meeting not found"));

        if (meeting.getStatus() == MeetingStatus.ENDED
                || meeting.getStatus() == MeetingStatus.CANCELLED) {
            throw new ParticipantException(
                    "This meeting is no longer available"
            );
        }

        if (meeting.getPasswordHash() != null) {
            if (request.password() == null
                    || !passwordEncoder.matches(
                    request.password(),
                    meeting.getPasswordHash())) {
                throw new ParticipantException(
                        "Invalid meeting password"
                );
            }
        }

        boolean isHost = meeting.getHost().getId().equals(user.getId());

        MeetingParticipant participant = participantRepository
                .findByMeeting_IdAndUser_Id(meeting.getId(), user.getId())
                .orElse(null);

        if (participant != null
                && (participant.getStatus() == ParticipantStatus.JOINED
                || participant.getStatus() == ParticipantStatus.WAITING)) {
            throw new ParticipantException(
                    "You are already in this meeting"
            );
        }

        if (participant != null
                && (participant.getStatus() == ParticipantStatus.REJECTED
                || participant.getStatus() == ParticipantStatus.REMOVED)) {
            throw new ParticipantException(
                    "You are not allowed to rejoin this meeting"
            );
        }

        if (meeting.getStatus() == MeetingStatus.SCHEDULED
                && meeting.getScheduledAt() != null
                && meeting.getScheduledAt().isAfter(Instant.now())) {
            throw new ParticipantException(
                    "This meeting has not started yet"
            );
        }

        ParticipantStatus status =
                (isHost || !meeting.isWaitingRoomEnabled())
                        ? ParticipantStatus.JOINED
                        : ParticipantStatus.WAITING;

        if (participant == null) {
            participant = MeetingParticipant.builder()
                    .meeting(meeting)
                    .user(user)
                    .build();
        }

        participant.setParticipantRole(
                isHost ? ParticipantRole.HOST : ParticipantRole.PARTICIPANT
        );

        participant.setStatus(status);
        participant.setJoinedAt(
                status == ParticipantStatus.JOINED ? Instant.now() : null
        );
        participant.setLeftAt(null);

        ParticipantResponse response =
                toResponse(participantRepository.save(participant));

        String eventType = status == ParticipantStatus.JOINED
                ? "PARTICIPANT_JOINED"
                : "PARTICIPANT_WAITING";

        String message = status == ParticipantStatus.JOINED
                ? user.getFullName() + " joined the meeting"
                : user.getFullName() + " is waiting for admission";

        eventPublisher.publish(
                meeting.getId(),
                eventType,
                response,
                message
        );

        return response;
    }

    @Override
    public ParticipantResponse admitParticipant(
            UUID meetingId,
            UUID participantId,
            String hostEmail
    ) {
        Meeting meeting = findMeeting(meetingId);
        verifyHost(meeting, hostEmail);

        MeetingParticipant participant =
                findParticipant(meetingId, participantId);

        if (participant.getStatus() != ParticipantStatus.WAITING) {
            throw new ParticipantException(
                    "Participant is not in the waiting room"
            );
        }

        participant.setStatus(ParticipantStatus.JOINED);
        participant.setJoinedAt(Instant.now());

        ParticipantResponse response =
                toResponse(participantRepository.save(participant));

        eventPublisher.publish(
                meetingId,
                "PARTICIPANT_ADMITTED",
                response,
                response.fullName() + " was admitted to the meeting"
        );

        return response;
    }

    @Override
    public ParticipantResponse rejectParticipant(
            UUID meetingId,
            UUID participantId,
            String hostEmail
    ) {
        Meeting meeting = findMeeting(meetingId);
        verifyHost(meeting, hostEmail);

        MeetingParticipant participant =
                findParticipant(meetingId, participantId);

        if (participant.getStatus() != ParticipantStatus.WAITING) {
            throw new ParticipantException(
                    "Participant is not in the waiting room"
            );
        }

        participant.setStatus(ParticipantStatus.REJECTED);

        ParticipantResponse response =
                toResponse(participantRepository.save(participant));

        eventPublisher.publish(
                meetingId,
                "PARTICIPANT_REJECTED",
                response,
                response.fullName() + " was rejected"
        );

        return response;
    }

    @Override
    public ParticipantResponse leaveMeeting(
            UUID meetingId,
            String userEmail
    ) {
        AppUser user = findUser(userEmail);

        MeetingParticipant participant = participantRepository
                .findByMeeting_IdAndUser_Id(meetingId, user.getId())
                .orElseThrow(() ->
                        new ParticipantException(
                                "You are not a participant of this meeting"
                        ));

        if (participant.getStatus() != ParticipantStatus.JOINED
                && participant.getStatus() != ParticipantStatus.WAITING) {
            throw new ParticipantException(
                    "You are not currently in this meeting or waiting room"
            );
        }

        participant.setStatus(ParticipantStatus.LEFT);
        participant.setLeftAt(Instant.now());

        ParticipantResponse response =
                toResponse(participantRepository.save(participant));

        eventPublisher.publish(
                meetingId,
                "PARTICIPANT_LEFT",
                response,
                user.getFullName() + " left the meeting"
        );

        return response;
    }

    @Override
    public void removeParticipant(
            UUID meetingId,
            UUID participantId,
            String hostEmail
    ) {
        Meeting meeting = findMeeting(meetingId);
        verifyHost(meeting, hostEmail);

        MeetingParticipant participant =
                findParticipant(meetingId, participantId);

        if (participant.getParticipantRole() == ParticipantRole.HOST) {
            throw new ParticipantException(
                    "The host cannot be removed"
            );
        }

        if (participant.getStatus() == ParticipantStatus.REMOVED) {
            throw new ParticipantException(
                    "Participant is already removed"
            );
        }

        participant.setStatus(ParticipantStatus.REMOVED);
        participant.setLeftAt(Instant.now());

        MeetingParticipant saved =
                participantRepository.save(participant);

        eventPublisher.publish(
                meetingId,
                "PARTICIPANT_REMOVED",
                toResponse(saved),
                saved.getUser().getFullName() + " was removed from the meeting"
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParticipantResponse> getParticipants(
            UUID meetingId,
            String requesterEmail
    ) {
        Meeting meeting = findMeeting(meetingId);
        AppUser requester = findUser(requesterEmail);

        boolean isHost = meeting.getHost().getId()
                .equals(requester.getId());

        boolean isParticipant = participantRepository
                .existsByMeeting_IdAndUser_Id(
                        meetingId,
                        requester.getId()
                );

        if (!isHost && !isParticipant) {
            throw new ParticipantException(
                    "You do not have access to this meeting"
            );
        }

        return participantRepository
                .findByMeeting_IdOrderByCreatedAtAsc(meetingId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ParticipantResponse> getWaitingParticipants(
            UUID meetingId,
            String hostEmail
    ) {
        Meeting meeting = findMeeting(meetingId);
        verifyHost(meeting, hostEmail);

        return participantRepository
                .findByMeeting_IdAndStatusOrderByCreatedAtAsc(
                        meetingId,
                        ParticipantStatus.WAITING
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private Meeting findMeeting(UUID meetingId) {
        return meetingRepository.findById(meetingId)
                .orElseThrow(() ->
                        new ParticipantException("Meeting not found"));
    }

    private AppUser findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ParticipantException("User not found"));
    }

    private MeetingParticipant findParticipant(
            UUID meetingId,
            UUID participantId
    ) {
        MeetingParticipant participant = participantRepository
                .findById(participantId)
                .orElseThrow(() ->
                        new ParticipantException("Participant not found"));

        if (!participant.getMeeting().getId().equals(meetingId)) {
            throw new ParticipantException(
                    "Participant does not belong to this meeting"
            );
        }

        return participant;
    }

    private void verifyHost(Meeting meeting, String email) {
        String hostEmail = meeting.getHost().getEmail();

        System.out.println("=== PARTICIPANT HOST VERIFICATION ===");
        System.out.println("Meeting ID: " + meeting.getId());
        System.out.println("Authenticated email: [" + email + "]");
        System.out.println("Host email: [" + hostEmail + "]");

        if (email == null || email.isBlank()
                || hostEmail == null
                || !hostEmail.trim().equalsIgnoreCase(email.trim())) {
            throw new ParticipantException(
                    "Only the meeting host can perform this action"
            );
        }
    }

    private ParticipantResponse toResponse(
            MeetingParticipant participant
    ) {
        AppUser user = participant.getUser();

        return new ParticipantResponse(
                participant.getId(),
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                participant.getParticipantRole(),
                participant.getStatus(),
                participant.getInvitedAt(),
                participant.getJoinedAt(),
                participant.getLeftAt()
        );
    }
}
