package com.meetFlow.platform.dto.request;

import com.meetFlow.platform.dto.ConsentStatus;
import jakarta.validation.constraints.NotNull;

public record RecordingConsentRequest(
        @NotNull ConsentStatus decision
) {
}
