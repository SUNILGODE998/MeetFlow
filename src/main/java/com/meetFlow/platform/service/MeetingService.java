package com.meetFlow.platform.service;


import com.meetFlow.platform.dto.response.MeetingResponse;
import com.meetFlow.platform.entity.Meeting.CreateMeetingRequest;
import com.meetFlow.platform.entity.Meeting.UpdateMeetingRequest;

import java.util.List;
import java.util.UUID;

public interface MeetingService {

    MeetingResponse createMeeting(
            CreateMeetingRequest request,
            String email
    );

    MeetingResponse getMeeting(UUID id);

    MeetingResponse getMeetingByCode(String code);

    MeetingResponse updateMeeting(
            UUID id,
            UpdateMeetingRequest request,
            String email
    );

    void cancelMeeting(UUID id, String email);

    MeetingResponse startMeeting(UUID id, String email);

    MeetingResponse endMeeting(UUID id, String email);

    List<MeetingResponse> getMyMeetings(String email);

    List<MeetingResponse> getUpcomingMeetings(String email);
}

