import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import { Device } from "mediasoup-client";

import {
    Video, VideoOff, Mic, MicOff, MonitorUp, PhoneOff,
    Users, Copy, ShieldCheck, LoaderCircle, AlertCircle,
    Check, X, UserMinus, RefreshCw
} from "lucide-react";

import {
    getMeetingById,
    getMeetingParticipants,
    admitParticipant,
    rejectParticipant,
    removeParticipant,
    leaveMeeting,
    startMeeting,
    endMeeting
} from "../services/Meeting.js";

import "../styles/MeetingRoom.css";

// ============================================
// SFU CONFIGURATION
// ============================================

const SFU_URL =
    import.meta.env.VITE_SFU_URL || "http://localhost:4000";

const PRODUCER_POLL_INTERVAL = 2000;

async function sfuRequest(path, options = {}) {
    const token = localStorage.getItem("accessToken");

    const response = await fetch(`${SFU_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token
                ? { Authorization: `Bearer ${token}` }
                : {}),
            ...(options.headers || {})
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "SFU request failed"
        );
    }

    return data;
}

// ============================================
// AUTHENTICATED USER
// ============================================

function getCurrentUserEmail() {
    const token = localStorage.getItem("accessToken");

    try {
        if (!token) return localStorage.getItem("userEmail") || "";

        const payload = token.split(".")[1];

        const decoded = JSON.parse(
            atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        );

        return decoded.sub || decoded.email || "";
    } catch {
        return localStorage.getItem("userEmail") || "";
    }
}

// ============================================
// MEETING ROOM
// ============================================

function MeetingRoom() {
    const { meetingId } = useParams();
    const navigate = useNavigate();

    // ========================================
    // LOCAL MEDIA REFS
    // ========================================

    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // ========================================
    // WEBSOCKET REFS
    // ========================================

    const stompClientRef = useRef(null);
    const removedRef = useRef(false);

    // ========================================
    // MEDIASOUP REFS
    // ========================================

    const deviceRef = useRef(null);

    const sendTransportRef = useRef(null);
    const receiveTransportRef = useRef(null);

    const peerIdRef = useRef(null);

    const producersRef = useRef(new Map());
    const consumersRef = useRef(new Map());

    const remoteStreamsRef = useRef(new Map());

    const consumedProducerIdsRef = useRef(new Set());

    const producerPollRef = useRef(null);
    const sfuCleanupPromiseRef = useRef(null);

    // Prevent duplicate end-meeting requests
    const endingMeetingRef = useRef(false);

    // ========================================
    // GENERAL STATE
    // ========================================

    const [meeting, setMeeting] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [waitingParticipants, setWaitingParticipants] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [micEnabled, setMicEnabled] = useState(true);

    const [mediaLoading, setMediaLoading] = useState(true);
    const [mediaError, setMediaError] = useState("");

    const [error, setError] = useState("");
    const [copied, setCopied] = useState(false);

    const [actionLoading, setActionLoading] = useState("");
    const [webSocketConnected, setWebSocketConnected] = useState(false);

    // ========================================
    // MEDIASOUP STATE
    // ========================================

    const [sfuConnected, setSfuConnected] = useState(false);
    const [sfuError, setSfuError] = useState("");
    const [remoteStreams, setRemoteStreams] = useState([]);

    const currentEmail = getCurrentUserEmail();

    const screenStreamRef = useRef(null);
    const screenProducerRef = useRef(null);
    const screenVideoRef = useRef(null);

    const [screenShareEnabled, setScreenShareEnabled] = useState(false);
    const [screenShareLoading, setScreenShareLoading] = useState(false);

    const currentParticipant = participants.find(
        p => p.email?.toLowerCase() === currentEmail.toLowerCase()
    );

    const isHost =
        meeting?.hostEmail?.toLowerCase() === currentEmail.toLowerCase() ||
        currentParticipant?.role === "HOST";

    // ========================================
    // LOCAL MEDIA CLEANUP
    // ========================================

    const stopLocalMedia = useCallback(() => {
        streamRef.current?.getTracks().forEach(track => track.stop());

        streamRef.current = null;

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        setCameraEnabled(false);
        setMicEnabled(false);
    }, []);

    // ========================================
    // MEDIASOUP CLEANUP
    // ========================================

    const cleanupSfu = useCallback(async (closeEntireRoom = false) => {
        if (sfuCleanupPromiseRef.current) {
            return sfuCleanupPromiseRef.current;
        }

        const peerId = peerIdRef.current;

        if (!peerId && !closeEntireRoom) {
            return;
        }

        sfuCleanupPromiseRef.current = (async () => {
            if (producerPollRef.current) {
                clearInterval(producerPollRef.current);
                producerPollRef.current = null;
            }

            // Stop display capture before closing the mediasoup producers.
            if (screenStreamRef.current) {
                screenStreamRef.current.getTracks().forEach(track => {
                    track.onended = null;
                    track.stop();
                });
            }

            screenStreamRef.current = null;
            screenProducerRef.current = null;

            if (screenVideoRef.current) {
                screenVideoRef.current.srcObject = null;
            }

            setScreenShareEnabled(false);
            setScreenShareLoading(false);

            producersRef.current.forEach(producer => {
                try {
                    producer.close();
                } catch (err) {
                    console.warn("Producer cleanup error:", err);
                }
            });

            consumersRef.current.forEach(consumerData => {
                try {
                    consumerData.consumer.close();
                } catch (err) {
                    console.warn("Consumer cleanup error:", err);
                }
            });

            producersRef.current.clear();
            consumersRef.current.clear();
            consumedProducerIdsRef.current.clear();

            if (sendTransportRef.current) {
                try {
                    sendTransportRef.current.close();
                } catch (err) {
                    console.warn("Send transport cleanup error:", err);
                }

                sendTransportRef.current = null;
            }

            if (receiveTransportRef.current) {
                try {
                    receiveTransportRef.current.close();
                } catch (err) {
                    console.warn("Receive transport cleanup error:", err);
                }

                receiveTransportRef.current = null;
            }

            deviceRef.current = null;

            remoteStreamsRef.current.clear();
            setRemoteStreams([]);
            setSfuConnected(false);

            if (closeEntireRoom) {
                try {
                    await sfuRequest(`/api/rooms/${meetingId}`, {
                        method: "DELETE"
                    });
                } catch (err) {
                    console.warn("Room cleanup error:", err);
                }
            } else if (peerId) {
                try {
                    await sfuRequest(
                        `/api/rooms/${meetingId}/peers/${peerId}`,
                        { method: "DELETE" }
                    );
                } catch (err) {
                    console.warn("Peer cleanup error:", err);
                }
            }

            peerIdRef.current = null;
        })();

        try {
            await sfuCleanupPromiseRef.current;
        } finally {
            sfuCleanupPromiseRef.current = null;
        }
    }, [meetingId]);

    // ========================================
    // WEBSOCKET CLEANUP
    // ========================================

    const disconnectWebSocket = useCallback(() => {
        if (stompClientRef.current) {
            const client = stompClientRef.current;
            stompClientRef.current = null;

            if (client.active) {
                client.deactivate();
            }
        }

        setWebSocketConnected(false);
    }, []);

    // ========================================
    // EXIT WHEN REMOVED
    // ========================================

    const exitBecauseRemoved = useCallback(() => {
        if (removedRef.current) return;

        removedRef.current = true;

        cleanupSfu();
        stopLocalMedia();
        disconnectWebSocket();

        window.alert("The host has removed you from this meeting.");

        navigate("/dashboard", { replace: true });
    }, [
        cleanupSfu,
        stopLocalMedia,
        disconnectWebSocket,
        navigate
    ]);

    // ========================================
    // LOAD PARTICIPANTS
    // ========================================

    const loadParticipants = useCallback(async (showLoader = false) => {
        if (removedRef.current) return;

        if (showLoader) setRefreshing(true);

        try {
            const data = await getMeetingParticipants(meetingId);

            if (removedRef.current) return;

            const list = Array.isArray(data) ? data : [];

            setParticipants(list);

            const self = list.find(
                p => p.email?.toLowerCase() === currentEmail.toLowerCase()
            );

            if (
                self &&
                ["REMOVED", "REJECTED"].includes(self.status)
            ) {
                exitBecauseRemoved();
                return;
            }

            if (
                meeting?.hostEmail?.toLowerCase() === currentEmail.toLowerCase() ||
                list.some(p =>
                    p.role === "HOST" &&
                    p.email?.toLowerCase() === currentEmail.toLowerCase()
                )
            ) {
                setWaitingParticipants(
                    list.filter(p => p.status === "WAITING")
                );
            } else {
                setWaitingParticipants([]);
            }
        } catch (err) {
            console.error("Unable to refresh participants:", err);
        } finally {
            if (showLoader) setRefreshing(false);
        }
    }, [
        meetingId,
        currentEmail,
        meeting,
        exitBecauseRemoved
    ]);

    // ========================================
    // LOAD MEETING
    // ========================================

    useEffect(() => {
        let active = true;

        const load = async () => {
            try {
                const [meetingData, participantData] = await Promise.all([
                    getMeetingById(meetingId),
                    getMeetingParticipants(meetingId)
                ]);

                if (!active) return;

                setMeeting(meetingData);

                const list = Array.isArray(participantData)
                    ? participantData
                    : [];

                setParticipants(list);

                const self = list.find(
                    p => p.email?.toLowerCase() === currentEmail.toLowerCase()
                );

                if (
                    self &&
                    ["REMOVED", "REJECTED"].includes(self.status)
                ) {
                    exitBecauseRemoved();
                    return;
                }

                const isCurrentHost =
                    meetingData.hostEmail?.toLowerCase() ===
                    currentEmail.toLowerCase();

                if (isCurrentHost) {
                    setWaitingParticipants(
                        list.filter(p => p.status === "WAITING")
                    );
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message ||
                        "Unable to load meeting information."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        load();

        return () => {
            active = false;
        };
    }, [meetingId, currentEmail, exitBecauseRemoved]);
    // ========================================
    // WEBSOCKET CONNECTION
    // ========================================

    useEffect(() => {
        if (loading || !meeting || removedRef.current) return;

        const token = localStorage.getItem("accessToken");

        if (!token) {
            setError("Authentication token is missing.");
            return;
        }

        const client = new Client({
            brokerURL:
                import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws",

            connectHeaders: {
                Authorization: `Bearer ${token}`
            },

            reconnectDelay: 5000,
            heartbeatIncoming: 10000,
            heartbeatOutgoing: 10000,

            onConnect: () => {
                setWebSocketConnected(true);

                client.subscribe(
                    `/topic/meetings/${meetingId}`,
                    message => {
                        try {
                            const event = JSON.parse(message.body);

                            console.log("Meeting event received:", event);

                            if (
                                event.type === "PARTICIPANT_REMOVED" &&
                                event.participantEmail?.toLowerCase() ===
                                currentEmail.toLowerCase()
                            ) {
                                exitBecauseRemoved();
                                return;
                            }

                            if (event.type === "MEETING_ENDED") {
                                cleanupSfu();
                                stopLocalMedia();
                                disconnectWebSocket();

                                window.alert("The host has ended this meeting.");

                                navigate("/dashboard", { replace: true });
                                return;
                            }

                            loadParticipants();
                        } catch (err) {
                            console.error(
                                "Unable to process meeting event:",
                                err
                            );
                        }
                    }
                );
            },

            onDisconnect: () => {
                setWebSocketConnected(false);
            },

            onStompError: frame => {
                console.error(
                    "STOMP error:",
                    frame.headers?.message,
                    frame.body
                );

                setWebSocketConnected(false);
            },

            onWebSocketError: error => {
                console.error("WebSocket error:", error);
                setWebSocketConnected(false);
            }
        });

        stompClientRef.current = client;
        client.activate();

        return () => {
            if (stompClientRef.current === client) {
                stompClientRef.current = null;
            }

            client.deactivate();
            setWebSocketConnected(false);
        };
    }, [
        loading,
        meeting,
        meetingId,
        currentEmail,
        loadParticipants,
        exitBecauseRemoved,
        cleanupSfu,
        stopLocalMedia,
        disconnectWebSocket,
        navigate
    ]);

    // ========================================
    // PARTICIPANT POLLING FALLBACK
    // ========================================

    useEffect(() => {
        if (loading || !meeting || removedRef.current) return;

        const interval = setInterval(() => {
            loadParticipants();
        }, 4000);

        return () => clearInterval(interval);
    }, [loading, meeting, loadParticipants]);

    // ========================================
    // LOCAL CAMERA AND MICROPHONE
    // ========================================

    useEffect(() => {
        let active = true;

        const startMedia = async () => {
            try {
                if (!navigator.mediaDevices?.getUserMedia) {
                    throw new Error(
                        "Camera access requires HTTPS or localhost."
                    );
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                if (!active) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                setCameraEnabled(true);
                setMicEnabled(true);
            } catch (err) {
                if (active) setMediaError(err.message);
            } finally {
                if (active) setMediaLoading(false);
            }
        };

        startMedia();

        return () => {
            active = false;

            streamRef.current?.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        };
    }, []);

    // ========================================
    // MEDIASOUP CONSUMER DISCOVERY
    // ========================================


    const discoverProducers = useCallback(async () => {
        const device = deviceRef.current;
        const receiveTransport = receiveTransportRef.current;
        const peerId = peerIdRef.current;

        if (!device || !receiveTransport || !peerId) return;

        try {
            const producers = await sfuRequest(
                `/api/rooms/${meetingId}/producers?peerId=${encodeURIComponent(peerId)}`
            );

            if (!Array.isArray(producers)) return;

            const activeProducerIds = new Set(
                producers.map(producer => producer.producerId)
            );

            // Remove producers that no longer exist.
            for (const [consumerId, data] of consumersRef.current.entries()) {
                if (!activeProducerIds.has(data.producerId)) {
                    data.consumer.close();
                    consumersRef.current.delete(consumerId);
                    consumedProducerIdsRef.current.delete(data.producerId);
                    remoteStreamsRef.current.delete(data.producerId);
                }
            }

            setRemoteStreams(
                Array.from(remoteStreamsRef.current.values())
            );

            for (const producer of producers) {
                if (consumedProducerIdsRef.current.has(producer.producerId)) {
                    continue;
                }

                if (removedRef.current) return;

                consumedProducerIdsRef.current.add(producer.producerId);

                try {
                    const consumerData = await sfuRequest(
                        `/api/rooms/${meetingId}/consumers`,
                        {
                            method: "POST",
                            body: JSON.stringify({
                                peerId,
                                producerId: producer.producerId,
                                rtpCapabilities: device.rtpCapabilities
                            })
                        }
                    );

                    if (removedRef.current) return;

                    const consumer = await receiveTransport.consume({
                        id: consumerData.id,
                        producerId: consumerData.producerId,
                        kind: consumerData.kind,
                        rtpParameters: consumerData.rtpParameters
                    });

                    const source =
                        producer.appData?.source === "screen"
                            ? "screen"
                            : producer.kind === "audio"
                                ? "audio"
                                : "camera";

                    // Separate MediaStream for every producer.
                    const stream = new MediaStream([consumer.track]);

                    const mediaEntry = {
                        producerId: producer.producerId,
                        peerId: producer.peerId,
                        kind: producer.kind,
                        source,
                        stream
                    };

                    consumersRef.current.set(consumer.id, {
                        consumer,
                        producerId: producer.producerId,
                        peerId: producer.peerId
                    });

                    remoteStreamsRef.current.set(
                        producer.producerId,
                        mediaEntry
                    );

                    const removeConsumer = () => {
                        remoteStreamsRef.current.delete(producer.producerId);
                        consumersRef.current.delete(consumer.id);

                        setRemoteStreams(
                            Array.from(remoteStreamsRef.current.values())
                        );
                    };

                    consumer.on("trackended", removeConsumer);
                    consumer.on("transportclose", removeConsumer);

                    await sfuRequest(
                        `/api/rooms/${meetingId}/consumers/${peerId}/${consumer.id}/resume`,
                        { method: "PATCH" }
                    );

                    consumer.resume();

                    setRemoteStreams(
                        Array.from(remoteStreamsRef.current.values())
                    );

                    console.log(
                        "Consumed producer:",
                        producer.producerId,
                        source
                    );

                } catch (err) {
                    consumedProducerIdsRef.current.delete(
                        producer.producerId
                    );

                    console.error(
                        "Unable to consume producer:",
                        producer.producerId,
                        err
                    );
                }
            }
        } catch (err) {
            console.error("Producer discovery failed:", err);
        }
    }, [meetingId]);

    // ========================================
    // INITIALIZE MEDIASOUP
    // ========================================

    useEffect(() => {
        if (
            loading ||
            mediaLoading ||
            !meeting ||
            !currentParticipant ||
            currentParticipant.status !== "JOINED" ||
            !streamRef.current ||
            removedRef.current
        ) {
            return;
        }

        let cancelled = false;

        const initializeMediasoup = async () => {
            try {
                setSfuError("");

                const peerId = currentParticipant.id;

                peerIdRef.current = peerId;

                // 1. Create or retrieve the meeting room.
                const roomData = await sfuRequest("/api/rooms", {
                    method: "POST",
                    body: JSON.stringify({ meetingId })
                });

                if (cancelled) return;

                // 2. Initialize mediasoup Device.
                const device = new Device();

                await device.load({
                    routerRtpCapabilities: roomData.rtpCapabilities
                });

                if (cancelled) return;

                deviceRef.current = device;

                // 3. Create SEND transport.
                const sendData = await sfuRequest(
                    `/api/rooms/${meetingId}/transports`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            peerId,
                            direction: "send"
                        })
                    }
                );

                if (cancelled) return;

                const sendTransport = device.createSendTransport(
                    sendData.transport || sendData
                );

                sendTransportRef.current = sendTransport;

                sendTransport.on(
                    "connect",
                    ({ dtlsParameters }, callback, errback) => {
                        sfuRequest(
                            `/api/rooms/${meetingId}/transports/connect`,
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    peerId,
                                    transportId: sendTransport.id,
                                    dtlsParameters
                                })
                            }
                        )
                            .then(() => callback())
                            .catch(errback);
                    }
                );

                sendTransport.on(
                    "produce",
                    ({ kind, rtpParameters, appData }, callback, errback) => {
                        sfuRequest(
                            `/api/rooms/${meetingId}/producers`,
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    peerId,
                                    transportId: sendTransport.id,
                                    kind,
                                    rtpParameters,
                                    appData
                                })
                            }
                        )
                            .then(data => callback({ id: data.id }))
                            .catch(errback);
                    }
                );

                sendTransport.on("connectionstatechange", state => {
                    console.log("Send transport state:", state);
                });

                // 4. Create RECEIVE transport.
                const receiveData = await sfuRequest(
                    `/api/rooms/${meetingId}/transports`,
                    {
                        method: "POST",
                        body: JSON.stringify({
                            peerId,
                            direction: "receive"
                        })
                    }
                );

                if (cancelled) return;

                const receiveTransport = device.createRecvTransport(
                    receiveData.transport || receiveData
                );

                receiveTransportRef.current = receiveTransport;

                receiveTransport.on(
                    "connect",
                    ({ dtlsParameters }, callback, errback) => {
                        sfuRequest(
                            `/api/rooms/${meetingId}/transports/connect`,
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    peerId,
                                    transportId: receiveTransport.id,
                                    dtlsParameters
                                })
                            }
                        )
                            .then(() => callback())
                            .catch(errback);
                    }
                );

                receiveTransport.on("connectionstatechange", state => {
                    console.log("Receive transport state:", state);
                });

                if (cancelled) return;

                // 5. Publish local camera and microphone tracks.
                const localStream = streamRef.current;

                for (const track of localStream.getTracks()) {
                    if (cancelled) return;

                    const producer = await sendTransport.produce({
                        track,
                        appData: {
                            mediaType: track.kind
                        }
                    });

                    producersRef.current.set(producer.id, producer);

                    producer.on("trackended", () => {
                        console.log("Local track ended:", track.kind);
                    });

                    producer.on("transportclose", () => {
                        producersRef.current.delete(producer.id);
                    });
                }

                if (cancelled) return;

                setSfuConnected(true);

                console.log("MeetFlow mediasoup connected.");

                // 6. Discover and consume remote producers.
                await discoverProducers();

                if (cancelled) return;

                // 7. Poll for new producers.
                producerPollRef.current = setInterval(() => {
                    discoverProducers();
                }, PRODUCER_POLL_INTERVAL);

            } catch (err) {
                console.error("Mediasoup initialization failed:", err);

                if (!cancelled) {
                    setSfuError(
                        err.message || "Unable to connect to the media server."
                    );

                    setSfuConnected(false);
                }
            }
        };

        initializeMediasoup();

        return () => {
            cancelled = true;

            if (producerPollRef.current) {
                clearInterval(producerPollRef.current);
                producerPollRef.current = null;
            }

            // Close local resources and remove this peer.
            cleanupSfu();
        };
    }, [
        loading,
        mediaLoading,
        meeting,
        meetingId,
        currentParticipant?.id,
        currentParticipant?.status,
        discoverProducers,
        cleanupSfu
    ]);
    // ========================================
    // SCREEN SHARING
    // ========================================

    const stopScreenShare = useCallback(async () => {
        const producer = screenProducerRef.current;
        const peerId = peerIdRef.current;

        // Clear the ref first so repeated stop events are harmless.
        screenProducerRef.current = null;

        if (producer) {
            try {
                if (peerId) {
                    await sfuRequest(
                        `/api/rooms/${meetingId}/producers/${peerId}/${producer.id}`,
                        { method: "DELETE" }
                    );
                }
            } catch (err) {
                // Closing the local producer and peer cleanup still release
                // the media resources if the SFU delete request fails.
                console.warn("Unable to delete screen producer:", err);
            }

            try {
                producer.close();
            } catch (err) {
                console.warn("Unable to close screen producer:", err);
            }

            producersRef.current.delete(producer.id);
        }

        const screenStream = screenStreamRef.current;
        screenStreamRef.current = null;

        if (screenStream) {
            screenStream.getTracks().forEach(track => {
                track.onended = null;
                track.stop();
            });
        }

        if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = null;
        }

        setScreenShareEnabled(false);
        setScreenShareLoading(false);
    }, [meetingId]);

    const startScreenShare = async () => {
        if (meeting?.status !== "LIVE") {
            setSfuError("Screen sharing is available only during a live meeting.");
            return;
        }

        if (!currentParticipant || currentParticipant.status !== "JOINED") {
            setSfuError("You must be admitted to the meeting before sharing your screen.");
            return;
        }

        if (!sendTransportRef.current || !sfuConnected) {
            setSfuError("The media connection is not ready. Please try again.");
            return;
        }

        if (screenShareEnabled || screenShareLoading) return;

        if (!navigator.mediaDevices?.getDisplayMedia) {
            setSfuError("Screen sharing is not supported by this browser. Use a recent version of Chrome or Edge.");
            return;
        }

        setScreenShareLoading(true);
        setSfuError("");

        let displayStream = null;

        try {
            // This call must happen directly from the Share button click.
            displayStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: { ideal: 30, max: 30 }
                },
                audio: false
            });

            const screenTrack = displayStream.getVideoTracks()[0];

            if (!screenTrack) {
                throw new Error("The selected screen did not provide a video track.");
            }

            screenStreamRef.current = displayStream;

            const producer = await sendTransportRef.current.produce({
                track: screenTrack,
                appData: {
                    source: "screen",
                    mediaType: "screen"
                }
            });

            screenProducerRef.current = producer;
            producersRef.current.set(producer.id, producer);

            producer.on("transportclose", () => {
                producersRef.current.delete(producer.id);

                if (screenProducerRef.current?.id === producer.id) {
                    screenProducerRef.current = null;
                }

                const activeStream = screenStreamRef.current;
                screenStreamRef.current = null;

                activeStream?.getTracks().forEach(track => {
                    track.onended = null;
                    track.stop();
                });

                if (screenVideoRef.current) {
                    screenVideoRef.current.srcObject = null;
                }

                setScreenShareEnabled(false);
            });

            // Also handle the browser's native "Stop sharing" control.
            screenTrack.onended = () => {
                stopScreenShare();
            };

            setScreenShareEnabled(true);
        } catch (err) {
            console.error("Unable to start screen sharing:", err);

            displayStream?.getTracks().forEach(track => {
                track.onended = null;
                track.stop();
            });

            screenStreamRef.current = null;
            screenProducerRef.current = null;

            if (err.name !== "NotAllowedError" && err.name !== "AbortError") {
                setSfuError(err.message || "Unable to start screen sharing.");
            }
        } finally {
            setScreenShareLoading(false);
        }
    };

    // ========================================
    // MICROPHONE CONTROL
    // ========================================

    const toggleMicrophone = () => {
        const next = !micEnabled;

        streamRef.current?.getAudioTracks().forEach(track => {
            track.enabled = next;
        });

        setMicEnabled(next);
    };

    // ========================================
    // CAMERA CONTROL
    // ========================================

    const toggleCamera = () => {
        const next = !cameraEnabled;

        streamRef.current?.getVideoTracks().forEach(track => {
            track.enabled = next;
        });

        setCameraEnabled(next);
    };

    // ========================================
    // COPY MEETING CODE
    // ========================================

    const copyMeetingCode = async () => {
        try {
            await navigator.clipboard.writeText(meeting.meetingCode);

            setCopied(true);

            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError("Unable to copy meeting code.");
        }
    };

    // ========================================
    // HOST PARTICIPANT ACTIONS
    // ========================================

    const runParticipantAction = async (participantId, action) => {
        setActionLoading(`${action}-${participantId}`);
        setError("");

        try {
            if (action === "admit") {
                await admitParticipant(meetingId, participantId);
            } else if (action === "reject") {
                await rejectParticipant(meetingId, participantId);
            } else if (action === "remove") {
                await removeParticipant(meetingId, participantId);
            }

            await loadParticipants();
        } catch (err) {
            setError(
                err.response?.data?.message ||
                `Unable to ${action} participant.`
            );
        } finally {
            setActionLoading("");
        }
    };

    // ========================================
    // START MEETING
    // ========================================

    const handleStartMeeting = async () => {
        if (!isHost || meeting?.status !== "SCHEDULED") {
            return;
        }

        setActionLoading("start");
        setError("");

        try {
            const updatedMeeting = await startMeeting(meetingId);

            setMeeting(updatedMeeting);

        } catch (err) {
            console.error("Start meeting failed:", err);

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                "Unable to start meeting."
            );
        } finally {
            setActionLoading("");
        }
    };

    // ========================================
    // LEAVE MEETING
    // ========================================

    const handleLeave = async () => {
        if (actionLoading) return;

        setActionLoading("leave");
        setError("");

        try {
            console.log("Leaving meeting:", meetingId);

            // Step 1: Update participant status in backend
            try {
                await leaveMeeting(meetingId);
                console.log("Leave meeting API successful");
            } catch (err) {
                console.error("Leave API failed:", {
                    status: err.response?.status,
                    response: err.response?.data,
                    message: err.message
                });

                throw new Error(
                    err.response?.data?.message ||
                    err.response?.data?.error ||
                    `Unable to leave meeting. HTTP ${
                        err.response?.status || "Network Error"
                    }`
                );
            }

            // Step 2: Disconnect participant from mediasoup
            try {
                await cleanupSfu(false);
                console.log("SFU cleanup successful");
            } catch (err) {
                console.error("SFU cleanup failed:", err);
            }

            // Step 3: Stop local camera and microphone
            stopLocalMedia();

            // Step 4: Disconnect WebSocket
            disconnectWebSocket();

            // Step 5: Navigate to dashboard
            navigate("/dashboard", { replace: true });

        } catch (err) {
            console.error("Leave meeting failed:", err);

            setError(
                err.message || "Unable to leave the meeting."
            );

        } finally {
            setActionLoading("");
        }
    };

    // ========================================
    // END MEETING
    // ========================================

    const handleEndMeeting = async () => {
        if (endingMeetingRef.current || actionLoading) return;

        if (!isHost || meeting?.status !== "LIVE") {
            setError("Only the host can end a live meeting.");
            return;
        }

        if (!window.confirm("End this meeting for everyone?")) {
            return;
        }

        endingMeetingRef.current = true;
        setActionLoading("end");
        setError("");

        try {
            console.log("Ending meeting:", meetingId);

            // 1. End meeting in Spring Boot.
            // The backend must successfully update the database.
            const response = await endMeeting(meetingId);

            console.log("Meeting ended successfully:", response);

            // 2. Update local meeting state.
            setMeeting(previous => ({
                ...previous,
                ...response,
                status: "ENDED"
            }));

            // 3. Stop local camera and microphone.
            stopLocalMedia();

            // 4. Disconnect WebSocket.
            disconnectWebSocket();

            // 5. Navigate to dashboard.
            navigate("/dashboard", { replace: true });

            // 6. Delete SFU room in the background.
            cleanupSfu(true).catch(err => {
                console.error("SFU room cleanup failed:", err);
            });

        } catch (err) {
            console.error("End meeting failed:", {
                status: err.response?.status,
                response: err.response?.data,
                message: err.message
            });

            setError(
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                "Unable to end meeting."
            );

            endingMeetingRef.current = false;

        } finally {
            setActionLoading("");
        }
    };

    // ========================================
    // LOADING SCREEN
    // ========================================

    if (loading) {
        return (
            <div className="room-loading">
                <LoaderCircle className="room-spin" size={32} />
                <p>Loading your meeting...</p>
            </div>
        );
    }

    // ========================================
    // ERROR SCREEN
    // ========================================

    if (!meeting || (error && !participants.length)) {
        return (
            <div className="room-loading">
                <AlertCircle size={32} />
                <h2>Unable to open meeting</h2>
                <p>{error || "Meeting not found."}</p>
                <Link to="/dashboard">Back to Dashboard</Link>
            </div>
        );
    }

    const joinedParticipants = participants.filter(
        p => p.status === "JOINED"
    );

    const hasActiveScreenShare =
        screenShareEnabled ||
        remoteStreams.some(
            media => media.kind === "video" && media.source === "screen"
        );

    // ========================================
    // MEETING UI
    // ========================================

    return (
        <div className="meeting-room">

            {/* HEADER */}

            <header className="room-header">
                <Link to="/dashboard" className="room-brand">
                    <Video size={21} />
                    MeetFlow
                </Link>

                <div className="room-meeting-info">
                    <h1>{meeting.title}</h1>
                    <span>Meeting code: {meeting.meetingCode}</span>
                </div>

                <div className="room-header-actions">
                    <button
                        className="room-copy-button"
                        onClick={copyMeetingCode}
                    >
                        <Copy size={15} />
                        {copied ? "Copied!" : "Copy invite"}
                    </button>

                    <div className="room-secure-label">
                        <ShieldCheck size={15} /> Secure
                    </div>

                    <div className={
                             webSocketConnected
                                 ? "websocket-connected"
                                 : "websocket-disconnected"
                         }>
                        <span />
                        {webSocketConnected ? "Connected" : "Reconnecting"}
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT */}

            <main className="room-content">

                {/* VIDEO SECTION */}

                <section className="room-video-section">

                    <div className="room-section-heading">
                        <div>
                            <h2>Meeting room</h2>
                            <p>{meeting.status}</p>
                        </div>

                        <div className="room-live-indicator">
                            <span />
                            {sfuConnected
                                ? "Live media connected"
                                : "Connecting media"}
                        </div>
                    </div>

                    {/* VIDEO GRID */}

                    <div
                        className={`room-video-grid ${
                            hasActiveScreenShare ? "has-screen-share" : ""
                        }`}
                    >

                        {/* LOCAL VIDEO */}

                        <div
                            className={`video-tile local-video-tile ${
                                hasActiveScreenShare ? "camera-overlay-tile" : ""
                            }`}
                        >

                            {mediaLoading && (
                                <div className="video-placeholder">
                                    <LoaderCircle className="room-spin" />
                                    <span>Starting camera...</span>
                                </div>
                            )}

                            {mediaError && (
                                <div className="video-placeholder">
                                    <AlertCircle size={30} />
                                    <span>Camera unavailable</span>
                                    <small>{mediaError}</small>
                                </div>
                            )}

                            <video
                                ref={videoRef}
                                autoPlay
                                muted
                                playsInline
                                className={
                                    cameraEnabled && !mediaError
                                        ? "local-video"
                                        : "local-video hidden-video"
                                }
                            />

                            {!cameraEnabled && !mediaError && (
                                <div className="video-camera-off">
                                    <div className="video-avatar">You</div>
                                    <span>Camera is off</span>
                                </div>
                            )}

                            <div className="video-tile-footer">
                                <span>You {isHost ? "(Host)" : ""}</span>

                                <div className="video-status-icons">
                                    {!micEnabled && <MicOff size={15} />}
                                    {!cameraEnabled && <VideoOff size={15} />}
                                </div>
                            </div>
                        </div>

                        {/* LOCAL SCREEN SHARE PREVIEW */}

                        {screenShareEnabled && (
                            <div className="video-tile screen-share-tile">
                                <video
                                    ref={element => {
                                        screenVideoRef.current = element;

                                        if (
                                            element &&
                                            screenStreamRef.current &&
                                            element.srcObject !== screenStreamRef.current
                                        ) {
                                            element.srcObject = screenStreamRef.current;
                                            element.play().catch(() => {});
                                        }
                                    }}
                                    autoPlay
                                    muted
                                    playsInline
                                />

                                <div className="video-tile-footer">
                                    <span>You are sharing your screen</span>
                                </div>
                            </div>
                        )}

                        {/* REMOTE AUDIO PRODUCERS */}

                        {remoteStreams
                            .filter(media => media.kind === "audio")
                            .map(media => (
                                <audio
                                    key={media.producerId}
                                    autoPlay
                                    playsInline
                                    ref={element => {
                                        if (
                                            element &&
                                            element.srcObject !== media.stream
                                        ) {
                                            element.srcObject = media.stream;
                                            element.play().catch(() => {});
                                        }
                                    }}
                                />
                            ))}

                        {/* REMOTE CAMERA AND SCREEN VIDEO PRODUCERS */}

                        {remoteStreams
                            .filter(media => media.kind === "video")
                            .map(media => {
                                const participant = participants.find(
                                    p => p.id === media.peerId
                                );

                                const isScreen = media.source === "screen";

                                return (
                                    <div
                                        className={`video-tile remote-video-tile ${
                                            isScreen ? "screen-share-tile" : ""
                                        }`}
                                        key={media.producerId}
                                    >
                                        <video
                                            autoPlay
                                            playsInline
                                            ref={element => {
                                                if (
                                                    element &&
                                                    element.srcObject !== media.stream
                                                ) {
                                                    element.srcObject = media.stream;
                                                    element.play().catch(() => {});
                                                }
                                            }}
                                            className="local-video"
                                        />

                                        <div className="video-tile-footer">
                                            <span>
                                                {isScreen
                                                    ? `${participant?.fullName || "Participant"} · Screen`
                                                    : `${participant?.fullName || "Participant"}${
                                                        participant?.role === "HOST"
                                                            ? " (Host)"
                                                            : ""
                                                    }`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}

                        {/* EMPTY STATE */}


                        {/* EMPTY STATE */}

                        {!hasActiveScreenShare &&
                            !remoteStreams.some(media => media.kind === "video") && (
                                <div className="video-tile empty-video-tile">
                                    <div className="empty-video-content">
                                        <Users size={35} />

                                        <h3>Waiting for participants</h3>

                                        <p>
                                            Other participants' audio and video
                                            will appear here when they join.
                                        </p>
                                    </div>
                                </div>
                            )}
                    </div>

                    {mediaError && (
                        <div className="room-media-warning">
                            <AlertCircle size={17} />
                            {mediaError}
                        </div>
                    )}

                    {sfuError && (
                        <div className="room-media-warning">
                            <AlertCircle size={17} />
                            Media server: {sfuError}
                        </div>
                    )}
                </section>
                {/* SIDEBAR */}

                <aside className="room-sidebar">

                    <div className="room-sidebar-tabs">
                        <div className="room-sidebar-tab active">
                            <Users size={17} /> Participants
                        </div>
                    </div>

                    <div className="room-participant-count">
                        <h3>Participants</h3>
                        <span>{joinedParticipants.length}</span>

                        <button
                            className="participant-refresh"
                            onClick={() => loadParticipants(true)}
                            title="Refresh participants"
                        >
                            <RefreshCw
                                size={15}
                                className={refreshing ? "room-spin" : ""}
                            />
                        </button>
                    </div>

                    {/* PARTICIPANTS */}

                    {participants.map(participant => (
                        <div
                            className="room-participant"
                            key={participant.id}
                        >
                            <div className="participant-avatar">
                                {participant.fullName
                                    ?.charAt(0)
                                    ?.toUpperCase() || "U"}
                            </div>

                            <div className="participant-info">
                                <strong>
                                    {participant.fullName || participant.email}
                                    {participant.email?.toLowerCase() ===
                                    currentEmail.toLowerCase()
                                        ? " (You)"
                                        : ""}
                                </strong>

                                <span>{participant.role}</span>

                                <span className={`participant-status status-${participant.status?.toLowerCase()}`}>
                                    {participant.status}
                                </span>
                            </div>

                            {isHost &&
                                participant.role !== "HOST" &&
                                participant.status === "JOINED" && (
                                    <button
                                        className="participant-action remove"
                                        title="Remove participant"
                                        disabled={!!actionLoading}
                                        onClick={() =>
                                            runParticipantAction(
                                                participant.id,
                                                "remove"
                                            )
                                        }
                                    >
                                        <UserMinus size={16} />
                                    </button>
                                )}
                        </div>
                    ))}

                    {/* WAITING ROOM */}

                    {isHost && (
                        <div className="waiting-room-panel">

                            <div className="waiting-room-heading">
                                <h3>Waiting room</h3>
                                <span>{waitingParticipants.length}</span>
                            </div>

                            {waitingParticipants.length === 0 ? (
                                <p className="waiting-empty">
                                    No participants waiting.
                                </p>
                            ) : (
                                waitingParticipants.map(participant => (
                                    <div
                                        className="waiting-participant"
                                        key={participant.id}
                                    >
                                        <div>
                                            <strong>{participant.fullName}</strong>
                                            <small>{participant.email}</small>
                                        </div>

                                        <div className="waiting-actions">
                                            <button
                                                title="Admit participant"
                                                disabled={!!actionLoading}
                                                onClick={() =>
                                                    runParticipantAction(
                                                        participant.id,
                                                        "admit"
                                                    )
                                                }
                                            >
                                                {actionLoading ===
                                                `admit-${participant.id}`
                                                    ? <LoaderCircle size={16} />
                                                    : <Check size={16} />}
                                            </button>

                                            <button
                                                title="Reject participant"
                                                disabled={!!actionLoading}
                                                onClick={() =>
                                                    runParticipantAction(
                                                        participant.id,
                                                        "reject"
                                                    )
                                                }
                                            >
                                                {actionLoading ===
                                                `reject-${participant.id}`
                                                    ? <LoaderCircle size={16} />
                                                    : <X size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* INVITE BOX */}

                    <div className="room-invite-box">
                        <Users size={23} />
                        <h3>Invite your team</h3>
                        <p>Share your meeting code with others.</p>

                        <button onClick={copyMeetingCode}>
                            <Copy size={15} />
                            {copied ? "Copied!" : "Copy code"}
                        </button>
                    </div>
                </aside>
            </main>

            {/* ACTION ERROR */}

            {error && (
                <div className="room-action-error">{error}</div>
            )}

            {/* FOOTER CONTROLS */}

            <footer className="room-controls">

                <div className="room-controls-left">
                    <span className="room-control-meeting-name">
                        {meeting.title}
                    </span>
                </div>

                <div className="room-controls-center">

                    <button
                        className={`control-button ${!micEnabled ? "control-disabled" : ""}`}
                        onClick={toggleMicrophone}
                        disabled={meeting.status !== "LIVE"}
                    >
                        {micEnabled
                            ? <Mic size={21} />
                            : <MicOff size={21} />}
                        <span>{micEnabled ? "Mute" : "Unmute"}</span>
                    </button>

                    <button
                        className={`control-button ${!cameraEnabled ? "control-disabled" : ""}`}
                        onClick={toggleCamera}
                        disabled={meeting.status !== "LIVE"}
                    >
                        {cameraEnabled
                            ? <Video size={21} />
                            : <VideoOff size={21} />}
                        <span>Camera</span>
                    </button>

                    <button
                        className={`control-button ${
                            screenShareEnabled ? "control-disabled" : ""
                        }`}
                        onClick={
                            screenShareEnabled
                                ? stopScreenShare
                                : startScreenShare
                        }
                        disabled={
                            meeting.status !== "LIVE" ||
                            !sfuConnected ||
                            screenShareLoading
                        }
                        title={
                            meeting.status !== "LIVE"
                                ? "Start the meeting before sharing"
                                : "Share your screen"
                        }
                    >
                        {screenShareLoading
                            ? <LoaderCircle size={21} className="room-spin" />
                            : <MonitorUp size={21} />
                        }
                        <span>
                            {screenShareLoading
                                ? "Starting..."
                                : screenShareEnabled
                                    ? "Stop sharing"
                                    : "Share screen"
                            }
                        </span>
                    </button>
                </div>

                <div className="room-controls-right">
                    {isHost ? (
                        meeting.status === "LIVE" ? (
                            <button
                                className="leave-meeting-button"
                                onClick={handleEndMeeting}
                                disabled={!!actionLoading}
                            >
                                <PhoneOff size={20} />
                                {actionLoading === "end"
                                    ? "Ending..."
                                    : "End meeting"}
                            </button>
                        ) : meeting.status === "SCHEDULED" ? (
                            <button
                                className="leave-meeting-button"
                                onClick={handleStartMeeting}
                                disabled={!!actionLoading}
                            >
                                <Video size={20} />
                                {actionLoading === "start"
                                    ? "Starting..."
                                    : "Start meeting"}
                            </button>
                        ) : (
                            <span>{meeting.status}</span>
                        )
                    ) : (
                        <button
                            className="leave-meeting-button"
                            onClick={handleLeave}
                            disabled={!!actionLoading}
                        >
                            <PhoneOff size={20} />
                            {actionLoading === "leave"
                                ? "Leaving..."
                                : "Leave"}
                        </button>
                    )}
                </div>
            </footer>
        </div>
    );
}

export default MeetingRoom;