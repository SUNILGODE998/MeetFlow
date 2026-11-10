
package com.meetFlow.platform.controller;

import com.meetFlow.platform.dto.response.AuthResponse;
import com.meetFlow.platform.entity.Register.LoginRequest;
import com.meetFlow.platform.entity.Register.RegisterRequest;
import com.meetFlow.platform.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.security.jwt.refresh-token-expiration:604800000}")
    private long refreshTokenExpiration;

    @Value("${app.security.cookie-secure:false}")
    private boolean cookieSecure;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        AuthService.AuthResult result = authService.register(request);

        ResponseCookie cookie = createRefreshCookie(result.refreshToken());

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.authResponse());
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        AuthService.AuthResult result = authService.login(request);

        ResponseCookie cookie = createRefreshCookie(result.refreshToken());

        return ResponseEntity
                .ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.authResponse());
    }

    private ResponseCookie createRefreshCookie(String refreshToken) {

        return ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(Duration.ofMillis(refreshTokenExpiration))
                .build();
    }


    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(
                    name = "refreshToken",
                    required = false
            ) String refreshToken
    ) {
        AuthService.AuthResult result = authService.refresh(refreshToken);

        ResponseCookie cookie = createRefreshCookie(result.refreshToken());

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(result.authResponse());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(
                    name = "refreshToken",
                    required = false
            ) String refreshToken
    ) {
        authService.logout(refreshToken);

        ResponseCookie cookie = ResponseCookie.from("refreshToken", "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path("/api/auth")
                .maxAge(Duration.ZERO)
                .build();

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .build();
    }

}
