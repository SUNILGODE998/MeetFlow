package com.meetFlow.platform.dto.request;


import com.meetFlow.platform.dto.enums.ParticipantRole;
import com.meetFlow.platform.dto.enums.ParticipantStatus;
import com.meetFlow.platform.entity.Meeting.Meeting;
import com.meetFlow.platform.entity.User.AppUser;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
        name = "meeting_participants",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_meeting_participant",
                columnNames = {"meeting_id", "user_id"}
        )
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeetingParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "meeting_id", nullable = false)
    private Meeting meeting;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Enumerated(EnumType.STRING)
    @Column(name = "participant_role", nullable = false)
    private ParticipantRole participantRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ParticipantStatus status;

    @Column(name = "invited_at")
    private Instant invitedAt;

    @Column(name = "joined_at")
    private Instant joinedAt;

    @Column(name = "left_at")
    private Instant leftAt;

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

