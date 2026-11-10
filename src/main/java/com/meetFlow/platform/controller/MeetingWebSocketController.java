package com.meetFlow.platform.controller;


import com.meetFlow.platform.dto.request.SignalMessage;
import com.meetFlow.platform.dto.response.ParticipantResponse;
import com.meetFlow.platform.service.MeetingWebSocketService;
import lombok.RequiredArgsConstructor;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class MeetingWebSocketController {

    private final MeetingWebSocketService webSocketService;

    @MessageMapping("/meetings/{meetingId}/join")
    public void joinMeeting(
            @DestinationVariable UUID meetingId,
            Principal principal
    ) {

        webSocketService.joinRoom(
                meetingId,
                principal.getName()
        );
    }


    @MessageMapping("/meetings/{meetingId}/leave")
    public void leaveMeeting(
            @DestinationVariable UUID meetingId,
            Principal principal
    ) {
        webSocketService.leaveRoom(
                meetingId,
                principal.getName()
        );
    }

    @MessageMapping("/meetings/{meetingId}/signal")
    public void sendSignal(
            @DestinationVariable UUID meetingId,
            SignalMessage message,
            Principal principal
    ) {

        webSocketService.sendSignal(
                meetingId,
                principal.getName(),
                message
        );
    }
}

