
package com.meetFlow.platform.service;

import com.meetFlow.platform.dto.enums.MeetingStatus;
import com.meetFlow.platform.dto.enums.MeetingType;
import com.meetFlow.platform.dto.enums.ParticipantRole;
import com.meetFlow.platform.dto.enums.ParticipantStatus;
import com.meetFlow.platform.dto.request.MeetingParticipant;
import com.meetFlow.platform.dto.response.MeetingResponse;
import com.meetFlow.platform.entity.Meeting.CreateMeetingRequest;
import com.meetFlow.platform.entity.Meeting.Meeting;
import com.meetFlow.platform.entity.Meeting.UpdateMeetingRequest;
import com.meetFlow.platform.entity.User.AppUser;
import com.meetFlow.platform.exception.MeetingAccessDeniedException;
import com.meetFlow.platform.exception.MeetingNotFoundException;
import com.meetFlow.platform.repository.MeetingParticipantRepository;
import com.meetFlow.platform.repository.MeetingRepository;
import com.meetFlow.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class MeetingServiceImpl implements MeetingService {

    private final MeetingRepository meetingRepository;
    private final UserRepository appUserRepository;
    private final MeetingParticipantRepository participantRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String CODE_CHARACTERS =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    public MeetingResponse createMeeting(
            CreateMeetingRequest request,
            String email
    ) {
        AppUser host = findUser(email);

        MeetingType type = request.meetingType();

        Instant scheduledAt;

        if (type == MeetingType.INSTANT) {
            scheduledAt = Instant.now();
        } else {
            scheduledAt = request.scheduledAt();

            if (scheduledAt == null || !scheduledAt.isAfter(Instant.now())) {
                throw new IllegalArgumentException(
                        "Scheduled meeting time must be in the future"
                );
            }
        }

        String passwordHash = null;

        if (request.password() != null && !request.password().isBlank()) {
            passwordHash = passwordEncoder.encode(request.password());
        }

        Meeting meeting = Meeting.builder()
                .roomId(UUID.randomUUID())
                .meetingCode(generateUniqueMeetingCode())
                .title(request.title())
                .description(request.description())
                .host(host)
                .meetingType(type)
                .status(MeetingStatus.SCHEDULED)
                .scheduledAt(scheduledAt)
                .passwordHash(passwordHash)
                .waitingRoomEnabled(
                        request.waitingRoomEnabled() == null
                                || request.waitingRoomEnabled()
                )
                .recordingEnabled(
                        Boolean.TRUE.equals(request.recordingEnabled())
                )
                .build();

        Meeting savedMeeting = meetingRepository.save(meeting);

        Instant now = Instant.now();

        MeetingParticipant hostParticipant = MeetingParticipant.builder()
                .meeting(savedMeeting)
                .user(host)
                .participantRole(ParticipantRole.HOST)
                .status(ParticipantStatus.JOINED)
                .invitedAt(now)
                .joinedAt(now)
                .build();

        participantRepository.save(hostParticipant);

        return toResponse(savedMeeting);
    }

    @Override
    @Transactional(readOnly = true)
    public MeetingResponse getMeeting(UUID id) {
        return toResponse(findMeeting(id));
    }

    @Override
    @Transactional(readOnly = true)
    public MeetingResponse getMeetingByCode(String code) {
        Meeting meeting = meetingRepository
                .findByMeetingCode(code.toUpperCase())
                .orElseThrow(() ->
                        new MeetingNotFoundException("Meeting not found"));

        return toResponse(meeting);
    }

    @Override
    public MeetingResponse updateMeeting(
            UUID id,
            UpdateMeetingRequest request,
            String email
    ) {
        Meeting meeting = findMeeting(id);

        verifyHost(meeting, email);

        if (meeting.getStatus() == MeetingStatus.LIVE
                || meeting.getStatus() == MeetingStatus.ENDED
                || meeting.getStatus() == MeetingStatus.CANCELLED) {
            throw new IllegalStateException(
                    "This meeting can no longer be updated"
            );
        }

        if (request.title() != null) {
            meeting.setTitle(request.title());
        }

        if (request.description() != null) {
            meeting.setDescription(request.description());
        }

        if (request.scheduledAt() != null) {
            if (!request.scheduledAt().isAfter(Instant.now())) {
                throw new IllegalArgumentException(
                        "Meeting time must be in the future"
                );
            }

            meeting.setScheduledAt(request.scheduledAt());
        }

        if (request.waitingRoomEnabled() != null) {
            meeting.setWaitingRoomEnabled(request.waitingRoomEnabled());
        }

        if (request.recordingEnabled() != null) {
            meeting.setRecordingEnabled(request.recordingEnabled());
        }

        return toResponse(meetingRepository.save(meeting));
    }

    @Override
    public void cancelMeeting(UUID id, String email) {
        Meeting meeting = findMeeting(id);

        verifyHost(meeting, email);

        if (meeting.getStatus() == MeetingStatus.LIVE
                || meeting.getStatus() == MeetingStatus.ENDED) {
            throw new IllegalStateException(
                    "A live or ended meeting cannot be cancelled"
            );
        }

        if (meeting.getStatus() == MeetingStatus.CANCELLED) {
            throw new IllegalStateException(
                    "Meeting is already cancelled"
            );
        }

        meeting.setStatus(MeetingStatus.CANCELLED);
        meetingRepository.save(meeting);
    }

    @Override
    public MeetingResponse startMeeting(UUID id, String email) {
        Meeting meeting = findMeeting(id);

        verifyHost(meeting, email);

        if (meeting.getStatus() != MeetingStatus.SCHEDULED) {
            throw new IllegalStateException(
                    "Only scheduled meetings can be started"
            );
        }

        Instant now = Instant.now();

        if (meeting.getMeetingType() == MeetingType.SCHEDULED
                && meeting.getScheduledAt() != null
                && meeting.getScheduledAt().isAfter(now)) {
            throw new IllegalStateException(
                    "This meeting is scheduled for a later time"
            );
        }

        meeting.setStatus(MeetingStatus.LIVE);
        meeting.setStartedAt(now);

        return toResponse(meetingRepository.save(meeting));
    }

    @Override
    public MeetingResponse endMeeting(UUID id, String email) {
        Meeting meeting = findMeeting(id);

        verifyHost(meeting, email);

        if (meeting.getStatus() != MeetingStatus.LIVE) {
            throw new IllegalStateException(
                    "Only live meetings can be ended"
            );
        }

        meeting.setStatus(MeetingStatus.ENDED);
        meeting.setEndedAt(Instant.now());

        return toResponse(meetingRepository.save(meeting));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MeetingResponse> getMyMeetings(String email) {
        AppUser user = findUser(email);

        return meetingRepository
                .findByHost_IdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<MeetingResponse> getUpcomingMeetings(String email) {
        AppUser user = findUser(email);

        return meetingRepository
                .findByHost_IdAndStatusAndScheduledAtAfterOrderByScheduledAtAsc(
                        user.getId(),
                        MeetingStatus.SCHEDULED,
                        Instant.now()
                )
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private Meeting findMeeting(UUID id) {
        return meetingRepository.findById(id)
                .orElseThrow(() ->
                        new MeetingNotFoundException("Meeting not found"));
    }

    private AppUser findUser(String email) {
        return appUserRepository.findByEmail(email)
                .orElseThrow(() ->
                        new MeetingNotFoundException(
                                "Authenticated user not found"
                        ));
    }

    private void verifyHost(Meeting meeting, String email) {
        String hostEmail = meeting.getHost().getEmail();

        System.out.println("=== MEETING HOST VERIFICATION ===");
        System.out.println("Meeting ID: " + meeting.getId());
        System.out.println("Authenticated email: [" + email + "]");
        System.out.println("Host email: [" + hostEmail + "]");

        if (email == null || email.isBlank()
                || hostEmail == null
                || !hostEmail.trim().equalsIgnoreCase(email.trim())) {
            throw new MeetingAccessDeniedException(
                    "Only the meeting host can perform this operation"
            );
        }
    }

    private String generateUniqueMeetingCode() {
        String code;

        do {
            StringBuilder builder = new StringBuilder(10);

            for (int i = 0; i < 10; i++) {
                int index = RANDOM.nextInt(CODE_CHARACTERS.length());
                builder.append(CODE_CHARACTERS.charAt(index));
            }

            code = builder.toString();

        } while (meetingRepository.findByMeetingCode(code).isPresent());

        return code;
    }

    private MeetingResponse toResponse(Meeting meeting) {
        AppUser host = meeting.getHost();

        return new MeetingResponse(
                meeting.getId(),
                meeting.getRoomId(),
                meeting.getMeetingCode(),
                meeting.getTitle(),
                meeting.getDescription(),
                host.getId(),
                host.getFullName(),
                host.getEmail(),
                meeting.getMeetingType(),
                meeting.getStatus(),
                meeting.getScheduledAt(),
                meeting.getStartedAt(),
                meeting.getEndedAt(),
                meeting.getPasswordHash() != null,
                meeting.isWaitingRoomEnabled(),
                meeting.isRecordingEnabled(),
                meeting.getCreatedAt()
        );
    }
}
