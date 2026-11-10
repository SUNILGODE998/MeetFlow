package com.meetFlow.platform.dto.request;

import jakarta.validation.constraints.NotBlank;

public record JoinMeetingRequest(

        @NotBlank(message = "Meeting code is required")
        String meetingCode,

        String password

) {}
