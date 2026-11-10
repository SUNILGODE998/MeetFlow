package com.meetFlow.platform.service;

import com.meetFlow.platform.dto.request.RecordingConsentRequest;
import com.meetFlow.platform.dto.response.RecordingResponse;

import java.util.UUID;

public interface RecordingService {

    RecordingResponse startRecording(
            UUID meetingId,
            String hostEmail
    );

    RecordingResponse respondToConsent(
            UUID recordingSessionId,
            RecordingConsentRequest request,
            String participantEmail
    );

    RecordingResponse stopRecording(
            UUID recordingSessionId,
            String hostEmail
    );

    RecordingResponse getRecording(
            UUID recordingSessionId,
            String userEmail
    );
}