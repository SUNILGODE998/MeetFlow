package com.meetFlow.platform.service;


import com.meetFlow.platform.entity.User.AppUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class jwtService {

    private final SecretKey signingKey;
    private final long accessTokenExpiration;

    public jwtService(
            @Value("${app.security.jwt.secret}") String secret,
            @Value("${app.security.jwt.access-token-expiration}") long expiration
    ) {
        this.signingKey = Keys.hmacShaKeyFor(
                Decoders.BASE64.decode(secret)
        );
        this.accessTokenExpiration = expiration;
    }

    public String generateAccessToken(AppUser user) {
        Instant now = Instant.now();

        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId().toString())
                .claim("role", user.getRole().name())
                .claim("tokenType", "ACCESS")
                .issuedAt(Date.from(now))
                .expiration(Date.from(
                        now.plusMillis(accessTokenExpiration)
                ))
                .signWith(signingKey)
                .compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(
                extractClaims(token).get("userId", String.class)
        );
    }

    public boolean isAccessToken(String token) {
        return "ACCESS".equals(
                extractClaims(token).get("tokenType", String.class)
        );
    }

    public boolean isTokenValid(String token, String email) {
        Claims claims = extractClaims(token);

        return claims.getSubject().equals(email)
                && claims.getExpiration().after(new Date())
                && "ACCESS".equals(
                claims.get("tokenType", String.class)
        );
    }
}
