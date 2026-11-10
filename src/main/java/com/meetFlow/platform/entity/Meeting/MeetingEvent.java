package com.meetFlow.platform.entity.Meeting;

import java.time.Instant;
import java.util.UUID;

public record MeetingEvent(
        String type,
        UUID meetingId,
        UUID participantId,
        String participantName,
        String participantEmail,
        String message,
        Instant occurredAt
) {}
