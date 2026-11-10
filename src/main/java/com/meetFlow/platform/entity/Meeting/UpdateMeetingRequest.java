package com.meetFlow.platform.entity.Meeting;


import jakarta.validation.constraints.Size;

import java.time.Instant;

public record UpdateMeetingRequest(

        @Size(min = 1, max = 150)
        String title,

        @Size(max = 2000)
        String description,

        Instant scheduledAt,

        Boolean waitingRoomEnabled,

        Boolean recordingEnabled

) {}
