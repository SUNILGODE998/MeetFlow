package com.meetFlow.platform.entity.User;

import com.meetFlow.platform.dto.enums.UserProvider;
import com.meetFlow.platform.dto.enums.userRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Data
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name="app-user", uniqueConstraints ={@UniqueConstraint(columnNames="email")})
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    private String password;

    private String providerId;

    private String profilePicture;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private userRole role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserProvider provider;

    @Column(nullable = false)
    private boolean enabled;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        enabled = true;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

}
