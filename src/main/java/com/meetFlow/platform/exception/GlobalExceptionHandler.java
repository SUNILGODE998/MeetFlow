package com.meetFlow.platform.exception;



import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.meetFlow.platform.exception.ParticipantException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(GlobalException.class)
    public ResponseEntity<Map<String, Object>> handleDuplicateEmail(
            GlobalException exception) {

        Map<String, Object> error = Map.of(
                "success", false,
                "status", 409,
                "error", "Conflict",
                "message", exception.getMessage(),
                "timestamp", LocalDateTime.now().toString()
        );

        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(error);
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleUserNotFound(
            UserNotFoundException ex) {

        Map<String, Object> response = new HashMap<>();

        response.put("success", false);
        response.put("status", 404);
        response.put("error", "USER_NOT_FOUND");
        response.put("message", ex.getMessage());
        response.put("timestamp", LocalDateTime.now());

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }


    @ExceptionHandler(ParticipantException.class)
    public ResponseEntity<Map<String, Object>> handleParticipantException(
            ParticipantException ex) {

        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("status", 400);
        response.put("error", "PARTICIPANT_ERROR");
        response.put("message", ex.getMessage());
        response.put("timestamp", LocalDateTime.now());

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(MeetingAccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> handleMeetingAccessDenied(
            MeetingAccessDeniedException ex) {

        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("status", 403);
        response.put("error", "MEETING_ACCESS_DENIED");
        response.put("message", ex.getMessage());
        response.put("timestamp", LocalDateTime.now());

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

}
