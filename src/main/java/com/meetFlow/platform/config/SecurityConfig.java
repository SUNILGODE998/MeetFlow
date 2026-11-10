
package com.meetFlow.platform.config;

import com.meetFlow.platform.filter.JwtAuthenticationFilter;
import com.meetFlow.platform.service.MeetFlowUserDetailsService;

import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final MeetFlowUserDetailsService userDetailsService;
    private final PasswordEncoder passwordEncoder;

    public SecurityConfig(
            JwtAuthenticationFilter jwtAuthenticationFilter,
            MeetFlowUserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.userDetailsService = userDetailsService;
        this.passwordEncoder = passwordEncoder;
    }

    // Authentication manager used by AuthService
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {
        return configuration.getAuthenticationManager();
    }

    // Authentication provider for email/password authentication
    @Bean
    public AuthenticationProvider authenticationProvider() {

        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider(userDetailsService);

        provider.setPasswordEncoder(passwordEncoder);

        return provider;
    }

    // Main Spring Security configuration
    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http
                .cors(Customizer.withDefaults())

                // JWT API does not use session-based CSRF protection
                .csrf(csrf -> csrf.disable())

                // Stateless authentication
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authenticationProvider(authenticationProvider())

                // Endpoint authorization
                .authorizeHttpRequests(auth -> auth

                        // Allow CORS preflight requests
                        .requestMatchers(
                                HttpMethod.OPTIONS, "/**"
                        ).permitAll()

                        // Public authentication endpoints
                        .requestMatchers(
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/refresh",
                                "/api/auth/logout",
                                "/oauth2/**",
                                "/login/oauth2/**"
                        ).permitAll()

                        // WebSocket handshake
                        .requestMatchers("/ws/**").permitAll()

                        // Admin endpoints
                        .requestMatchers("/api/v1/admin/**")
                        .hasRole("ADMIN")

                        // Manager endpoints
                        .requestMatchers("/api/v1/manager/**")
                        .hasAnyRole("ADMIN", "MANAGER")

                        // Developer endpoints
                        .requestMatchers("/api/v1/developer/**")
                        .hasAnyRole("ADMIN", "MANAGER", "DEVELOPER")

                        // Meeting APIs require authentication
                        .requestMatchers("/api/meetings/**")
                        .authenticated()

                        // All remaining endpoints require authentication
                        .anyRequest().authenticated()
                )

                // Add JWT filter before username/password authentication
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    // CORS configuration for React frontend
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        // Allowed frontend origins
        configuration.setAllowedOrigins(List.of(
                "http://localhost:5174",
                "http://127.0.0.1:5174",
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        ));

        // Allowed HTTP methods
        configuration.setAllowedMethods(List.of(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));

        // Allowed request headers
        configuration.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin",
                "X-Requested-With"
        ));

        // Expose response headers
        configuration.setExposedHeaders(List.of(
                "Authorization"
        ));

        // Allow credentials
        configuration.setAllowCredentials(true);

        // Cache preflight response for one hour
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}
