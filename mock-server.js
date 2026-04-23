import express from "express";
import http from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

const IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5z+f8AAAAASUVORK5CYII=";
const IMAGE_BUFFER = Buffer.from(IMAGE_BASE64, "base64");

const now = () => Math.floor(Date.now() / 1000);

const imageRoute = (res) => {
  res.set("Content-Type", "image/png");
  res.send(IMAGE_BUFFER);
};

const cameras = {
  front_door: buildCamera("front_door", "Front Door", 0),
  backyard: buildCamera("backyard", "Backyard", 1),
  garage: buildCamera("garage", "Garage", 2, false),
};

const config = buildConfig(cameras);
let currentConfig = structuredClone(config);

const reviewSegments = buildReviewSegments();
const previews = buildPreviews(reviewSegments);
const stats = buildStats(cameras);
const cameraActivity = buildCameraActivity();
const reviewUpdate = reviewSegments[0];
const eventUpdate = {
  type: "new",
  before: reviewSegments[0],
  after: reviewSegments[0],
};
const modelState = {
  "jinaai/jina-clip-v1-text_model_fp16.onnx": "downloaded",
  "jinaai/jina-clip-v1-tokenizer": "downloaded",
  "jinaai/jina-clip-v1-vision_model_fp16.onnx": "downloaded",
  "jinaai/jina-clip-v1-vision_model_quantized.onnx": "downloaded",
  "jinaai/jina-clip-v1-preprocessor_config.json": "downloaded",
  "jinaai/jina-clip-v2-model_fp16.onnx": "downloaded",
  "jinaai/jina-clip-v2-model_quantized.onnx": "downloaded",
  "jinaai/jina-clip-v2-tokenizer": "downloaded",
  "jinaai/jina-clip-v2-preprocessor_config.json": "downloaded",
};
const embeddingsProgress = {
  thumbnails: 100,
  descriptions: 100,
  processed_objects: 42,
  total_objects: 42,
  time_remaining: 0,
  status: "completed",
};
const jobState = {
  media_sync: {
    id: "media_sync",
    job_type: "media_sync",
    status: "completed",
    start_time: now() - 120,
    end_time: now() - 90,
    results: {
      event_snapshots: {
        files_checked: 24,
        orphans_found: 0,
        orphans_deleted: 0,
        aborted: false,
        error: null,
      },
      event_thumbnails: {
        files_checked: 24,
        orphans_found: 0,
        orphans_deleted: 0,
        aborted: false,
        error: null,
      },
      review_thumbnails: {
        files_checked: 12,
        orphans_found: 0,
        orphans_deleted: 0,
        aborted: false,
        error: null,
      },
      previews: {
        files_checked: 12,
        orphans_found: 0,
        orphans_deleted: 0,
        aborted: false,
        error: null,
      },
      exports: {
        files_checked: 4,
        orphans_found: 0,
        orphans_deleted: 0,
        aborted: false,
        error: null,
      },
      recordings: {
        files_checked: 48,
        orphans_found: 0,
        orphans_deleted: 0,
        aborted: false,
        error: null,
      },
      totals: {
        files_checked: 124,
        orphans_found: 0,
        orphans_deleted: 0,
      },
    },
  },
};

const exportsList = [
  {
    id: "export-1",
    camera: "front_door",
    start_time: now() - 3600,
    end_time: now() - 3300,
    name: "Front Door Walkthrough",
    state: "ready",
    file: "front_door_1.mp4",
  },
  {
    id: "export-2",
    camera: "backyard",
    start_time: now() - 2400,
    end_time: now() - 2100,
    name: "Backyard Dog",
    state: "ready",
    file: "backyard_1.mp4",
  },
];

const cases = [];

app.get("/api/profile", (_req, res) => {
  res.json({
    username: "admin",
    role: "admin",
    admin: true,
    allowed_cameras: Object.keys(cameras),
  });
});

app.get("/api/auth/first_time_login", (_req, res) => {
  res.json(false);
});

app.post("/api/login", (_req, res) => {
  res.json({ success: true });
});

app.get("/api/logout", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/auth/verify", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/auth", (_req, res) => {
  res.json({ access_token: "mock_token", token_type: "bearer" });
});

app.get("/api/config", (_req, res) => {
  res.json(currentConfig);
});

app.put("/api/config/set", (req, res) => {
  if (req.body && typeof req.body === "object") {
    currentConfig = {
      ...currentConfig,
      ...req.body,
    };
  }

  res.json({ success: true, requires_restart: 0 });
});

app.get("/api/config/schema.json", (_req, res) => {
  res.json(buildConfigSchema());
});

app.get("/api/config/schema", (_req, res) => {
  res.json(buildConfigSchema());
});

app.get("/api/status", (_req, res) => {
  res.json(stats);
});

app.get("/api/stats", (_req, res) => {
  res.json(stats);
});

app.get("/api/version", (_req, res) => {
  res.json({ version: "0.15.0-mock" });
});

app.get("/api/cameras", (_req, res) => {
  res.json(cameras);
});

app.get("/api/cameras/:name", (req, res) => {
  const camera = cameras[req.params.name];
  if (!camera) {
    return res.status(404).json({ error: "Camera not found" });
  }

  res.json(camera);
});

app.get(["/api/cameras/:name/latest.jpg", "/api/cameras/:name/latest.webp"], (_req, res) => {
  imageRoute(res);
});

app.get("/api/cameras/:name/recordings/:timestamp/snapshot.jpg", (_req, res) => {
  imageRoute(res);
});

app.get("/api/cameras/:name/brightness", (_req, res) => {
  res.json({ brightness: 50 });
});

app.post("/api/cameras/:name/ptz", (_req, res) => {
  res.json({ success: true });
});

app.get("/api/cameras/:name/ptz/info", (_req, res) => {
  res.json({ features: [], position: { x: 0, y: 0, z: 0 } });
});

app.get("/api/events", (req, res) => {
  const limit = Number(req.query.limit ?? 100);
  res.json(reviewSegments.slice(0, limit));
});

app.get("/api/events/:id", (req, res) => {
  const event = reviewSegments.find((item) => item.id === req.params.id);
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  res.json(event);
});

app.get("/api/review", (req, res) => {
  const before = Number(req.query.before ?? now());
  const after = Number(req.query.after ?? before - 24 * 60 * 60);
  const camerasFilter = toArray(req.query.cameras);
  const labelsFilter = toArray(req.query.labels);
  const zonesFilter = toArray(req.query.zones);

  const filtered = reviewSegments.filter((segment) => {
    const inRange = segment.start_time >= after && segment.start_time <= before;
    const cameraMatches =
      camerasFilter.length === 0 || camerasFilter.includes(segment.camera);
    const labelMatches =
      labelsFilter.length === 0 ||
      segment.data.objects.some((object) => labelsFilter.includes(object));
    const zoneMatches =
      zonesFilter.length === 0 ||
      segment.data.zones.some((zone) => zonesFilter.includes(zone));

    return inRange && cameraMatches && labelMatches && zoneMatches;
  });

  res.json(filtered);
});

app.get("/api/review/:id", (req, res) => {
  const segment = reviewSegments.find((item) => item.id === req.params.id);
  if (!segment) {
    return res.status(404).json({ error: "Review not found" });
  }

  res.json(segment);
});

app.get("/api/reviews/summary", (_req, res) => {
  const key = "last24Hours";
  res.json({
    [key]: {
      day: key,
      reviewed_alert: 1,
      reviewed_detection: 1,
      total_alert: 2,
      total_detection: 2,
    },
  });
});

app.post("/api/reviews/viewed", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/reviews/delete", (_req, res) => {
  res.json({ success: true });
});

app.get("/api/preview/:camera/start/:after/end/:before", (req, res) => {
  const camera = req.params.camera;
  const filtered = previews.filter((preview) => {
    return camera === "all" || preview.camera === camera;
  });

  res.json(filtered);
});

app.get("/api/recordings/summary", (_req, res) => {
  res.json({
    [dayKey(now())]: true,
  });
});

app.get("/api/events/summary", (_req, res) => {
  res.json({
    person: { count: 2, hours: [1, 0, 1, 0, 0, 0, 0] },
    car: { count: 1, hours: [0, 1, 0, 0, 0, 0, 0] },
    dog: { count: 1, hours: [0, 0, 1, 0, 0, 0, 0] },
  });
});

app.get("/api/detectors", (_req, res) => {
  res.json({
    coral: {
      type: "edgetpu",
      model_path: "/config/models/coral_model.tflite",
      enabled: true,
      detection_start: now() - 3600,
      inference_speed: 28,
      pid: 2451,
    },
  });
});

app.get("/api/birdseye/view", (_req, res) => {
  res.json({ cameras: Object.keys(cameras), layout: "last_output" });
});

app.get("/api/birdseye/latest.jpg", (_req, res) => {
  imageRoute(res);
});

app.get("/api/notifications", (_req, res) => {
  res.json([]);
});

app.get("/api/storage", (_req, res) => {
  res.json({
    "/media/frigate/recordings": {
      total: 1_000_000_000,
      used: 500_000_000,
      free: 500_000_000,
      mount_type: "ext4",
    },
    "/dev/shm": {
      total: 128_000_000,
      used: 32_000_000,
      free: 96_000_000,
      mount_type: "tmpfs",
      min_shm: 64_000_000,
    },
  });
});

app.get("/api/logs/:service", (req, res) => {
  const lines = [
    `${new Date().toISOString()} ${req.params.service}: mock log line 1`,
    `${new Date().toISOString()} ${req.params.service}: mock log line 2`,
    `${new Date().toISOString()} ${req.params.service}: mock log line 3`,
  ];

  if (req.query.stream === "true") {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.write(lines.join("\n") + "\n");
    setTimeout(() => res.end(), 50);
    return;
  }

  res.json({ logs: lines });
});

app.get("/api/ffprobe", (req, res) => {
  const streamUrl = String(req.query.paths ?? "");
  res.json([
    {
      return_code: 0,
      stderr: "",
      stdout: {
        streams: [
          {
            codec_type: "video",
            codec_name: "h264",
            avg_frame_rate: "30/1",
            width: 1280,
            height: 720,
          },
          {
            codec_type: "audio",
            codec_name: "aac",
            avg_frame_rate: "0/0",
          },
        ],
        input: streamUrl,
      },
    },
  ]);
});

app.get("/api/ffprobe/snapshot", (_req, res) => {
  imageRoute(res);
});

app.get("/api/onvif/probe", (_req, res) => {
  res.json({
    success: true,
    rtsp_candidates: [
      {
        source: "GetStreamUri",
        uri: "rtsp://admin:password@camera.local/live",
      },
    ],
  });
});

app.get("/api/go2rtc/streams/:id", (_req, res) => {
  res.json({
    video: true,
    audio: false,
    webrtc: { candidates: [] },
    streams: [],
  });
});

app.delete("/api/go2rtc/streams/:id", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/media/sync", (_req, res) => {
  res.status(202).json({ accepted: true });
});

app.get("/api/reindex", (_req, res) => {
  res.json({ success: true });
});

app.put("/api/reindex", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/cases", (req, res) => {
  const newCase = {
    id: `case-${cases.length + 1}`,
    name: req.body?.name ?? `Case ${cases.length + 1}`,
  };
  cases.push(newCase);
  res.status(201).json(newCase);
});

app.patch("/api/export/:id/case", (_req, res) => {
  res.json({ success: true });
});

app.delete("/api/export/:file", (_req, res) => {
  res.json({ success: true });
});

app.get("/api/exports", (_req, res) => {
  res.json(exportsList);
});

app.get("/api/export", (_req, res) => {
  res.json(exportsList);
});

app.get("/api/events/:id/thumbnail.jpg", (_req, res) => {
  imageRoute(res);
});

app.get("/api/events/:id/snapshot.jpg", (_req, res) => {
  imageRoute(res);
});

app.get("/api/events/:id/clip.mp4", (_req, res) => {
  res.set("Content-Type", "video/mp4");
  res.send(Buffer.alloc(0));
});

app.put("/api/events/:id/end", (_req, res) => {
  res.json({ success: true });
});

app.put("/api/events/:id/false_positive", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/events/:id/plus", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/:camera/plus/:time", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/restart", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/users/:username/role", (_req, res) => {
  res.json({ success: true });
});

app.put("/api/users/:username/role", (_req, res) => {
  res.json({ success: true });
});

app.delete("/api/classification/:name", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/classification/:name/train", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/classification/generate_examples/state", (_req, res) => {
  res.json({ success: true });
});

app.post("/api/classification/generate_examples/object", (_req, res) => {
  res.json({ success: true });
});

app.use("/api", (_req, res) => {
  res.json({ success: true });
});

const PORT = Number(process.env.PORT ?? 4000);

server.listen(PORT, () => {
  console.log(`Mock Frigate API server running on http://localhost:${PORT}`);
});

wss.on("connection", (ws) => {
  const send = (topic, payload, retain = true) => {
    ws.send(JSON.stringify({ topic, payload, retain }));
  };

  const initialPayload = () => {
    send("stats", JSON.stringify(stats));
    send("camera_activity", JSON.stringify(cameraActivity));
    send("events", JSON.stringify(eventUpdate));
    send("reviews", JSON.stringify(reviewUpdate));
    send("audio_detections", JSON.stringify({}));
    send("model_state", JSON.stringify(modelState));
    send("embeddings_reindex_progress", JSON.stringify(embeddingsProgress));
    send("birdseye_layout", JSON.stringify("last_output"));
    send("triggers", JSON.stringify({ name: "", camera: "", event_id: "", type: "", score: 0 }));
    send("job_state", JSON.stringify(jobState));
    send("audio_transcription_state", JSON.stringify("idle"));
    send("tracked_object_update", JSON.stringify({ type: "", id: "", camera: "" }));
  };

  initialPayload();

  const interval = setInterval(() => {
    const nextStats = buildStats(cameras);
    send("stats", JSON.stringify(nextStats));
  }, 2000);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.topic === "onConnect") {
        initialPayload();
      }
    } catch {
      // ignore malformed messages
    }
  });

  ws.on("close", () => clearInterval(interval));
});

function buildCamera(name, friendlyName, order, enabled = true) {
  return {
    name,
    friendly_name: friendlyName,
    enabled,
    enabled_in_config: true,
    ui: {
      dashboard: true,
      order,
      unit_system: "metric",
    },
    birdseye: {
      enabled: true,
      mode: "objects",
      order,
    },
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
    best_image_timeout: 60,
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
    ffmpeg_cmds: [],
    live: {
      height: 720,
      quality: 85,
      streams: {
        main: name,
      },
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
    notifications: {
      enabled: true,
      enabled_in_config: true,
    },
    objects: {
      filters: {
        person: {
          mask: {},
          max_area: 0,
          max_ratio: 0,
          min_area: 0,
          min_ratio: 0,
          min_score: 0,
          threshold: 0.6,
        },
      },
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
      export: {
        timelapse_args: "",
      },
      preview: {
        quality: "75",
      },
      retain: {
        days: 10,
        mode: "all",
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
      genai: {
        enabled: false,
        enabled_in_config: true,
        alerts: false,
        detections: false,
      },
    },
    rtmp: {
      enabled: false,
    },
  };
}

function buildConfig(allCameras) {
  return {
    cameras: allCameras,
    camera_groups: {
      default: {
        name: "Default",
        order: 0,
        icon: "video",
        cameras: Object.keys(allCameras),
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
        viewer: {
          name: "viewer",
        },
        admin: {
          name: "admin",
        },
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
    clips: {
      enabled: true,
      retain: { default: 10 },
    },
    snapshots: {
      enabled: true,
      retain: { default: 10 },
    },
    record: {
      enabled: true,
      retain: { default: 10 },
    },
    motion: {
      enabled: true,
    },
    objects: {
      track: ["person", "car", "dog", "cat"],
      filters: {
        person: { min_area: 0 },
      },
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
    audio: {
      enabled: false,
    },
    mqtt: {
      enabled: false,
    },
    semantic_search: {
      enabled: true,
      model: "jinav1",
      model_size: "small",
      triggers: {},
    },
    classification: {
      bird: {
        enabled: true,
      },
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
}

function buildConfigSchema() {
  return {
    type: "object",
    properties: {
      cameras: { type: "object" },
      camera_groups: { type: "object" },
      record: { type: "object" },
      snapshots: { type: "object" },
      clips: { type: "object" },
      motion: { type: "object" },
      objects: { type: "object" },
      review: { type: "object" },
      audio: { type: "object" },
      mqtt: { type: "object" },
      ui: { type: "object" },
      semantic_search: { type: "object" },
      classification: { type: "object" },
      face_recognition: { type: "object" },
      detectors: { type: "object" },
      go2rtc: { type: "object" },
      auth: { type: "object" },
    },
  };
}

function buildReviewSegments() {
  const recent = now();
  return [
    {
      id: "event-1",
      camera: "front_door",
      severity: "alert",
      start_time: recent - 3600,
      end_time: recent - 3540,
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
      start_time: recent - 2400,
      end_time: recent - 2340,
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
    {
      id: "event-3",
      camera: "garage",
      severity: "significant_motion",
      start_time: recent - 1200,
      end_time: recent - 1100,
      thumb_path: "/api/events/event-3/thumbnail.jpg",
      has_been_reviewed: false,
      data: {
        audio: [],
        detections: ["car"],
        objects: ["car"],
        significant_motion_areas: [1],
        zones: ["garage"],
      },
    },
  ];
}

function buildPreviews(segments) {
  return segments.map((segment, index) => ({
    camera: segment.camera,
    src: `/api/events/${segment.id}/snapshot.jpg`,
    type: "image/jpeg",
    start: segment.start_time - 10 + index,
    end: segment.end_time ?? segment.start_time + 10,
  }));
}

function buildStats(allCameras) {
  const cameraEntries = Object.fromEntries(
    Object.entries(allCameras).map(([name, camera], index) => [
      name,
      {
        audio_dBFPS: 0,
        audio_rms: 0,
        camera_fps: camera.enabled ? 25 : 0,
        capture_pid: 3000 + index,
        detection_enabled: camera.enabled ? 1 : 0,
        detection_fps: camera.enabled ? 8 + index : 0,
        ffmpeg_pid: 4000 + index,
        pid: 5000 + index,
        process_fps: camera.enabled ? 4 + index : 0,
        skipped_fps: 0,
        connection_quality: camera.enabled ? "excellent" : "unusable",
        expected_fps: camera.enabled ? 25 : 0,
        reconnects_last_hour: 0,
        stalls_last_hour: 0,
      },
    ]),
  );

  const pidMap = Object.fromEntries(
    Object.entries(allCameras).flatMap(([name, _camera], index) => [
      [String(4000 + index), { cmdline: `ffmpeg ${name}`, cpu: "5.0", cpu_average: "4.5", mem: "128.0" }],
      [String(5000 + index), { cmdline: `detector ${name}`, cpu: "10.0", cpu_average: "8.0", mem: "256.0" }],
    ]),
  );

  return {
    cameras: cameraEntries,
    cpu_usages: {
      ...pidMap,
      "frigate.full_system": {
        cmdline: "frigate",
        cpu: "15.2",
        cpu_average: "12.5",
        mem: "512.0",
      },
    },
    detectors: {
      coral: {
        detection_start: now() - 3600,
        inference_speed: 28,
        pid: 2451,
      },
    },
    embeddings: {
      image_embedding_speed: 15,
      face_embedding_speed: 12,
      plate_recognition_speed: 10,
      text_embedding_speed: 8,
    },
    processes: {
      camera: { pid: 6000 },
    },
    service: {
      last_updated: now(),
      storage: {
        "/media/frigate/recordings": {
          free: 500_000_000,
          total: 1_000_000_000,
          used: 500_000_000,
          mount_type: "ext4",
        },
        "/dev/shm": {
          free: 96_000_000,
          total: 128_000_000,
          used: 32_000_000,
          mount_type: "tmpfs",
          min_shm: 64_000_000,
        },
      },
      uptime: 7200,
      latest_version: "0.15.0-mock",
      version: "0.15.0-mock",
    },
    camera_fps: 25,
    process_fps: 4,
    skipped_fps: 0,
    detection_fps: 8,
  };
}

function buildCameraActivity() {
  return {
    front_door: {
      config: {
        enabled: true,
        detect: true,
        snapshots: true,
        record: true,
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
        { id: "event-1", label: "person", stationary: false, area: 1, ratio: 1, score: 0.95, sub_label: "" },
      ],
      audio_detections: [],
    },
    backyard: {
      config: {
        enabled: true,
        detect: true,
        snapshots: true,
        record: true,
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
    garage: {
      config: {
        enabled: false,
        detect: false,
        snapshots: false,
        record: false,
        audio: false,
        audio_transcription: false,
        notifications: false,
        notifications_suspended: 0,
        autotracking: false,
        alerts: false,
        detections: false,
        object_descriptions: false,
        review_descriptions: false,
      },
      motion: false,
      objects: [],
      audio_detections: [],
    },
  };
}

function toArray(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function dayKey(timestamp) {
  const date = new Date(timestamp * 1000);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
