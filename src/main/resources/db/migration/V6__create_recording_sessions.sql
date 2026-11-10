
-- ============================================
-- RECORDING SESSIONS
-- ============================================

CREATE TABLE recording_sessions (
                                    id UUID PRIMARY KEY,

                                    meeting_id UUID NOT NULL,
                                    started_by_user_id UUID NOT NULL,

                                    status VARCHAR(30) NOT NULL,

                                    started_at TIMESTAMP WITH TIME ZONE,
                                    ended_at TIMESTAMP WITH TIME ZONE,

                                    file_path TEXT,
                                    duration_seconds BIGINT,

                                    failure_reason TEXT,

                                    created_at TIMESTAMP WITH TIME ZONE NOT NULL
                                        DEFAULT CURRENT_TIMESTAMP,

                                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                                        DEFAULT CURRENT_TIMESTAMP,

                                    CONSTRAINT fk_recording_meeting
                                        FOREIGN KEY (meeting_id)
                                            REFERENCES meetings(id)
                                            ON DELETE CASCADE,

                                    CONSTRAINT fk_recording_started_by
                                        FOREIGN KEY (started_by_user_id)
                                            REFERENCES public."app-user"(id),

                                    CONSTRAINT chk_recording_status
                                        CHECK (
                                            status IN (
                                                       'STARTING',
                                                       'RECORDING',
                                                       'STOPPING',
                                                       'COMPLETED',
                                                       'FAILED'
                                                )
                                            ),

                                    CONSTRAINT chk_recording_duration
                                        CHECK (
                                            duration_seconds IS NULL
                                                OR duration_seconds >= 0
                                            )
);

CREATE INDEX idx_recording_sessions_meeting
    ON recording_sessions(meeting_id);

CREATE INDEX idx_recording_sessions_created
    ON recording_sessions(created_at DESC);

-- Only one active recording per meeting.
CREATE UNIQUE INDEX uq_active_recording_per_meeting
    ON recording_sessions(meeting_id)
    WHERE status IN ('STARTING', 'RECORDING', 'STOPPING');


-- ============================================
-- RECORDING CONSENTS
-- ============================================

CREATE TABLE recording_consents (
                                    id UUID PRIMARY KEY,

                                    recording_session_id UUID NOT NULL,
                                    participant_id UUID NOT NULL,

                                    consent_status VARCHAR(20) NOT NULL
                                        DEFAULT 'PENDING',

                                    responded_at TIMESTAMP WITH TIME ZONE,

                                    created_at TIMESTAMP WITH TIME ZONE NOT NULL
                                        DEFAULT CURRENT_TIMESTAMP,

                                    CONSTRAINT fk_recording_consent_session
                                        FOREIGN KEY (recording_session_id)
                                            REFERENCES recording_sessions(id)
                                            ON DELETE CASCADE,

                                    CONSTRAINT fk_recording_consent_participant
                                        FOREIGN KEY (participant_id)
                                            REFERENCES meeting_participants(id)
                                            ON DELETE CASCADE,

                                    CONSTRAINT uq_recording_participant_consent
                                        UNIQUE (recording_session_id, participant_id),

                                    CONSTRAINT chk_recording_consent_status
                                        CHECK (
                                            consent_status IN (
                                                               'PENDING',
                                                               'GRANTED',
                                                               'DENIED',
                                                               'WITHDRAWN'
                                                )
                                            )
);

CREATE INDEX idx_recording_consents_session
    ON recording_consents(recording_session_id);
