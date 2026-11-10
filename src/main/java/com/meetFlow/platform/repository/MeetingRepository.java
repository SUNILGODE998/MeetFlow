package com.meetFlow.platform.repository;

import com.meetFlow.platform.dto.enums.MeetingStatus;
import com.meetFlow.platform.entity.Meeting.Meeting;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MeetingRepository extends JpaRepository<Meeting, UUID> {

    Optional<Meeting> findByMeetingCode(String meetingCode);

    Optional<Meeting> findByIdAndHost_Id(UUID id, UUID hostId);

    List<Meeting> findByHost_IdOrderByCreatedAtDesc(UUID hostId);

    List<Meeting> findByHost_IdAndStatusOrderByScheduledAtAsc(
            UUID hostId,
            MeetingStatus status
    );

    List<Meeting> findByHost_IdAndStatusAndScheduledAtAfterOrderByScheduledAtAsc(
            UUID hostId,
            MeetingStatus status,
            Instant now
    );
}

