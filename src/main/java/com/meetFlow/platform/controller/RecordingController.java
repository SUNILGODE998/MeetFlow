package com.meetFlow.platform.controller;



import com.meetFlow.platform.dto.request.RecordingConsentRequest;
import com.meetFlow.platform.dto.response.RecordingResponse;
import com.meetFlow.platform.service.RecordingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RecordingController {

    private final RecordingService recordingService;

    /**
     * Host requests recording.
     * Creates a recording session and sends consent requests
     * to currently joined participants.
     */
    @PostMapping("/meetings/{meetingId}/recordings")
    public ResponseEntity<RecordingResponse> startRecording(
            @PathVariable UUID meetingId,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recordingService.startRecording(
                        meetingId,
                        authentication.getName()
                ));
    }

    /**
     * Participant grants, denies or withdraws consent.
     */
    @PostMapping("/recordings/{recordingSessionId}/consent")
    public ResponseEntity<RecordingResponse> respondToConsent(
            @PathVariable UUID recordingSessionId,
            @Valid @RequestBody RecordingConsentRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                recordingService.respondToConsent(
                        recordingSessionId,
                        request,
                        authentication.getName()
                )
        );
    }

    /**
     * Host stops recording.
     */
    @PostMapping("/recordings/{recordingSessionId}/stop")
    public ResponseEntity<RecordingResponse> stopRecording(
            @PathVariable UUID recordingSessionId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                recordingService.stopRecording(
                        recordingSessionId,
                        authentication.getName()
                )
        );
    }

    /**
     * Host or meeting participant retrieves recording status.
     */
    @GetMapping("/recordings/{recordingSessionId}")
    public ResponseEntity<RecordingResponse> getRecording(
            @PathVariable UUID recordingSessionId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                recordingService.getRecording(
                        recordingSessionId,
                        authentication.getName()
                )
        );
    }
}
