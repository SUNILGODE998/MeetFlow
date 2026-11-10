
import { createWorker } from "mediasoup";
import { mediasoupConfig } from "../config/mediasoup.config.js";

let worker;

const rooms = new Map();

// ============================================
// WORKER
// ============================================

export const createMediasoupWorker = async () => {
    worker = await createWorker({
        logLevel: mediasoupConfig.worker.logLevel,
        rtcMinPort: mediasoupConfig.worker.rtcMinPort,
        rtcMaxPort: mediasoupConfig.worker.rtcMaxPort
    });

    console.log(`Mediasoup worker created: ${worker.pid}`);

    worker.on("died", () => {
        console.error("Mediasoup worker died. Exiting process.");
        process.exit(1);
    });

    return worker;
};

export const getMediasoupWorker = () => {
    if (!worker || worker.closed) {
        throw new Error("Mediasoup worker is not available");
    }

    return worker;
};

// ============================================
// ROOM MANAGEMENT
// ============================================

export const createRoom = async (meetingId) => {
    if (rooms.has(meetingId)) {
        return rooms.get(meetingId);
    }

    const currentWorker = getMediasoupWorker();

    const router = await currentWorker.createRouter({
        mediaCodecs: mediasoupConfig.router.mediaCodecs
    });

    const room = {
        meetingId,
        router,
        peers: new Map()
    };

    rooms.set(meetingId, room);

    router.on("workerclose", () => {
        rooms.delete(meetingId);
    });

    console.log(`Room created: ${meetingId}`);

    return room;
};

export const getRoom = (meetingId) => {
    return rooms.get(meetingId);
};

export const closeRoom = (meetingId) => {
    const room = getRoom(meetingId);

    if (!room) {
        return false;
    }

    room.router.close();
    rooms.delete(meetingId);

    console.log(`Room closed: ${meetingId}`);

    return true;
};

// ============================================
// TRANSPORT MANAGEMENT
// ============================================

export const createWebRtcTransport = async (
    meetingId,
    peerId,
    direction
) => {
    const room = getRoom(meetingId);

    if (!room) {
        throw new Error("Meeting room not found");
    }

    if (!["send", "receive"].includes(direction)) {
        throw new Error("Direction must be send or receive");
    }

    let peer = room.peers.get(peerId);

    if (!peer) {
        peer = {
            sendTransport: null,
            receiveTransport: null,
            producers: new Map(),
            consumers: new Map()
        };

        room.peers.set(peerId, peer);
    }

    const transportKey =
        direction === "send" ? "sendTransport" : "receiveTransport";

    if (peer[transportKey] && !peer[transportKey].closed) {
        throw new Error(`${direction} transport already exists for this peer`);
    }

    const transport = await room.router.createWebRtcTransport({
        listenInfos: mediasoupConfig.webRtcTransport.listenInfos,
        initialAvailableOutgoingBitrate:
        mediasoupConfig.webRtcTransport.initialAvailableOutgoingBitrate,
        appData: {
            peerId,
            direction
        }
    });

    peer[transportKey] = transport;

    transport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
            transport.close();
        }
    });

    transport.on("close", () => {
        if (peer[transportKey]?.id === transport.id) {
            peer[transportKey] = null;
        }
    });

    console.log(
        `Transport created: ${transport.id}, peer: ${peerId}, direction: ${direction}`
    );

    return {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters
    };
};

export const connectWebRtcTransport = async (
    meetingId,
    peerId,
    transportId,
    dtlsParameters
) => {
    const room = getRoom(meetingId);

    if (!room) {
        throw new Error("Meeting room not found");
    }

    const peer = room.peers.get(peerId);

    if (!peer) {
        throw new Error("Participant not found");
    }

    const transport = [
        peer.sendTransport,
        peer.receiveTransport
    ].find(
        (item) => item && !item.closed && item.id === transportId
    );

    if (!transport) {
        throw new Error("Transport not found");
    }

    await transport.connect({ dtlsParameters });

    return {
        connected: true,
        transportId
    };
};

// ============================================
// PRODUCER MANAGEMENT
// ============================================

export const createProducer = async (
    meetingId,
    peerId,
    transportId,
    kind,
    rtpParameters,
    appData = {}
) => {
    const room = getRoom(meetingId);

    if (!room) {
        throw new Error("Meeting room not found");
    }

    const peer = room.peers.get(peerId);

    if (!peer) {
        throw new Error("Participant not found");
    }

    if (!["audio", "video"].includes(kind)) {
        throw new Error("Producer kind must be audio or video");
    }

    const transport = peer.sendTransport;

    if (!transport || transport.closed || transport.id !== transportId) {
        throw new Error("Valid send transport not found");
    }

    const producer = await transport.produce({
        kind,
        rtpParameters,
        appData
    });

    peer.producers.set(producer.id, producer);

    producer.on("transportclose", () => {
        peer.producers.delete(producer.id);
    });

    producer.on("close", () => {
        peer.producers.delete(producer.id);
    });

    console.log(
        `Producer created: ${producer.id}, peer: ${peerId}, kind: ${kind}`
    );

    return {
        id: producer.id,
        kind: producer.kind,
        type: producer.type,
        paused: producer.paused,
        appData: producer.appData
    };
};

const getProducer = (meetingId, peerId, producerId) => {
    const room = getRoom(meetingId);

    if (!room) {
        throw new Error("Meeting room not found");
    }

    const peer = room.peers.get(peerId);

    if (!peer) {
        throw new Error("Participant not found");
    }

    const producer = peer.producers.get(producerId);

    if (!producer || producer.closed) {
        throw new Error("Producer not found");
    }

    return producer;
};

export const pauseProducer = async (
    meetingId,
    peerId,
    producerId
) => {
    const producer = getProducer(meetingId, peerId, producerId);

    await producer.pause();

    return {
        producerId,
        paused: producer.paused
    };
};

export const resumeProducer = async (
    meetingId,
    peerId,
    producerId
) => {
    const producer = getProducer(meetingId, peerId, producerId);

    await producer.resume();

    return {
        producerId,
        paused: producer.paused
    };
};

export const closeProducer = (
    meetingId,
    peerId,
    producerId
) => {
    const producer = getProducer(meetingId, peerId, producerId);

    producer.close();

    return {
        producerId,
        closed: true
    };
};

// ============================================
// CONSUMER MANAGEMENT
// ============================================

const getProducerFromRoom = (room, producerId) => {
    for (const peer of room.peers.values()) {
        const producer = peer.producers.get(producerId);

        if (producer && !producer.closed) {
            return producer;
        }
    }

    throw new Error("Producer not found in meeting room");
};

export const createConsumer = async (
    meetingId,
    peerId,
    producerId,
    rtpCapabilities
) => {
    const room = getRoom(meetingId);

    if (!room) {
        throw new Error("Meeting room not found");
    }

    const peer = room.peers.get(peerId);

    if (!peer) {
        throw new Error("Participant not found");
    }

    const receiveTransport = peer.receiveTransport;

    if (!receiveTransport || receiveTransport.closed) {
        throw new Error("Receive transport not found");
    }

    const producer = getProducerFromRoom(room, producerId);

    if (!room.router.canConsume({
        producerId,
        rtpCapabilities
    })) {
        throw new Error("Participant cannot consume this producer");
    }

    const consumer = await receiveTransport.consume({
        producerId,
        rtpCapabilities,
        paused: true
    });

    peer.consumers.set(consumer.id, consumer);

    consumer.on("transportclose", () => {
        peer.consumers.delete(consumer.id);
    });

    consumer.on("producerclose", () => {
        peer.consumers.delete(consumer.id);
    });

    consumer.on("close", () => {
        peer.consumers.delete(consumer.id);
    });

    console.log(
        `Consumer created: ${consumer.id}, peer: ${peerId}, producer: ${producerId}`
    );

    return {
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        type: consumer.type,
        producerPaused: producer.paused
    };
};

export const resumeConsumer = async (
    meetingId,
    peerId,
    consumerId
) => {
    const room = getRoom(meetingId);

    if (!room) {
        throw new Error("Meeting room not found");
    }

    const peer = room.peers.get(peerId);

    if (!peer) {
        throw new Error("Participant not found");
    }

    const consumer = peer.consumers.get(consumerId);

    if (!consumer || consumer.closed) {
        throw new Error("Consumer not found");
    }

    await consumer.resume();

    return {
        consumerId,
        resumed: true
    };
};

export const closeConsumer = (
    meetingId,
    peerId,
    consumerId
) => {
    const room = getRoom(meetingId);

    if (!room) {
        throw new Error("Meeting room not found");
    }

    const peer = room.peers.get(peerId);

    if (!peer) {
        throw new Error("Participant not found");
    }

    const consumer = peer.consumers.get(consumerId);

    if (!consumer || consumer.closed) {
        throw new Error("Consumer not found");
    }

    consumer.close();

    return {
        consumerId,
        closed: true
    };
};

// ============================================
// PEER CLEANUP
// ============================================

export const closePeer = (meetingId, peerId) => {
    const room = getRoom(meetingId);

    if (!room) {
        return false;
    }

    const peer = room.peers.get(peerId);

    if (!peer) {
        return false;
    }

    if (peer.sendTransport && !peer.sendTransport.closed) {
        peer.sendTransport.close();
    }

    if (peer.receiveTransport && !peer.receiveTransport.closed) {
        peer.receiveTransport.close();
    }

    for (const producer of peer.producers.values()) {
        if (!producer.closed) {
            producer.close();
        }
    }

    for (const consumer of peer.consumers.values()) {
        if (!consumer.closed) {
            consumer.close();
        }
    }

    room.peers.delete(peerId);

    console.log(`Peer removed: ${peerId} from room: ${meetingId}`);

    return true;
};

// ============================================
// PRODUCER DISCOVERY
// ============================================

export const getRoomProducers = (meetingId, excludePeerId) => {
    const room = getRoom(meetingId);

    if (!room) {
        throw new Error("Meeting room not found");
    }

    const producers = [];

    for (const [peerId, peer] of room.peers.entries()) {
        if (peerId === excludePeerId) {
            continue;
        }

        for (const producer of peer.producers.values()) {
            if (!producer.closed) {
                producers.push({
                    producerId: producer.id,
                    peerId,
                    kind: producer.kind,
                    appData: producer.appData
                });
            }
        }
    }

    return producers;
};
