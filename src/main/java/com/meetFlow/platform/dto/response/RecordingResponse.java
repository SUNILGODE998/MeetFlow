package com.meetFlow.platform.dto.response;

import com.meetFlow.platform.dto.enums.RecordingStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RecordingResponse(
        UUID id,
        UUID meetingId,
        RecordingStatus status,
        Instant startedAt,
        Instant endedAt,
        Long durationSeconds,
        String failureReason,
        Instant createdAt,
        List<RecordingConsentResponse> consents
) {
}
