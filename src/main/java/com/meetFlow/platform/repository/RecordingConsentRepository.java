package com.meetFlow.platform.repository;

import com.meetFlow.platform.entity.Meeting.RecordingConsent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RecordingConsentRepository
        extends JpaRepository<RecordingConsent, UUID> {

    List<RecordingConsent> findByRecordingSession_Id(UUID sessionId);

    Optional<RecordingConsent>
    findByRecordingSession_IdAndParticipant_Id(
            UUID sessionId,
            UUID participantId
    );
}