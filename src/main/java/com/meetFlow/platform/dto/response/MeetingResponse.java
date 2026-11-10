package com.meetFlow.platform.dto.response;

import com.meetFlow.platform.dto.enums.MeetingStatus;
import com.meetFlow.platform.dto.enums.MeetingType;

import java.time.Instant;
import java.util.UUID;

public record MeetingResponse(

        UUID id,
        UUID roomId,
        String meetingCode,
        String title,
        String description,
        UUID hostId,
        String hostName,
        String hostEmail,
        MeetingType meetingType,
        MeetingStatus status,
        Instant scheduledAt,
        Instant startedAt,
        Instant endedAt,
        boolean passwordProtected,
        boolean waitingRoomEnabled,
        boolean recordingEnabled,
        Instant createdAt

) {}

