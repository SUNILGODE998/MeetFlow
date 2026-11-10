package com.meetFlow.platform.dto.response;




import com.meetFlow.platform.dto.ConsentStatus;

import java.time.Instant;
import java.util.UUID;

public record RecordingConsentResponse(
        UUID participantId,
        UUID userId,
        String participantEmail,
        ConsentStatus consentStatus,
        Instant respondedAt
) {
}
