package com.meetFlow.platform.exception;

public class MeetingAccessDeniedException extends RuntimeException {
    public MeetingAccessDeniedException(String message) {
        super(message);
    }
}
