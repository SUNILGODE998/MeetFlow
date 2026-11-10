
export const mediasoupConfig = {
    worker: {
        logLevel: "warn",
        rtcMinPort: 40000,
        rtcMaxPort: 40100
    },

    router: {
        mediaCodecs: [
            {
                kind: "audio",
                mimeType: "audio/opus",
                clockRate: 48000,
                channels: 2
            },
            {
                kind: "video",
                mimeType: "video/VP8",
                clockRate: 90000
            },
            {
                kind: "video",
                mimeType: "video/H264",
                clockRate: 90000,
                parameters: {
                    "packetization-mode": 1,
                    "profile-level-id": "42e01f",
                    "level-asymmetry-allowed": 1
                }
            }
        ]
    },

    webRtcTransport: {
        listenInfos: [
            {
                protocol: "udp",
                ip: "0.0.0.0",
                announcedAddress: process.env.ANNOUNCED_IP || "127.0.0.1"
            },
            {
                protocol: "tcp",
                ip: "0.0.0.0",
                announcedAddress: process.env.ANNOUNCED_IP || "127.0.0.1"
            }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000
    }
};
