package com.meetFlow.platform.service;

import com.meetFlow.platform.dto.enums.UserProvider;
import com.meetFlow.platform.entity.Register.RegisterRequest;
import com.meetFlow.platform.entity.User.AppUser;
import com.meetFlow.platform.dto.enums.userRole;
import com.meetFlow.platform.exception.GlobalException;
import com.meetFlow.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public AppUser register(RegisterRequest request) {

        if (userRepository.existsByEmail(request.email())) {
            throw new GlobalException(
                    "Email already exists"
            );
        }


        AppUser user = AppUser.builder()
                .fullName(request.fullName())
                .email(request.email().trim().toLowerCase())
                .password(passwordEncoder.encode(request.password()))
                .role(userRole.ATTENDEE)
                .provider(UserProvider.LOCAL)
                .enabled(true)
                .build();

        return userRepository.save(user);
    }
}
