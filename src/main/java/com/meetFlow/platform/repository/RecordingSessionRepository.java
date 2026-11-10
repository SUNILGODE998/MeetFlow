package com.meetFlow.platform.repository;

import com.meetFlow.platform.dto.enums.RecordingStatus;
import com.meetFlow.platform.entity.Meeting.RecordingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RecordingSessionRepository
        extends JpaRepository<RecordingSession, UUID> {

    Optional<RecordingSession> findByMeeting_IdAndStatusIn(
            UUID meetingId,
            List<RecordingStatus> statuses
    );

    List<RecordingSession> findByMeeting_IdOrderByCreatedAtDesc(
            UUID meetingId
    );
}