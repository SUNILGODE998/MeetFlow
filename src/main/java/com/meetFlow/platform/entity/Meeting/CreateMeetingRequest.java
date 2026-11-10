package com.meetFlow.platform.entity.Meeting;

import com.meetFlow.platform.dto.enums.MeetingType;
import jakarta.validation.constraints.*;

import java.time.Instant;

public record CreateMeetingRequest(

        @NotBlank(message = "Meeting title is required")
        @Size(max = 150, message = "Title cannot exceed 150 characters")
        String title,

        @Size(max = 2000)
        String description,

        @NotNull(message = "Meeting type is required")
        MeetingType meetingType,

        Instant scheduledAt,

        String password,

        Boolean waitingRoomEnabled,

        Boolean recordingEnabled

) {}

