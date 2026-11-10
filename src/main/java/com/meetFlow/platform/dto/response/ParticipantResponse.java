package com.meetFlow.platform.dto.response;

import com.meetFlow.platform.dto.enums.ParticipantRole;
import com.meetFlow.platform.dto.enums.ParticipantStatus;

import java.time.Instant;
import java.util.UUID;

public record ParticipantResponse(
        UUID id,
        UUID userId,
        String fullName,
        String email,
        ParticipantRole role,
        ParticipantStatus status,
        Instant invitedAt,
        Instant joinedAt,
        Instant leftAt
) {}

