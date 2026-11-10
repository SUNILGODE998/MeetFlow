package com.meetFlow.platform.controller;


import com.meetFlow.platform.dto.request.InviteParticipantRequest;
import com.meetFlow.platform.dto.request.JoinMeetingRequest;
import com.meetFlow.platform.dto.response.ParticipantResponse;
import com.meetFlow.platform.service.MeetingParticipantService;
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
public class MeetingParticipantController {

    private final MeetingParticipantService participantService;

    // Invite a registered user
    @PostMapping("/{meetingId}/participants/invite")
    public ResponseEntity<ParticipantResponse> inviteParticipant(
            @PathVariable UUID meetingId,
            @Valid @RequestBody InviteParticipantRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                participantService.inviteParticipant(
                        meetingId,
                        request,
                        authentication.getName()
                )
        );
    }

    // Join meeting using meeting code
    @PostMapping("/join")
    public ResponseEntity<ParticipantResponse> joinMeeting(
            @Valid @RequestBody JoinMeetingRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                participantService.joinMeeting(
                        request,
                        authentication.getName()
                )
        );
    }

    // Get all participants
    @GetMapping("/{meetingId}/participants")
    public ResponseEntity<List<ParticipantResponse>> getParticipants(
            @PathVariable UUID meetingId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                participantService.getParticipants(
                        meetingId,
                        authentication.getName()
                )
        );
    }

    // Get waiting room participants
    @GetMapping("/{meetingId}/participants/waiting")
    public ResponseEntity<List<ParticipantResponse>> getWaitingParticipants(
            @PathVariable UUID meetingId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                participantService.getWaitingParticipants(
                        meetingId,
                        authentication.getName()
                )
        );
    }

    // Admit participant
    @PostMapping("/{meetingId}/participants/{participantId}/admit")
    public ResponseEntity<ParticipantResponse> admitParticipant(
            @PathVariable UUID meetingId,
            @PathVariable UUID participantId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                participantService.admitParticipant(
                        meetingId,
                        participantId,
                        authentication.getName()
                )
        );
    }

    // Reject participant
    @PostMapping("/{meetingId}/participants/{participantId}/reject")
    public ResponseEntity<ParticipantResponse> rejectParticipant(
            @PathVariable UUID meetingId,
            @PathVariable UUID participantId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                participantService.rejectParticipant(
                        meetingId,
                        participantId,
                        authentication.getName()
                )
        );
    }

    // Leave meeting
    @PostMapping("/{meetingId}/leave")
    public ResponseEntity<ParticipantResponse> leaveMeeting(
            @PathVariable UUID meetingId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                participantService.leaveMeeting(
                        meetingId,
                        authentication.getName()
                )
        );
    }

    // Remove participant
    @DeleteMapping("/{meetingId}/participants/{participantId}")
    public ResponseEntity<Void> removeParticipant(
            @PathVariable UUID meetingId,
            @PathVariable UUID participantId,
            Authentication authentication
    ) {
        participantService.removeParticipant(
                meetingId,
                participantId,
                authentication.getName()
        );

        return ResponseEntity.noContent().build();
    }
}

