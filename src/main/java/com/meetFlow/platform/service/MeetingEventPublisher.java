
package com.meetFlow.platform.service;


import com.meetFlow.platform.dto.response.ParticipantResponse;
import com.meetFlow.platform.entity.Meeting.MeetingEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class MeetingEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publish(
            UUID meetingId,
            String eventType,
            ParticipantResponse participant,
            String message
    ) {
        MeetingEvent event = new MeetingEvent(
                eventType,
                meetingId,
                participant.id(),
                participant.fullName(),
                participant.email(),
                message,
                Instant.now()
        );

        messagingTemplate.convertAndSend(
                "/topic/meetings/" + meetingId,
                event
        );
    }
}
