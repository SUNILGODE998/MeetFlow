package com.meetFlow.platform.dto.response;


import com.meetFlow.platform.dto.enums.userRole;

import java.util.UUID;

public record AuthResponse(

        UUID userId,
        String fullName,
        String email,
        userRole role,
        String accessToken,
        String tokenType

) {}
