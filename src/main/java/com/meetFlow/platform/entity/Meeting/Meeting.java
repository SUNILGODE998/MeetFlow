package com.meetFlow.platform.entity.Meeting;

import com.meetFlow.platform.dto.enums.MeetingStatus;
import com.meetFlow.platform.dto.enums.MeetingType;
import com.meetFlow.platform.entity.User.AppUser;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "meetings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Meeting {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "room_id", nullable = false, unique = true)
    private UUID roomId;

    @Column(name = "meeting_code", nullable = false, unique = true, length = 12)
    private String meetingCode;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "host_user_id", nullable = false)
    private AppUser host;

    @Enumerated(EnumType.STRING)
    @Column(name = "meeting_type", nullable = false)
    private MeetingType meetingType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MeetingStatus status;

    @Column(name = "scheduled_at")
    private Instant scheduledAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "waiting_room_enabled", nullable = false)
    private boolean waitingRoomEnabled;

    @Column(name = "recording_enabled", nullable = false)
    private boolean recordingEnabled;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = Instant.now();
    }
}

