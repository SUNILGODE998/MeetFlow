package com.meetFlow.platform.repository;



import com.meetFlow.platform.dto.request.MeetingParticipant;
import com.meetFlow.platform.dto.enums.ParticipantStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MeetingParticipantRepository
        extends JpaRepository<MeetingParticipant, UUID> {

    Optional<MeetingParticipant> findByMeeting_IdAndUser_Id(
            UUID meetingId,
            UUID userId
    );

    List<MeetingParticipant> findByMeeting_IdOrderByCreatedAtAsc(
            UUID meetingId
    );

    List<MeetingParticipant> findByMeeting_IdAndStatusOrderByCreatedAtAsc(
            UUID meetingId,
            ParticipantStatus status
    );

    boolean existsByMeeting_IdAndUser_Id(
            UUID meetingId,
            UUID userId
    );
}
