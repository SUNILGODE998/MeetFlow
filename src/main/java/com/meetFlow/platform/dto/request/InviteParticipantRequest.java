package com.meetFlow.platform.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record InviteParticipantRequest(

        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email")
        String email

) {}
