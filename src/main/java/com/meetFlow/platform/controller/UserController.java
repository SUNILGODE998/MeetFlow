package com.meetFlow.platform.controller;

import com.meetFlow.platform.entity.User.AppUser;
import com.meetFlow.platform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public AppUser getCurrentUser(
            org.springframework.security.core.Authentication authentication
    ) {
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<AppUser> getAllUsers() {
        return userRepository.findAll();
    }
}