
import "dotenv/config";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
}

const signingKey = Buffer.from(JWT_SECRET, "base64");

if (signingKey.length !== 32) {
    throw new Error(
        `JWT secret must decode to exactly 32 bytes. Got ${signingKey.length}`
    );
}

// Compare this fingerprint with Spring Boot.
const fingerprint = crypto
    .createHash("sha256")
    .update(signingKey)
    .digest("hex")
    .substring(0, 12);

console.log("SFU JWT key fingerprint:", fingerprint);

// Spring Boot uses HS256 for this 32-byte key.
export function verifyAccessToken(token) {
    if (!token) {
        throw new Error("Access token is missing");
    }

    const decoded = jwt.verify(token, signingKey, {
        algorithms: ["HS256"]
    });

    if (decoded.tokenType !== "ACCESS") {
        throw new Error("Invalid token type");
    }

    if (!decoded.userId || !decoded.sub) {
        throw new Error("Required JWT claims are missing");
    }

    return {
        userId: decoded.userId,
        email: decoded.sub,
        role: decoded.role
    };
}

export function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authorization token missing"
        });
    }

    const token = authHeader.substring(7).trim();

    try {
        req.auth = verifyAccessToken(token);
        next();
    } catch (error) {
        console.error("SFU JWT verification failed:", {
            name: error.name,
            message: error.message
        });

        return res.status(401).json({
            message: "Invalid or expired access token"
        });
    }
}
