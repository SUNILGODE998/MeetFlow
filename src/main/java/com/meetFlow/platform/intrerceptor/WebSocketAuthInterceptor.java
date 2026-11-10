package com.meetFlow.platform.intrerceptor;


import com.meetFlow.platform.dto.enums.ParticipantStatus;
import com.meetFlow.platform.dto.request.MeetingParticipant;
import com.meetFlow.platform.entity.User.AppUser;
import com.meetFlow.platform.repository.MeetingParticipantRepository;
import com.meetFlow.platform.repository.UserRepository;
import com.meetFlow.platform.service.MeetFlowUserDetailsService;
import com.meetFlow.platform.service.jwtService;
import lombok.RequiredArgsConstructor;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;

import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private final jwtService jwtService;
    private final MeetFlowUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final MeetingParticipantRepository participantRepository;

    @Override
    public Message<?> preSend(
            Message<?> message,
            MessageChannel channel
    ) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(
                        message,
                        StompHeaderAccessor.class
                );

        if (accessor == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();

        if (command == StompCommand.CONNECT) {
            authenticateConnection(accessor);
        }

        if (command == StompCommand.SUBSCRIBE) {
            authorizeSubscription(accessor);
        }

        return message;
    }

    private void authenticateConnection(StompHeaderAccessor accessor) {

        String authorization =
                accessor.getFirstNativeHeader("Authorization");

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new AccessDeniedException(
                    "Missing WebSocket access token"
            );
        }

        String token = authorization.substring(7);

        String email = jwtService.extractUsername(token);

        if (email == null || !jwtService.isTokenValid(token, email)) {
            throw new AccessDeniedException(
                    "Invalid or expired WebSocket token"
            );
        }

        UserDetails userDetails =
                userDetailsService.loadUserByUsername(email);

        Authentication authentication =
                new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );

        accessor.setUser(authentication);
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {

        Authentication authentication =
                (Authentication) accessor.getUser();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException(
                    "Unauthenticated WebSocket subscription"
            );
        }

        String destination = accessor.getDestination();

        if (destination == null) {
            throw new AccessDeniedException(
                    "Subscription destination is required"
            );
        }

        // Authenticated users may subscribe to their own private queue.
        if ("/user/queue/signaling".equals(destination)) {
            return;
        }

        String prefix = "/topic/meetings/";

        if (!destination.startsWith(prefix)) {
            throw new AccessDeniedException(
                    "Subscription destination is not allowed"
            );
        }

        String meetingIdValue =
                destination.substring(prefix.length());

        UUID meetingId;

        try {
            meetingId = UUID.fromString(meetingIdValue);
        } catch (IllegalArgumentException exception) {
            throw new AccessDeniedException("Invalid meeting ID");
        }

        AppUser user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new AccessDeniedException("User not found"));

        MeetingParticipant participant = participantRepository
                .findByMeeting_IdAndUser_Id(meetingId, user.getId())
                .orElseThrow(() ->
                        new AccessDeniedException(
                                "You are not a participant of this meeting"
                        ));

        if (participant.getStatus() != ParticipantStatus.JOINED) {
            throw new AccessDeniedException(
                    "You must be admitted before subscribing to the meeting"
            );
        }
    }
}

