package com.meetFlow.platform.exception;


import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class MeetingExceptionHandler {

    @ExceptionHandler(MeetingNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(
            MeetingNotFoundException exception
    ) {
        return buildResponse(
                HttpStatus.NOT_FOUND,
                exception.getMessage()
        );
    }

    @ExceptionHandler(MeetingAccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleAccessDenied(
            MeetingAccessDeniedException exception
    ) {
        return buildResponse(
                HttpStatus.FORBIDDEN,
                exception.getMessage()
        );
    }

    @ExceptionHandler({
            IllegalArgumentException.class,
            IllegalStateException.class
    })
    public ResponseEntity<Map<String, Object>> handleBadRequest(
            RuntimeException exception
    ) {
        return buildResponse(
                HttpStatus.BAD_REQUEST,
                exception.getMessage()
        );
    }

    private ResponseEntity<Map<String, Object>> buildResponse(
            HttpStatus status,
            String message
    ) {
        return ResponseEntity.status(status).body(
                Map.of(
                        "success", false,
                        "status", status.value(),
                        "error", status.getReasonPhrase(),
                        "message", message,
                        "timestamp", Instant.now().toString()
                )
        );
    }

    @ExceptionHandler(ParticipantException.class)
    public ResponseEntity<Map<String, Object>> handleParticipantException(
            ParticipantException exception
    ) {
        return ResponseEntity.badRequest().body(
                Map.of(
                        "success", false,
                        "status", 400,
                        "error", "Bad Request",
                        "message", exception.getMessage(),
                        "timestamp", Instant.now().toString()
                )
        );
    }
}

