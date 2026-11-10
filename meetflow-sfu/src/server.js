
import "dotenv/config";

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import {
    authenticateToken,
    verifyAccessToken
} from "./middleware/auth.middleware.js";

import {
    createMeetingRoom,
    getMeetingRoom,
    deleteMeetingRoom,
    createTransport,
    connectTransport,
    createRoomProducer,
    pauseRoomProducer,
    resumeRoomProducer,
    closeRoomProducer,
    createRoomConsumer,
    resumeRoomConsumer,
    closeRoomConsumer,
    getRoomProducersController,
    closeRoomPeer
} from "./controllers/room.controller.js";

import { createMediasoupWorker } from "./services/worker.service.js";

// ============================================
// EXPRESS CONFIGURATION
// ============================================

const app = express();
const httpServer = createServer(app);

// ============================================
// CORS CONFIGURATION
// ============================================

const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(
            new Error(`CORS blocked origin: ${origin}`)
        );
    },

    methods: [
        "GET",
        "POST",
        "PATCH",
        "DELETE",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ],

    credentials: true
};

app.use(cors(corsOptions));

app.use(express.json());

// ============================================
// HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
    return res.status(200).json({
        service: "MeetFlow SFU",
        status: "UP"
    });
});

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

// Protect every room API endpoint.
app.use("/api/rooms", authenticateToken);

// ============================================
// SOCKET.IO CONFIGURATION
// ============================================

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// ============================================
// SOCKET.IO JWT AUTHENTICATION
// ============================================

io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(
                new Error("Authentication token required")
            );
        }

        const authenticatedUser = verifyAccessToken(token);

        socket.data.auth = authenticatedUser;

        next();

    } catch (error) {
        console.error("Socket authentication failed:", error.message);

        next(
            new Error("Invalid or expired access token")
        );
    }
});

// ============================================
// SOCKET.IO CONNECTION
// ============================================

io.on("connection", (socket) => {

    console.log(
        "Authenticated SFU client connected:",
        socket.id,
        "User:",
        socket.data.auth.userId
    );

    socket.on("disconnect", (reason) => {
        console.log(
            "SFU client disconnected:",
            socket.id,
            "Reason:",
            reason
        );
    });

});

// ============================================
// ROOM ROUTES
// ============================================

app.post(
    "/api/rooms",
    createMeetingRoom
);

app.get(
    "/api/rooms/:meetingId",
    getMeetingRoom
);

app.delete(
    "/api/rooms/:meetingId",
    deleteMeetingRoom
);

// ============================================
// TRANSPORT ROUTES
// ============================================

app.post(
    "/api/rooms/:meetingId/transports",
    createTransport
);

app.post(
    "/api/rooms/:meetingId/transports/connect",
    connectTransport
);

// ============================================
// PRODUCER ROUTES
// ============================================

app.post(
    "/api/rooms/:meetingId/producers",
    createRoomProducer
);

app.patch(
    "/api/rooms/:meetingId/producers/:peerId/:producerId/pause",
    pauseRoomProducer
);

app.patch(
    "/api/rooms/:meetingId/producers/:peerId/:producerId/resume",
    resumeRoomProducer
);

app.delete(
    "/api/rooms/:meetingId/producers/:peerId/:producerId",
    closeRoomProducer
);

// ============================================
// PEER CLEANUP ROUTE
// ============================================

app.delete(
    "/api/rooms/:meetingId/peers/:peerId",
    closeRoomPeer
);

// ============================================
// CONSUMER ROUTES
// ============================================

app.post(
    "/api/rooms/:meetingId/consumers",
    createRoomConsumer
);

app.patch(
    "/api/rooms/:meetingId/consumers/:peerId/:consumerId/resume",
    resumeRoomConsumer
);

app.delete(
    "/api/rooms/:meetingId/consumers/:peerId/:consumerId",
    closeRoomConsumer
);

// ============================================
// PRODUCER DISCOVERY ROUTE
// ============================================

app.get(
    "/api/rooms/:meetingId/producers",
    getRoomProducersController
);

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((error, req, res, next) => {

    console.error(
        "SFU server error:",
        error
    );

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message: "Internal SFU server error"
    });

});

// ============================================
// START SERVER
// ============================================

const startServer = async () => {

    try {

        console.log("Starting MeetFlow SFU...");

        await createMediasoupWorker();

        const PORT = process.env.PORT || 4000;

        httpServer.listen(PORT, "0.0.0.0", () => {

            console.log("-----------------------------------");
            console.log("MeetFlow SFU started successfully");
            console.log(`Port: ${PORT}`);
            console.log(`Health: http://localhost:${PORT}/health`);
            console.log("-----------------------------------");

        });

    } catch (error) {

        console.error(
            "Failed to start MeetFlow SFU:",
            error
        );

        process.exit(1);

    }

};

startServer();
