
package com.meetFlow.platform.service;

import com.meetFlow.platform.dto.response.AuthResponse;
import com.meetFlow.platform.entity.Register.LoginRequest;
import com.meetFlow.platform.entity.Register.RegisterRequest;
import com.meetFlow.platform.entity.User.AppUser;
import com.meetFlow.platform.exception.UserNotFoundException;
import com.meetFlow.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final UserRepository userRepository;
    private final jwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthResult register(RegisterRequest request) {

        AppUser user = userService.register(request);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = refreshTokenService.createRefreshToken(user);

        return new AuthResult(
                buildResponse(user, accessToken),
                refreshToken
        );
    }

    public AuthResult login(LoginRequest request) {

        String email = request.email().toLowerCase().trim();

        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException(
                        "This email is not registered. Please register first."
                ));

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.password()
                )
        );

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = refreshTokenService.createRefreshToken(user);

        return new AuthResult(
                buildResponse(user, accessToken),
                refreshToken
        );
    }

    private AuthResponse buildResponse(
            AppUser user,
            String accessToken
    ) {
        return new AuthResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                accessToken,
                "Bearer"
        );
    }

    public record AuthResult(
            AuthResponse authResponse,
            String refreshToken
    ) {}


    public AuthResult refresh(String rawRefreshToken) {

        RefreshTokenService.RotatedToken rotated =
                refreshTokenService.rotateRefreshToken(rawRefreshToken);

        AppUser user = rotated.user();

        String accessToken = jwtService.generateAccessToken(user);

        return new AuthResult(
                buildResponse(user, accessToken),
                rotated.refreshToken()
        );
    }

    public void logout(String rawRefreshToken) {
        refreshTokenService.revokeRefreshToken(rawRefreshToken);
    }

}
