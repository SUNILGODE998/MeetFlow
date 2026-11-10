package com.meetFlow.platform.controller;

import com.meetFlow.platform.dto.response.MeetingResponse;
import com.meetFlow.platform.entity.Meeting.CreateMeetingRequest;
import com.meetFlow.platform.entity.Meeting.UpdateMeetingRequest;
import com.meetFlow.platform.service.MeetingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/meetings")
@RequiredArgsConstructor
public class MeetingController {

    private final MeetingService meetingService;

    @PostMapping
    public ResponseEntity<MeetingResponse> createMeeting(
            @Valid @RequestBody CreateMeetingRequest request,
            Authentication authentication
    ) {
        MeetingResponse response = meetingService.createMeeting(
                request,
                authentication.getName()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MeetingResponse> getMeeting(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(meetingService.getMeeting(id));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<MeetingResponse> getMeetingByCode(
            @PathVariable String code
    ) {
        return ResponseEntity.ok(
                meetingService.getMeetingByCode(code)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<MeetingResponse> updateMeeting(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateMeetingRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                meetingService.updateMeeting(
                        id,
                        request,
                        authentication.getName()
                )
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelMeeting(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        meetingService.cancelMeeting(id, authentication.getName());

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<MeetingResponse> startMeeting(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                meetingService.startMeeting(
                        id,
                        authentication.getName()
                )
        );
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<MeetingResponse> endMeeting(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                meetingService.endMeeting(
                        id,
                        authentication.getName()
                )
        );
    }

    @GetMapping("/my")
    public ResponseEntity<List<MeetingResponse>> getMyMeetings(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                meetingService.getMyMeetings(authentication.getName())
        );
    }

    @GetMapping("/upcoming")
    public ResponseEntity<List<MeetingResponse>> getUpcomingMeetings(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                meetingService.getUpcomingMeetings(authentication.getName())
        );
    }
}

