
import {
    createRoom,
    getRoom,
    closeRoom,
    createWebRtcTransport,
    connectWebRtcTransport,
    createProducer,
    pauseProducer,
    resumeProducer,
    closeProducer,
    createConsumer,
    resumeConsumer,
    closeConsumer,
    getRoomProducers,
    closePeer
} from "../services/worker.service.js";

// ============================================
// ROOM CONTROLLERS
// ============================================

export const createMeetingRoom = async (req, res) => {
    try {
        const { meetingId } = req.body;

        if (!meetingId) {
            return res.status(400).json({
                message: "Meeting ID is required"
            });
        }

        const room = await createRoom(meetingId);

        return res.status(201).json({
            message: "Media room ready",
            meetingId: room.meetingId,
            routerId: room.router.id,
            rtpCapabilities: room.router.rtpCapabilities
        });

    } catch (error) {
        console.error("Room creation error:", error);

        return res.status(500).json({
            message: error.message
        });
    }
};

export const getMeetingRoom = (req, res) => {
    const room = getRoom(req.params.meetingId);

    if (!room) {
        return res.status(404).json({
            message: "Meeting room not found"
        });
    }

    return res.json({
        meetingId: room.meetingId,
        routerId: room.router.id,
        rtpCapabilities: room.router.rtpCapabilities
    });
};

export const deleteMeetingRoom = (req, res) => {
    const closed = closeRoom(req.params.meetingId);

    if (!closed) {
        return res.status(404).json({
            message: "Meeting room not found"
        });
    }

    return res.json({
        message: "Meeting room closed"
    });
};

// ============================================
// TRANSPORT CONTROLLERS
// ============================================

export const createTransport = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { peerId, direction } = req.body;

        if (!peerId || !direction) {
            return res.status(400).json({
                message: "peerId and direction are required"
            });
        }

        const transport = await createWebRtcTransport(
            meetingId,
            peerId,
            direction
        );

        return res.status(201).json(transport);

    } catch (error) {
        console.error("Transport creation error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};

export const connectTransport = async (req, res) => {
    try {
        const { meetingId } = req.params;
        const { peerId, transportId, dtlsParameters } = req.body;

        if (!peerId || !transportId || !dtlsParameters) {
            return res.status(400).json({
                message: "peerId, transportId and dtlsParameters are required"
            });
        }

        const result = await connectWebRtcTransport(
            meetingId,
            peerId,
            transportId,
            dtlsParameters
        );

        return res.json(result);

    } catch (error) {
        console.error("Transport connection error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};

// ============================================
// PRODUCER CONTROLLERS
// ============================================

export const createRoomProducer = async (req, res) => {
    try {
        const { meetingId } = req.params;

        const {
            peerId,
            transportId,
            kind,
            rtpParameters,
            appData
        } = req.body;

        if (!peerId || !transportId || !kind || !rtpParameters) {
            return res.status(400).json({
                message: "peerId, transportId, kind and rtpParameters are required"
            });
        }

        const producer = await createProducer(
            meetingId,
            peerId,
            transportId,
            kind,
            rtpParameters,
            appData || {}
        );

        return res.status(201).json(producer);

    } catch (error) {
        console.error("Producer creation error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};

export const pauseRoomProducer = async (req, res) => {
    try {
        const { meetingId, peerId, producerId } = req.params;

        const result = await pauseProducer(
            meetingId,
            peerId,
            producerId
        );

        return res.json(result);

    } catch (error) {
        console.error("Producer pause error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};

export const resumeRoomProducer = async (req, res) => {
    try {
        const { meetingId, peerId, producerId } = req.params;

        const result = await resumeProducer(
            meetingId,
            peerId,
            producerId
        );

        return res.json(result);

    } catch (error) {
        console.error("Producer resume error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};

export const closeRoomProducer = (req, res) => {
    try {
        const { meetingId, peerId, producerId } = req.params;

        const result = closeProducer(
            meetingId,
            peerId,
            producerId
        );

        return res.json(result);

    } catch (error) {
        console.error("Producer close error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};

// ============================================
// CONSUMER CONTROLLERS
// ============================================

export const createRoomConsumer = async (req, res) => {
    try {
        const { meetingId } = req.params;

        const {
            peerId,
            producerId,
            rtpCapabilities
        } = req.body;

        if (!peerId || !producerId || !rtpCapabilities) {
            return res.status(400).json({
                message: "peerId, producerId and rtpCapabilities are required"
            });
        }

        const consumer = await createConsumer(
            meetingId,
            peerId,
            producerId,
            rtpCapabilities
        );

        return res.status(201).json(consumer);

    } catch (error) {
        console.error("Consumer creation error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};

export const resumeRoomConsumer = async (req, res) => {
    try {
        const { meetingId, peerId, consumerId } = req.params;

        const result = await resumeConsumer(
            meetingId,
            peerId,
            consumerId
        );

        return res.json(result);

    } catch (error) {
        console.error("Consumer resume error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};

export const closeRoomConsumer = (req, res) => {
    try {
        const { meetingId, peerId, consumerId } = req.params;

        const result = closeConsumer(
            meetingId,
            peerId,
            consumerId
        );

        return res.json(result);

    } catch (error) {
        console.error("Consumer close error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};


export const getRoomProducersController = (req, res) => {
    try {
        const { meetingId } = req.params;
        const { peerId } = req.query;

        if (!peerId) {
            return res.status(400).json({
                message: "peerId is required"
            });
        }

        const producers = getRoomProducers(meetingId, peerId);

        return res.json(producers);

    } catch (error) {
        console.error("Producer discovery error:", error);

        return res.status(404).json({
            message: error.message
        });
    }
};

export const closeRoomPeer = (req, res) => {
    try {
        const { meetingId, peerId } = req.params;

        const closed = closePeer(meetingId, peerId);

        return res.json({
            message: closed
                ? "Participant media connection closed"
                : "Participant media connection not found",
            closed
        });
    } catch (error) {
        console.error("Peer cleanup error:", error);

        return res.status(400).json({
            message: error.message
        });
    }
};
