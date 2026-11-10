
package com.meetFlow.platform.filter;

import com.meetFlow.platform.service.jwtService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final jwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(
            jwtService jwtService,
            UserDetailsService userDetailsService
    ) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // Skip browser preflight requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        final String authorizationHeader =
                request.getHeader("Authorization");

        // Continue if no Bearer token is supplied
        if (authorizationHeader == null ||
                !authorizationHeader.startsWith("Bearer ")) {

            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authorizationHeader.substring(7);

        try {
            final String email = jwtService.extractUsername(jwt);

            if (email == null) {
                logger.warn("JWT subject is missing");
                filterChain.doFilter(request, response);
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {

                UserDetails userDetails =
                        userDetailsService.loadUserByUsername(email);

                if (jwtService.isTokenValid(jwt, email)) {

                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(
                                    userDetails,
                                    null,
                                    userDetails.getAuthorities()
                            );

                    authentication.setDetails(
                            new WebAuthenticationDetailsSource()
                                    .buildDetails(request)
                    );

                    SecurityContext context =
                            SecurityContextHolder.createEmptyContext();

                    context.setAuthentication(authentication);

                    SecurityContextHolder.setContext(context);

                    logger.info(
                            "JWT authentication successful for: " + email
                    );

                    logger.info(
                            "User authorities: " + userDetails.getAuthorities()
                    );

                } else {
                    logger.warn("JWT token validation failed for: " + email);
                }
            }

        } catch (Exception exception) {

            SecurityContextHolder.clearContext();

            logger.error(
                    "JWT authentication failed: " + exception.getMessage()
            );
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equalsIgnoreCase(request.getMethod());
    }
}
