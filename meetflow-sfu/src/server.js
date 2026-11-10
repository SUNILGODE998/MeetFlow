
import "dotenv/config";

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

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

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));

app.use(express.json());

// ============================================
// SOCKET.IO CONFIGURATION
// ============================================

const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    console.log("SFU client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("SFU client disconnected:", socket.id);
    });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get("/health", (req, res) => {
    res.json({
        service: "MeetFlow SFU",
        status: "UP"
    });
});

// ============================================
// ROOM ROUTES
// ============================================

app.post("/api/rooms", createMeetingRoom);

app.get("/api/rooms/:meetingId", getMeetingRoom);

app.delete("/api/rooms/:meetingId", deleteMeetingRoom);

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
    console.error("SFU server error:", error);

    res.status(500).json({
        message: "Internal SFU server error"
    });
});

// ============================================
// START SERVER
// ============================================

const startServer = async () => {
    try {
        await createMediasoupWorker();

        const PORT = process.env.PORT || 4000;

        httpServer.listen(PORT, "0.0.0.0", () => {
            console.log(`MeetFlow SFU running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Failed to start MeetFlow SFU:", error);
        process.exit(1);
    }
};

startServer();
