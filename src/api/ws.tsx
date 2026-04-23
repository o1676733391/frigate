import { baseUrl } from "./baseUrl";
import { useCallback, useEffect, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import {
  EmbeddingsReindexProgressType,
  FrigateCameraState,
  FrigateEvent,
  FrigateReview,
  ModelState,
  ToggleableSetting,
  TrackedObjectUpdateReturnType,
  TriggerStatus,
  FrigateAudioDetections,
  Job,
} from "@/types/ws";
import { FrigateStats } from "@/types/stats";
import { createContainer } from "react-tracked";
import useDeepMemo from "@/hooks/use-deep-memo";
import { NO_ENDPOINT_MODE } from "./mockApi";

type Update = {
  topic: string;
  payload: unknown;
  retain: boolean;
};

type WsState = {
  [topic: string]: unknown;
};

type useValueReturn = [WsState, (update: Update) => void];

const defaultEvent: FrigateEvent = {
  type: "new",
  before: {
    id: "event-1",
    camera: "front_door",
    frame_time: Date.now() / 1000,
    snapshot_time: Date.now() / 1000,
    label: "person",
    sub_label: null,
    top_score: 0.95,
    false_positive: false,
    start_time: Date.now() / 1000 - 30,
    end_time: null,
    score: 0.95,
    box: [0, 0, 100, 100],
    area: 1,
    ratio: 1,
    region: [0, 0, 100, 100],
    current_zones: [],
    entered_zones: [],
    thumbnail: null,
    has_snapshot: true,
    has_clip: true,
    stationary: false,
    motionless_count: 0,
    position_changes: 1,
    attributes: {},
  },
  after: {
    id: "event-1",
    camera: "front_door",
    frame_time: Date.now() / 1000,
    snapshot_time: Date.now() / 1000,
    label: "person",
    sub_label: null,
    top_score: 0.95,
    false_positive: false,
    start_time: Date.now() / 1000 - 30,
    end_time: null,
    score: 0.95,
    box: [0, 0, 100, 100],
    area: 1,
    ratio: 1,
    region: [0, 0, 100, 100],
    current_zones: [],
    entered_zones: [],
    thumbnail: null,
    has_snapshot: true,
    has_clip: true,
    stationary: false,
    motionless_count: 0,
    position_changes: 1,
    attributes: {},
  },
};

const defaultReview: FrigateReview = {
  type: "new",
  before: {
    id: "review-1",
    camera: "front_door",
    severity: "alert",
    start_time: Date.now() / 1000 - 60,
    end_time: Date.now() / 1000 - 20,
    thumb_path: "/api/events/event-1/thumbnail.jpg",
    has_been_reviewed: false,
    data: {
      audio: [],
      detections: ["person"],
      objects: ["person"],
      significant_motion_areas: [],
      zones: ["driveway"],
    },
  },
  after: {
    id: "review-1",
    camera: "front_door",
    severity: "alert",
    start_time: Date.now() / 1000 - 60,
    end_time: Date.now() / 1000 - 20,
    thumb_path: "/api/events/event-1/thumbnail.jpg",
    has_been_reviewed: false,
    data: {
      audio: [],
      detections: ["person"],
      objects: ["person"],
      significant_motion_areas: [],
      zones: ["driveway"],
    },
  },
};

const defaultStats: FrigateStats = {
  cameras: {
    front_door: {
      audio_dBFPS: 0,
      audio_rms: 0,
      camera_fps: 25,
      capture_pid: 3001,
      detection_enabled: 1,
      detection_fps: 8,
      ffmpeg_pid: 4001,
      pid: 5001,
      process_fps: 5,
      skipped_fps: 0,
      connection_quality: "excellent",
      expected_fps: 25,
      reconnects_last_hour: 0,
      stalls_last_hour: 0,
    },
  },
  cpu_usages: {
    "frigate.full_system": {
      cmdline: "frigate",
      cpu: "10.0",
      cpu_average: "9.0",
      mem: "512.0",
    },
  },
  detectors: {
    coral: {
      detection_start: Date.now() / 1000 - 3600,
      inference_speed: 28,
      pid: 2451,
    },
  },
  processes: { camera: { pid: 6000 } },
  service: {
    last_updated: Date.now() / 1000,
    storage: {
      "/media/frigate/recordings": {
        free: 500000000,
        total: 1000000000,
        used: 500000000,
        mount_type: "ext4",
      },
    },
    uptime: 7200,
    latest_version: "0.15.0-mock",
    version: "0.15.0-mock",
  },
  camera_fps: 25,
  process_fps: 5,
  skipped_fps: 0,
  detection_fps: 8,
};

const defaultCameraState: FrigateCameraState = {
  config: {
    enabled: false,
    detect: false,
    snapshots: false,
    record: false,
    audio: false,
    audio_transcription: false,
    notifications: true,
    notifications_suspended: 0,
    autotracking: false,
    alerts: true,
    detections: true,
    object_descriptions: true,
    review_descriptions: true,
  },
  motion: false,
  objects: [],
  audio_detections: [],
};

function safeParse<T>(payload: unknown, fallback: T): T {
  if (typeof payload !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(payload) as T;
  } catch {
    return fallback;
  }
}

function getInitialMockState(): WsState {
  return {
    camera_activity: JSON.stringify({
      front_door: {
        config: {
          enabled: false,
          detect: false,
          snapshots: false,
          record: false,
          audio: false,
          audio_transcription: false,
          notifications: true,
          notifications_suspended: 0,
          autotracking: false,
          alerts: true,
          detections: true,
          object_descriptions: true,
          review_descriptions: true,
        },
        motion: true,
        objects: [
          {
            id: "event-1",
            label: "person",
            stationary: false,
            area: 1,
            ratio: 1,
            score: 0.95,
            sub_label: "",
          },
        ],
        audio_detections: [],
      },
      backyard: {
        config: {
          enabled: false,
          detect: false,
          snapshots: false,
          record: false,
          audio: false,
          audio_transcription: false,
          notifications: true,
          notifications_suspended: 0,
          autotracking: false,
          alerts: true,
          detections: true,
          object_descriptions: true,
          review_descriptions: true,
        },
        motion: false,
        objects: [],
        audio_detections: [],
      },
    }),
    events: JSON.stringify(defaultEvent),
    reviews: JSON.stringify(defaultReview),
    stats: JSON.stringify(defaultStats),
    audio_detections: JSON.stringify({}),
    model_state: JSON.stringify({}),
    embeddings_reindex_progress: JSON.stringify({
      thumbnails: 100,
      descriptions: 100,
      processed_objects: 0,
      total_objects: 0,
      time_remaining: 0,
      status: "completed",
    }),
    birdseye_layout: JSON.stringify("last_output"),
    triggers: JSON.stringify({
      name: "",
      camera: "",
      event_id: "",
      type: "",
      score: 0,
    }),
    job_state: JSON.stringify({}),
    audio_transcription_state: JSON.stringify("idle"),
    tracked_object_update: JSON.stringify({ type: "", id: "", camera: "" }),
  };
}

function useValueNoEndpoint(): useValueReturn {
  const [wsState, setWsState] = useState<WsState>(getInitialMockState());

  const setState = useCallback((message: Update) => {
    setWsState((prev) => ({
      ...prev,
      [message.topic]: message.payload,
    }));
  }, []);

  return [wsState, setState];
}

function useValueSocket(): useValueReturn {
  const wsUrl = `${baseUrl.replace(/^http/, "ws")}ws`;

  // main state

  const [wsState, setWsState] = useState<WsState>({});

  useEffect(() => {
    const activityValue: string = wsState["camera_activity"] as string;

    if (!activityValue) {
      return;
    }

    const cameraActivity: { [key: string]: FrigateCameraState } =
      JSON.parse(activityValue);

    if (Object.keys(cameraActivity).length === 0) {
      return;
    }

    const cameraStates: WsState = {};

    Object.entries(cameraActivity).forEach(([name, state]) => {
      const {
        record,
        detect,
        enabled,
        snapshots,
        audio,
        audio_transcription,
        notifications,
        notifications_suspended,
        autotracking,
        alerts,
        detections,
        object_descriptions,
        review_descriptions,
      } = state["config"];
      cameraStates[`${name}/recordings/state`] = record ? "ON" : "OFF";
      cameraStates[`${name}/enabled/state`] = enabled ? "ON" : "OFF";
      cameraStates[`${name}/detect/state`] = detect ? "ON" : "OFF";
      cameraStates[`${name}/snapshots/state`] = snapshots ? "ON" : "OFF";
      cameraStates[`${name}/audio/state`] = audio ? "ON" : "OFF";
      cameraStates[`${name}/audio_transcription/state`] = audio_transcription
        ? "ON"
        : "OFF";
      cameraStates[`${name}/notifications/state`] = notifications
        ? "ON"
        : "OFF";
      cameraStates[`${name}/notifications/suspended`] =
        notifications_suspended || 0;
      cameraStates[`${name}/ptz_autotracker/state`] = autotracking
        ? "ON"
        : "OFF";
      cameraStates[`${name}/review_alerts/state`] = alerts ? "ON" : "OFF";
      cameraStates[`${name}/review_detections/state`] = detections
        ? "ON"
        : "OFF";
      cameraStates[`${name}/object_descriptions/state`] = object_descriptions
        ? "ON"
        : "OFF";
      cameraStates[`${name}/review_descriptions/state`] = review_descriptions
        ? "ON"
        : "OFF";
    });

    setWsState((prevState) => ({
      ...prevState,
      ...cameraStates,
    }));

    // we only want this to run initially when the config is loaded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsState["camera_activity"]]);

  // ws handler
  const { sendJsonMessage, readyState } = useWebSocket(wsUrl, {
    onMessage: (event) => {
      const data: Update = JSON.parse(event.data);

      if (data) {
        setWsState((prevState) => ({
          ...prevState,
          [data.topic]: data.payload,
        }));
      }
    },
    onOpen: () => {
      sendJsonMessage({
        topic: "onConnect",
        message: "",
        retain: false,
      });
    },
    onClose: () => {},
    shouldReconnect: () => true,
    retryOnError: true,
  });

  const setState = useCallback(
    (message: Update) => {
      if (readyState === ReadyState.OPEN) {
        sendJsonMessage({
          topic: message.topic,
          payload: message.payload,
          retain: message.retain,
        });
      }
    },
    [readyState, sendJsonMessage],
  );

  return [wsState, setState];
}

const useValue = NO_ENDPOINT_MODE ? useValueNoEndpoint : useValueSocket;

export const {
  Provider: WsProvider,
  useTrackedState: useWsState,
  useUpdate: useWsUpdate,
} = createContainer(useValue, { defaultState: {}, concurrentMode: true });

export function useWs(watchTopic: string, publishTopic: string) {
  const state = useWsState();
  const sendJsonMessage = useWsUpdate();

  const value = { payload: state[watchTopic] || null };

  const send = useCallback(
    (payload: unknown, retain = false) => {
      sendJsonMessage({
        topic: publishTopic || watchTopic,
        payload,
        retain,
      });
    },
    [sendJsonMessage, watchTopic, publishTopic],
  );

  return { value, send };
}

export function useEnabledState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/enabled/state`, `${camera}/enabled/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useDetectState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/detect/state`, `${camera}/detect/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useRecordingsState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/recordings/state`, `${camera}/recordings/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useSnapshotsState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/snapshots/state`, `${camera}/snapshots/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useAudioState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/audio/state`, `${camera}/audio/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useAudioTranscriptionState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/audio_transcription/state`,
    `${camera}/audio_transcription/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useAutotrackingState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/ptz_autotracker/state`, `${camera}/ptz_autotracker/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useAlertsState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/review_alerts/state`, `${camera}/review_alerts/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useDetectionsState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/review_detections/state`,
    `${camera}/review_detections/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useObjectDescriptionState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/object_descriptions/state`,
    `${camera}/object_descriptions/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useReviewDescriptionState(camera: string): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/review_descriptions/state`,
    `${camera}/review_descriptions/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useMotionMaskState(
  camera: string,
  maskName: string,
): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/motion_mask/${maskName}/state`,
    `${camera}/motion_mask/${maskName}/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useObjectMaskState(
  camera: string,
  maskName: string,
): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/object_mask/${maskName}/state`,
    `${camera}/object_mask/${maskName}/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useZoneState(
  camera: string,
  zoneName: string,
): {
  payload: ToggleableSetting;
  send: (payload: ToggleableSetting, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/zone/${zoneName}/state`,
    `${camera}/zone/${zoneName}/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function usePtzCommand(camera: string): {
  payload: string;
  send: (payload: string, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/ptz`, `${camera}/ptz`);
  return { payload: payload as string, send };
}

export function useRestart(): {
  payload: string;
  send: (payload: string, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs("restart", "restart");
  return { payload: payload as string, send };
}

export function useFrigateEvents(): { payload: FrigateEvent } {
  const {
    value: { payload },
  } = useWs("events", "");
  return { payload: safeParse(payload, defaultEvent) };
}

export function useAudioDetections(): { payload: FrigateAudioDetections } {
  const {
    value: { payload },
  } = useWs("audio_detections", "");
  return { payload: safeParse(payload, {}) };
}

export function useFrigateReviews(): FrigateReview {
  const {
    value: { payload },
  } = useWs("reviews", "");
  return useDeepMemo(safeParse(payload, defaultReview)) ?? defaultReview;
}

export function useFrigateStats(): FrigateStats {
  const {
    value: { payload },
  } = useWs("stats", "");
  return useDeepMemo(safeParse(payload, defaultStats)) ?? defaultStats;
}

export function useInitialCameraState(
  camera: string,
  revalidateOnFocus: boolean,
): {
  payload: FrigateCameraState;
} {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("camera_activity", "onConnect");

  const data = useDeepMemo(safeParse(payload, {} as { [key: string]: FrigateCameraState }));

  useEffect(() => {
    let listener = undefined;
    if (revalidateOnFocus) {
      sendCommand("onConnect");
      listener = () => {
        if (document.visibilityState == "visible") {
          sendCommand("onConnect");
        }
      };
      addEventListener("visibilitychange", listener);
    }

    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // only refresh when onRefresh value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data ? data[camera] ?? defaultCameraState : defaultCameraState };
}

export function useModelState(
  model: string,
  revalidateOnFocus: boolean = true,
): { payload: ModelState } {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("model_state", "modelState");

  const data = useDeepMemo(JSON.parse(payload as string));

  useEffect(() => {
    let listener = undefined;
    if (revalidateOnFocus) {
      sendCommand("modelState");
      listener = () => {
        if (document.visibilityState == "visible") {
          sendCommand("modelState");
        }
      };
      addEventListener("visibilitychange", listener);
    }

    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data ? data[model] : undefined };
}

export function useEmbeddingsReindexProgress(
  revalidateOnFocus: boolean = true,
): {
  payload: EmbeddingsReindexProgressType;
} {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("embeddings_reindex_progress", "embeddingsReindexProgress");

  const data = useDeepMemo(JSON.parse(payload as string));

  useEffect(() => {
    let listener = undefined;
    if (revalidateOnFocus) {
      sendCommand("embeddingsReindexProgress");
      listener = () => {
        if (document.visibilityState == "visible") {
          sendCommand("embeddingsReindexProgress");
        }
      };
      addEventListener("visibilitychange", listener);
    }

    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data };
}

export function useAudioTranscriptionProcessState(
  revalidateOnFocus: boolean = true,
): { payload: string } {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("audio_transcription_state", "audioTranscriptionState");

  const data = useDeepMemo(
    payload ? (JSON.parse(payload as string) as string) : "idle",
  );

  useEffect(() => {
    let listener = undefined;
    if (revalidateOnFocus) {
      sendCommand("audioTranscriptionState");
      listener = () => {
        if (document.visibilityState == "visible") {
          sendCommand("audioTranscriptionState");
        }
      };
      addEventListener("visibilitychange", listener);
    }
    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data || "idle" };
}

export function useBirdseyeLayout(revalidateOnFocus: boolean = true): {
  payload: string;
} {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("birdseye_layout", "birdseyeLayout");

  const data = useDeepMemo(JSON.parse(payload as string));

  useEffect(() => {
    let listener = undefined;
    if (revalidateOnFocus) {
      sendCommand("birdseyeLayout");
      listener = () => {
        if (document.visibilityState == "visible") {
          sendCommand("birdseyeLayout");
        }
      };
      addEventListener("visibilitychange", listener);
    }

    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // we know that these deps are correct
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: data };
}

export function useMotionActivity(camera: string): { payload: string } {
  const {
    value: { payload },
  } = useWs(`${camera}/motion`, "");
  return { payload: payload as string };
}

export function useAudioActivity(camera: string): { payload: number } {
  const {
    value: { payload },
  } = useWs(`${camera}/audio/rms`, "");
  return { payload: payload as number };
}

export function useAudioLiveTranscription(camera: string): {
  payload: string;
} {
  const {
    value: { payload },
  } = useWs(`${camera}/audio/transcription`, "");
  return { payload: payload as string };
}

export function useMotionThreshold(camera: string): {
  payload: string;
  send: (payload: number, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/motion_threshold/state`,
    `${camera}/motion_threshold/set`,
  );
  return { payload: payload as string, send };
}

export function useMotionContourArea(camera: string): {
  payload: string;
  send: (payload: number, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/motion_contour_area/state`,
    `${camera}/motion_contour_area/set`,
  );
  return { payload: payload as string, send };
}

export function useImproveContrast(camera: string): {
  payload: ToggleableSetting;
  send: (payload: string, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/improve_contrast/state`,
    `${camera}/improve_contrast/set`,
  );
  return { payload: payload as ToggleableSetting, send };
}

export function useTrackedObjectUpdate(): {
  payload: TrackedObjectUpdateReturnType;
} {
  const {
    value: { payload },
  } = useWs("tracked_object_update", "");
  const parsed = payload
    ? JSON.parse(payload as string)
    : { type: "", id: "", camera: "" };
  return { payload: useDeepMemo(parsed) };
}

export function useNotifications(camera: string): {
  payload: ToggleableSetting;
  send: (payload: string, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(`${camera}/notifications/state`, `${camera}/notifications/set`);
  return { payload: payload as ToggleableSetting, send };
}

export function useNotificationSuspend(camera: string): {
  payload: string;
  send: (payload: number, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs(
    `${camera}/notifications/suspended`,
    `${camera}/notifications/suspend`,
  );
  return { payload: payload as string, send };
}

export function useNotificationTest(): {
  payload: string;
  send: (payload: string, retain?: boolean) => void;
} {
  const {
    value: { payload },
    send,
  } = useWs("notification_test", "notification_test");
  return { payload: payload as string, send };
}

export function useTriggers(): { payload: TriggerStatus } {
  const {
    value: { payload },
  } = useWs("triggers", "");
  const parsed = payload
    ? JSON.parse(payload as string)
    : { name: "", camera: "", event_id: "", type: "", score: 0 };
  return { payload: useDeepMemo(parsed) };
}

export function useJobStatus(
  jobType: string,
  revalidateOnFocus: boolean = true,
): { payload: Job | null } {
  const {
    value: { payload },
    send: sendCommand,
  } = useWs("job_state", "jobState");

  const jobData = useDeepMemo(
    payload && typeof payload === "string" ? JSON.parse(payload) : {},
  );
  const currentJob = jobData[jobType] || null;

  useEffect(() => {
    let listener: (() => void) | undefined;
    if (revalidateOnFocus) {
      sendCommand("jobState");
      listener = () => {
        if (document.visibilityState === "visible") {
          sendCommand("jobState");
        }
      };
      addEventListener("visibilitychange", listener);
    }

    return () => {
      if (listener) {
        removeEventListener("visibilitychange", listener);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revalidateOnFocus]);

  return { payload: currentJob as Job | null };
}
