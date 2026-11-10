package com.meetFlow.platform.config;



import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;

@Component
public class JwtKeyFingerprint {

    @Value("${app.security.jwt.secret}")
    private String jwtSecret;

    @PostConstruct
    public void printFingerprint() throws Exception {

        byte[] decodedKey = Base64.getDecoder().decode(jwtSecret);

        if (decodedKey.length != 32) {
            throw new IllegalStateException(
                    "JWT secret must decode to exactly 32 bytes. Actual: "
                            + decodedKey.length
            );
        }

        SecretKey signingKey = new SecretKeySpec(
                decodedKey,
                "HmacSHA256"
        );

        String fingerprint = HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-256")
                        .digest(signingKey.getEncoded())
        ).substring(0, 12);

        System.out.println(
                "Spring JWT key fingerprint: " + fingerprint
        );
    }
}

