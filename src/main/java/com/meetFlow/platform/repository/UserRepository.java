package com.meetFlow.platform.repository;

import com.meetFlow.platform.dto.enums.UserProvider;
import com.meetFlow.platform.entity.User.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<AppUser, UUID> {

    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findByProviderAndProviderId(
            UserProvider provider,
            String providerId
    );

    boolean existsByEmail(String email);
}
