package com.meetFlow.platform.dto.request;

import java.time.Instant;

public record PresenceEvent(

        String event,

        String email,

        String fullName,

        Instant timestamp

) {}

