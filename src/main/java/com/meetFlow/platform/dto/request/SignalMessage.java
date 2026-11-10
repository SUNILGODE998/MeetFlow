package com.meetFlow.platform.dto.request;

import com.meetFlow.platform.dto.enums.SignalType;
import tools.jackson.databind.JsonNode;

public record SignalMessage(

        String senderEmail,

        String targetEmail,

        SignalType type,

        JsonNode payload

) {}

