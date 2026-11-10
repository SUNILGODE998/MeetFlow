package com.meetFlow.platform.service;


import com.meetFlow.platform.entity.User.AppUser;
import com.meetFlow.platform.entity.auth.RefreshToken;
import com.meetFlow.platform.repository.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${app.security.jwt.refresh-token-expiration:604800000}")
    private long refreshTokenExpiration;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
    }

    @Transactional
    public String createRefreshToken(AppUser user) {

        String rawToken = generateSecureToken();

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hashToken(rawToken));
        refreshToken.setCreatedAt(Instant.now());
        refreshToken.setExpiresAt(
                Instant.now().plusMillis(refreshTokenExpiration)
        );

        refreshTokenRepository.save(refreshToken);

        return rawToken;
    }


    @Transactional
    public RotatedToken rotateRefreshToken(String rawToken) {

        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh token is missing"
            );
        }

        String tokenHash = hashToken(rawToken);

        RefreshToken existingToken = refreshTokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid refresh token"
                ));

        if (!existingToken.isValid()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Refresh token expired or revoked"
            );
        }

        AppUser user = existingToken.getUser();

        existingToken.setRevokedAt(Instant.now());
        refreshTokenRepository.save(existingToken);

        String replacementToken = createRefreshToken(user);

        return new RotatedToken(user, replacementToken);
    }

    public record RotatedToken(AppUser user, String refreshToken) {}


    @Transactional
    public void revokeRefreshToken(String rawToken) {

        if (rawToken == null || rawToken.isBlank()) {
            return;
        }

        String tokenHash = hashToken(rawToken);

        refreshTokenRepository.findByTokenHash(tokenHash)
                .ifPresent(token -> {
                    if (!token.isRevoked()) {
                        token.setRevokedAt(Instant.now());
                        refreshTokenRepository.save(token);
                    }
                });
    }

    private String generateSecureToken() {

        byte[] randomBytes = new byte[32];
        SECURE_RANDOM.nextBytes(randomBytes);

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);
    }

    private String hashToken(String token) {

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    token.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "SHA-256 algorithm is unavailable",
                    exception
            );
        }
    }
}

