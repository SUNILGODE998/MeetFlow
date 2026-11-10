package com.meetFlow.platform.repository;

import com.meetFlow.platform.entity.auth.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository
        extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    void deleteAllByUser_Id(UUID userId);
}

