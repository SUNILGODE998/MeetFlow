package com.meetFlow.platform.service;

import com.meetFlow.platform.dto.ConsentStatus;
import com.meetFlow.platform.dto.enums.MeetingStatus;
import com.meetFlow.platform.dto.enums.ParticipantStatus;
import com.meetFlow.platform.dto.enums.RecordingStatus;
import com.meetFlow.platform.dto.request.MeetingParticipant;
import com.meetFlow.platform.dto.request.RecordingConsentRequest;
import com.meetFlow.platform.dto.response.RecordingConsentResponse;
import com.meetFlow.platform.dto.response.RecordingResponse;
import com.meetFlow.platform.entity.Meeting.Meeting;
import com.meetFlow.platform.entity.Meeting.RecordingConsent;
import com.meetFlow.platform.entity.Meeting.RecordingSession;
import com.meetFlow.platform.entity.User.AppUser;
import com.meetFlow.platform.repository.MeetingParticipantRepository;
import com.meetFlow.platform.repository.MeetingRepository;
import com.meetFlow.platform.repository.RecordingConsentRepository;
import com.meetFlow.platform.repository.RecordingSessionRepository;
import com.meetFlow.platform.repository.UserRepository;
import com.meetFlow.platform.service.RecordingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class RecordingServiceImpl implements RecordingService {

    private static final List<RecordingStatus> ACTIVE_STATUSES =
            List.of(
                    RecordingStatus.STARTING,
                    RecordingStatus.RECORDING,
                    RecordingStatus.STOPPING
            );

    private final RecordingSessionRepository recordingSessionRepository;
    private final RecordingConsentRepository recordingConsentRepository;
    private final MeetingRepository meetingRepository;
    private final MeetingParticipantRepository participantRepository;
    private final UserRepository userRepository;

    @Override
    public RecordingResponse startRecording(
            UUID meetingId,
            String hostEmail
    ) {
        AppUser host = getUser(hostEmail);

        Meeting meeting = meetingRepository.findById(meetingId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Meeting not found"
                ));

        if (!meeting.getHost().getId().equals(host.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only the meeting host can start recording"
            );
        }

        if (meeting.getStatus() != MeetingStatus.LIVE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Recording can only be requested for a live meeting"
            );
        }

        if (!meeting.isRecordingEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Recording is disabled for this meeting"
            );
        }

        recordingSessionRepository
                .findByMeeting_IdAndStatusIn(meetingId, ACTIVE_STATUSES)
                .ifPresent(session -> {
                    throw new ResponseStatusException(
                            HttpStatus.CONFLICT,
                            "An active recording session already exists"
                    );
                });

        List<MeetingParticipant> joinedParticipants =
                participantRepository
                        .findByMeeting_IdAndStatusOrderByCreatedAtAsc(
                                meetingId,
                                ParticipantStatus.JOINED
                        );

        if (joinedParticipants.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "There are no joined participants to request consent from"
            );
        }

        RecordingSession session = RecordingSession.builder()
                .meeting(meeting)
                .startedBy(host)
                .status(RecordingStatus.STARTING)
                .build();

        session = recordingSessionRepository.save(session);

        for (MeetingParticipant participant : joinedParticipants) {

            RecordingConsent consent = RecordingConsent.builder()
                    .recordingSession(session)
                    .participant(participant)
                    .consentStatus(ConsentStatus.PENDING)
                    .build();

            recordingConsentRepository.save(consent);
        }

        return toResponse(session);
    }

    @Override
    public RecordingResponse respondToConsent(
            UUID recordingSessionId,
            RecordingConsentRequest request,
            String participantEmail
    ) {
        RecordingSession session = getSession(recordingSessionId);

        if (session.getStatus() != RecordingStatus.STARTING
                && session.getStatus() != RecordingStatus.RECORDING) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This recording session is no longer accepting consent"
            );
        }

        AppUser user = getUser(participantEmail);

        MeetingParticipant participant = participantRepository
                .findByMeeting_IdAndUser_Id(
                        session.getMeeting().getId(),
                        user.getId()
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You are not a participant in this meeting"
                ));

        if (participant.getStatus() != ParticipantStatus.JOINED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only currently joined participants can respond"
            );
        }

        RecordingConsent consent = recordingConsentRepository
                .findByRecordingSession_IdAndParticipant_Id(
                        recordingSessionId,
                        participant.getId()
                )
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Consent request not found for this participant"
                ));

        ConsentStatus decision = request.decision();

        if (decision == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Consent decision is required"
            );
        }

        if (decision == ConsentStatus.WITHDRAWN) {

            if (consent.getConsentStatus() != ConsentStatus.GRANTED) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "You can withdraw consent only after granting it"
                );
            }

            consent.setConsentStatus(ConsentStatus.WITHDRAWN);
            consent.setRespondedAt(Instant.now());

            recordingConsentRepository.save(consent);

            // Stop the recording when a participant withdraws consent.
            if (session.getStatus() == RecordingStatus.RECORDING) {
                completeSession(session);
            }

            return toResponse(session);
        }

        if (decision != ConsentStatus.GRANTED
                && decision != ConsentStatus.DENIED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Decision must be GRANTED, DENIED or WITHDRAWN"
            );
        }

        if (consent.getConsentStatus() != ConsentStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You have already responded to this consent request"
            );
        }

        consent.setConsentStatus(decision);
        consent.setRespondedAt(Instant.now());

        recordingConsentRepository.save(consent);

        activateRecordingIfAllGranted(session);

        return toResponse(session);
    }

    private void activateRecordingIfAllGranted(
            RecordingSession session
    ) {
        if (session.getStatus() != RecordingStatus.STARTING) {
            return;
        }

        List<RecordingConsent> consents =
                recordingConsentRepository.findByRecordingSession_Id(
                        session.getId()
                );

        if (consents.isEmpty()) {
            return;
        }

        boolean allGranted = consents.stream()
                .allMatch(consent ->
                        consent.getConsentStatus() == ConsentStatus.GRANTED
                );

        if (!allGranted) {
            return;
        }

        session.setStatus(RecordingStatus.RECORDING);
        session.setStartedAt(Instant.now());

        recordingSessionRepository.save(session);

        /*
         * IMPORTANT:
         * This currently updates the recording lifecycle only.
         * Actual mediasoup audio capture will be connected in the
         * next implementation stage.
         */
    }

    @Override
    public RecordingResponse stopRecording(
            UUID recordingSessionId,
            String hostEmail
    ) {
        RecordingSession session = getSession(recordingSessionId);
        AppUser host = getUser(hostEmail);

        if (!session.getMeeting().getHost().getId().equals(host.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Only the meeting host can stop recording"
            );
        }

        if (session.getStatus() == RecordingStatus.COMPLETED) {
            return toResponse(session);
        }

        if (session.getStatus() == RecordingStatus.FAILED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This recording session has failed"
            );
        }

        completeSession(session);

        return toResponse(session);
    }

    @Override
    @Transactional(readOnly = true)
    public RecordingResponse getRecording(
            UUID recordingSessionId,
            String userEmail
    ) {
        RecordingSession session = getSession(recordingSessionId);
        AppUser user = getUser(userEmail);

        boolean isHost = session.getMeeting()
                .getHost()
                .getId()
                .equals(user.getId());

        boolean isParticipant = participantRepository
                .existsByMeeting_IdAndUser_Id(
                        session.getMeeting().getId(),
                        user.getId()
                );

        if (!isHost && !isParticipant) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You cannot access this recording session"
            );
        }

        return toResponse(session);
    }

    private void completeSession(RecordingSession session) {
        Instant now = Instant.now();

        if (session.getStartedAt() != null) {
            session.setDurationSeconds(
                    Duration.between(session.getStartedAt(), now).getSeconds()
            );
        }

        session.setEndedAt(now);
        session.setStatus(RecordingStatus.COMPLETED);

        recordingSessionRepository.save(session);
    }

    private RecordingSession getSession(UUID sessionId) {
        return recordingSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Recording session not found"
                ));
    }

    private AppUser getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));
    }

    private RecordingResponse toResponse(RecordingSession session) {

        List<RecordingConsentResponse> consentResponses =
                recordingConsentRepository
                        .findByRecordingSession_Id(session.getId())
                        .stream()
                        .map(consent -> new RecordingConsentResponse(
                                consent.getParticipant().getId(),
                                consent.getParticipant().getUser().getId(),
                                consent.getParticipant().getUser().getEmail(),
                                consent.getConsentStatus(),
                                consent.getRespondedAt()
                        ))
                        .toList();

        return new RecordingResponse(
                session.getId(),
                session.getMeeting().getId(),
                session.getStatus(),
                session.getStartedAt(),
                session.getEndedAt(),
                session.getDurationSeconds(),
                session.getFailureReason(),
                session.getCreatedAt(),
                consentResponses
        );
    }
}