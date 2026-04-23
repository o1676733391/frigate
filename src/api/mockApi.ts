import type {
  AxiosAdapter,
  AxiosResponse,
  InternalAxiosRequestConfig,
  Method,
} from "axios";

export const NO_ENDPOINT_MODE = true;

type MockReview = {
  id: string;
  camera: string;
  severity: "alert" | "detection" | "significant_motion";
  start_time: number;
  end_time: number;
  thumb_path: string;
  has_been_reviewed: boolean;
  data: {
    audio: string[];
    detections: string[];
    objects: string[];
    significant_motion_areas: number[];
    zones: string[];
  };
};

const now = Math.floor(Date.now() / 1000);

const reviews: MockReview[] = [
  {
    id: "event-1",
    camera: "front_door",
    severity: "alert",
    start_time: now - 3600,
    end_time: now - 3540,
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
  {
    id: "event-2",
    camera: "backyard",
    severity: "detection",
    start_time: now - 1800,
    end_time: now - 1760,
    thumb_path: "/api/events/event-2/thumbnail.jpg",
    has_been_reviewed: true,
    data: {
      audio: [],
      detections: ["dog"],
      objects: ["dog"],
      significant_motion_areas: [],
      zones: ["yard"],
    },
  },
];

const frontendConfig: any = {
  cameras: {
    front_door: makeCamera("front_door", "Front Door", 0),
    backyard: makeCamera("backyard", "Backyard", 1),
    garage: makeCamera("garage", "Garage", 2, false),
  },
  camera_groups: {
    default: {
      name: "Default",
      order: 0,
      icon: "video",
      cameras: ["front_door", "backyard", "garage"],
    },
    outdoor: {
      name: "Outdoor",
      order: 1,
      icon: "trees",
      cameras: ["front_door", "backyard"],
    },
  },
  auth: {
    enabled: false,
    roles: {
      viewer: { name: "viewer" },
      admin: { name: "admin" },
    },
  },
  birdseye: {
    enabled: true,
    height: 720,
    mode: "objects",
    quality: 75,
    restream: true,
    width: 1280,
  },
  clips: { enabled: true, retain: { default: 10 } },
  snapshots: { enabled: true, retain: { default: 10 } },
  record: { enabled: true, retain: { default: 10 } },
  motion: { enabled: true },
  objects: {
    track: ["person", "car", "dog", "cat"],
    filters: { person: { min_area: 0 } },
  },
  model: {
    path: "plus://mock-model",
    width: 320,
    height: 320,
    labelmap_path: "/config/model_cache/labelmap.txt",
    attributes_map: {
      person: ["face", "amazon", "fedex", "ups", "usps"],
      car: ["license_plate"],
      dog: [],
      cat: [],
    },
    all_attributes: [
      "face",
      "amazon",
      "fedex",
      "ups",
      "usps",
      "license_plate",
    ],
    non_logo_attributes: ["face", "license_plate"],
  },
  face_recognition: {
    enabled: true,
    model_size: "small",
    unknown_score: 0.5,
    detection_threshold: 0.5,
    recognition_threshold: 0.6,
  },
  semantic_search: {
    enabled: true,
    model: "jinav1",
    model_size: "small",
    triggers: {},
  },
  classification: {
    bird: { enabled: true },
  },
  plus: {
    enabled: true,
  },
  go2rtc: {
    webrtc: {
      candidates: ["stun:stun.l.google.com:19302"],
    },
  },
  ui: {
    dashboard: true,
    order: 0,
    enabled: true,
    live_mode: "mse",
    restream: "view",
    maxZoomLevel: 8,
    truncated_attr: false,
    timezone: "browser",
    time_format: "browser",
    date_style: "medium",
    time_style: "medium",
    unit_system: "metric",
  },
  detectors: {
    coral: { type: "edgetpu", num_threads: 4 },
  },
  database: {
    path: "/media/frigate/frigate.db",
  },
  safe_mode: false,
};

function makeCamera(
  name: string,
  friendlyName: string,
  order: number,
  enabled = true,
) {
  return {
    name,
    friendly_name: friendlyName,
    enabled,
    enabled_in_config: true,
    ui: { dashboard: true, order, unit_system: "metric" },
    birdseye: { enabled: true, mode: "objects", order },
    detect: {
      enabled: true,
      fps: enabled ? 10 : 5,
      height: 720,
      width: 1280,
      annotation_offset: 0,
      max_disappeared: 25,
      min_initialized: 3,
      stationary: {
        interval: 10,
        max_frames: { default: 20, objects: {} },
        threshold: 0.6,
      },
    },
    motion: {
      contour_area: 5,
      delta_alpha: 0.2,
      frame_alpha: 0.2,
      frame_height: 720,
      improve_contrast: true,
      lightning_threshold: 0.7,
      mask: {},
      mqtt_off_delay: 10,
      threshold: 25,
    },
    zones: {
      zone_1: {
        coordinates: "0.1,0.1,0.9,0.1,0.9,0.9,0.1,0.9",
        objects: ["person", "car"],
        inertia: 3,
        loitering_time: 0,
        speed_threshold: null,
        distances: null,
        color: [255, 0, 0],
        filters: {},
        enabled: true,
        enabled_in_config: true,
        friendly_name: "Main Zone",
      },
    },
    live: {
      height: 720,
      quality: 85,
      streams: { main: name },
    },
    ffmpeg: {
      global_args: ["-hide_banner"],
      hwaccel_args: "",
      input_args: "",
      inputs: [
        {
          global_args: [],
          hwaccel_args: [],
          input_args: "",
          path: `rtsp://${name}.local/live`,
          roles: ["detect", "record"],
        },
      ],
      output_args: {
        detect: ["-f", "rawvideo"],
        record: ["-f", "segment"],
        rtmp: ["-f", "flv"],
      },
      retry_interval: 10,
    },
    mqtt: {
      bounding_box: false,
      crop: false,
      enabled: false,
      height: 720,
      quality: 85,
      required_zones: [],
      timestamp: false,
    },
    onvif: {
      autotracking: {
        calibrate_on_startup: false,
        enabled: false,
        enabled_in_config: true,
        movement_weights: [],
        required_zones: [],
        return_preset: "",
        timeout: 30,
        track: [],
        zoom_factor: 0,
        zooming: "on",
      },
      host: `${name}.local`,
      password: null,
      port: 80,
      user: "admin",
      tls_insecure: false,
    },
    ffmpeg_cmds: [],
    best_image_timeout: 60,
    notifications: { enabled: true, enabled_in_config: true },
    objects: {
      filters: {},
      mask: {},
      track: ["person", "car", "dog", "cat"],
      genai: {
        enabled: false,
        enabled_in_config: true,
        prompt: "",
        object_prompts: {},
        required_zones: [],
        objects: [],
      },
    },
    review: {
      alerts: {
        enabled: true,
        required_zones: [],
        labels: ["person"],
        retain: { days: 10, mode: "all" },
      },
      detections: {
        enabled: true,
        required_zones: [],
        labels: ["person"],
        retain: { days: 10, mode: "all" },
      },
    },
    record: {
      enabled: true,
      enabled_in_config: true,
      alerts: {
        post_capture: 5,
        pre_capture: 5,
        retain: { days: 10, mode: "all" },
      },
      detections: {
        post_capture: 5,
        pre_capture: 5,
        retain: { days: 10, mode: "all" },
      },
      expire_interval: 60,
      export: { timelapse_args: "" },
      preview: { quality: "75" },
      retain: { days: 10, mode: "all" },
    },
    audio: {
      enabled: false,
      enabled_in_config: true,
      filters: null,
      listen: [],
      max_not_heard: 0,
      min_volume: 0,
      num_threads: 1,
    },
    audio_transcription: {
      enabled: false,
      enabled_in_config: true,
      live_enabled: false,
    },
    rtmp: {
      enabled: false,
    },
  };
}

const previewData = reviews.map((review) => ({
  camera: review.camera,
  src: "/api/events/event-1/snapshot.jpg",
  type: "image/jpeg",
  start: review.start_time,
  end: review.end_time,
}));

const statsData: any = {
  service: {
    last_updated: now,
    uptime: 7200,
    latest_version: "0.15.0-mock",
    version: "0.15.0-mock",
    storage: {
      "/media/frigate/recordings": {
        free: 500000000,
        total: 1000000000,
        used: 500000000,
        mount_type: "ext4",
      },
      "/dev/shm": {
        free: 96000000,
        total: 128000000,
        used: 32000000,
        mount_type: "tmpfs",
        min_shm: 64000000,
      },
    },
  },
  cameras: {
    front_door: {
      audio_dBFPS: 0,
      audio_rms: 0,
      camera_fps: 25,
      capture_pid: 3001,
      detection_enabled: 1,
      detection_fps: 10,
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
      cpu: "12.0",
      cpu_average: "10.0",
      mem: "512.0",
    },
  },
  detectors: {
    coral: {
      detection_start: now - 3600,
      inference_speed: 28,
      pid: 2451,
    },
  },
  processes: {
    camera: { pid: 6000 },
  },
  camera_fps: 25,
  process_fps: 5,
  skipped_fps: 0,
  detection_fps: 10,
};

function routeData(pathname: string, method: Method = "get", params?: any): any {
  if (pathname === "/api/config") return frontendConfig;
  if (pathname === "/api/profile") {
    return {
      username: "admin",
      role: "admin",
      admin: true,
      allowed_cameras: Object.keys(frontendConfig.cameras),
    };
  }
  if (pathname === "/api/stats" || pathname === "/api/status") return statsData;
  if (pathname === "/api/version") return { version: "0.15.0-mock" };
  if (pathname === "/api/review") return reviews;
  if (pathname.startsWith("/api/review/")) {
    return reviews.find((item) => pathname.endsWith(item.id)) ?? reviews[0];
  }
  if (pathname === "/api/reviews/summary") {
    return {
      last24Hours: {
        day: "last24Hours",
        reviewed_alert: 1,
        reviewed_detection: 1,
        total_alert: 2,
        total_detection: 2,
      },
    };
  }
  if (pathname.startsWith("/api/preview/")) return previewData;
  if (pathname === "/api/recordings/summary") {
    const date = new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { [key]: true };
  }
  if (pathname === "/api/events/summary") {
    return {
      person: { count: 2, hours: [1, 0, 1, 0, 0, 0, 0] },
      car: { count: 1, hours: [0, 1, 0, 0, 0, 0, 0] },
      dog: { count: 1, hours: [0, 0, 1, 0, 0, 0, 0] },
    };
  }
  if (pathname === "/api/events") {
    const limit = Number(params?.limit ?? 100);
    return reviews.slice(0, limit);
  }
  if (pathname.startsWith("/api/events/")) {
    const id = pathname.split("/")[3];
    return reviews.find((item) => item.id === id) ?? reviews[0];
  }
  if (pathname === "/api/config/schema.json" || pathname === "/api/config/schema") {
    return {
      type: "object",
      properties: {
        cameras: { type: "object" },
        camera_groups: { type: "object" },
        record: { type: "object" },
        snapshots: { type: "object" },
        clips: { type: "object" },
        ui: { type: "object" },
        auth: { type: "object" },
      },
    };
  }
  if (pathname.startsWith("/api/logs/")) {
    return {
      logs: [
        `${new Date().toISOString()} mock log line 1`,
        `${new Date().toISOString()} mock log line 2`,
      ],
    };
  }

  if (method !== "get") return { success: true };
  return {};
}

function normalizePath(url: string): string {
  if (!url) return "/";
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname;
  } catch {
    return url.startsWith("/") ? url : `/${url}`;
  }
}

export const mockAxiosAdapter: AxiosAdapter = async (
  config: InternalAxiosRequestConfig,
): Promise<AxiosResponse> => {
  const pathname = normalizePath(config.url || "");
  const method = (config.method || "get") as Method;
  const data = routeData(pathname, method, config.params);

  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config,
  };
};

export function getNoEndpointConfig() {
  return frontendConfig;
}
