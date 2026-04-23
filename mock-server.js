import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Minimal mock data
const cameras = {
  front_door: { name: 'Front Door', enabled: true, fps: 30, resolution: '1920x1080' },
  backyard: { name: 'Backyard', enabled: true, fps: 15, resolution: '1280x720' },
  garage: { name: 'Garage', enabled: false, fps: 10, resolution: '640x480' },
};

const events = [
  { id: '1', camera: 'front_door', type: 'person', start_time: Math.floor((Date.now() - 3600000) / 1000), end_time: Math.floor((Date.now() - 3500000) / 1000), confidence: 0.95 },
  { id: '2', camera: 'backyard', type: 'dog', start_time: Math.floor((Date.now() - 1800000) / 1000), end_time: Math.floor((Date.now() - 1700000) / 1000), confidence: 0.87 },
];

// Essential endpoints
app.get('/api/profile', (req, res) => res.json({ username: 'admin', admin: true }));

app.get('/api/config', (req, res) => {
  res.json({
    cameras,
    camera_groups: { default: { name: 'Default', order: 0, icon: 'video', cameras: Object.keys(cameras) } },
    record: { enabled: true, retain: { default: 10 } },
    snapshots: { enabled: true, retain: { default: 10 } },
    clips: { enabled: true, retain: { default: 10 } },
    objects: { track: ['person', 'car', 'dog', 'cat'], filters: { person: { min_area: 0 } } },
    face_recognition: { enabled: true },
    audio: { enabled: false },
    mqtt: { enabled: false },
    ui: { live_mode: 'mse', enabled: true },
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    service: { version: '0.15.0-demo' },
    cameras: Object.entries(cameras).reduce((acc, [key, cam]) => {
      acc[key] = { ...cam, fps: cam.fps, detection_fps: cam.fps * 0.8, process_fps: 5 };
      return acc;
    }, {}),
  });
});

app.get('/api/cameras', (req, res) => res.json(cameras));
app.get('/api/events', (req, res) => res.json(events));
app.get('/api/stats', (req, res) => {
  res.json({
    cpu_usages: {
      'frigate.full_system': { cpu: (Math.random() * 30).toFixed(1), mem: '256.0' },
      'frigate.detect': { cpu: (Math.random() * 60).toFixed(1), mem: '512.0' },
    },
  });
});

// WebSocket real-time stats
wss.on('connection', (ws) => {
  const interval = setInterval(() => {
    try {
      ws.send(JSON.stringify({
        type: 'stats',
        data: {
          cpu_usages: {
            'frigate.full_system': { cpu: (Math.random() * 30).toFixed(1), mem: '256.0' },
            'frigate.detect': { cpu: (Math.random() * 60).toFixed(1), mem: '512.0' },
          },
        },
      }));
    } catch (err) {}
  }, 2000);
  
  ws.on('close', () => clearInterval(interval));
});

// Serve placeholder images
app.get('*/thumbnail.jpg', (req, res) => {
  res.set('Content-Type', 'image/jpeg');
  res.send(Buffer.from('MOCK_IMAGE'));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`✅ Frigate Mock Server running on ${PORT}`);
  console.log(`   API: http://localhost:${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
});
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// Mock camera data with comprehensive status
const cameras = {
  front_door: {
    name: 'Front Door',
    enabled: true,
    fps: 30,
    resolution: '1920x1080',
    model: 'yolov8n',
    status: 'active',
    current_frame_time: Date.now(),
  },
  backyard: {
    name: 'Backyard',
    enabled: true,
    fps: 15,
    resolution: '1280x720',
    model: 'yolov8n',
    status: 'active',
    current_frame_time: Date.now(),
  },
  garage: {
    name: 'Garage',
    enabled: false,
    fps: 10,
    resolution: '640x480',
    model: 'yolov8n',
    status: 'inactive',
    current_frame_time: null,
  },
};

// Mock events with comprehensive data
const events = [
  {
    id: '1',
    camera: 'front_door',
    type: 'person',
    start_time: Math.floor((Date.now() - 3600000) / 1000),
    end_time: Math.floor((Date.now() - 3500000) / 1000),
    confidence: 0.95,
    thumbnail: '/api/events/1/thumbnail.jpg',
    has_clip: true,
    has_snapshot: true,
  },
  {
    id: '2',
    camera: 'backyard',
    type: 'dog',
    start_time: Math.floor((Date.now() - 1800000) / 1000),
    end_time: Math.floor((Date.now() - 1700000) / 1000),
    confidence: 0.87,
    thumbnail: '/api/events/2/thumbnail.jpg',
    has_clip: true,
    has_snapshot: true,
  },
  {
    id: '3',
    camera: 'front_door',
    type: 'car',
    start_time: Math.floor((Date.now() - 600000) / 1000),
    end_time: Math.floor((Date.now() - 500000) / 1000),
    confidence: 0.92,
    thumbnail: '/api/events/3/thumbnail.jpg',
    has_clip: true,
    has_snapshot: true,
  },
  {
    id: '4',
    camera: 'backyard',
    type: 'cat',
    start_time: Math.floor((Date.now() - 300000) / 1000),
    end_time: Math.floor((Date.now() - 200000) / 1000),
    confidence: 0.78,
    thumbnail: '/api/events/4/thumbnail.jpg',
    has_clip: false,
    has_snapshot: true,
  },
];

// User profile endpoint
app.get('/api/profile', (req, res) => {
  res.json({
    username: 'admin',
    admin: true,
    email: 'admin@frigate.local',
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    cameras,
    camera_groups: {
      default: {
        name: 'Default',
        order: 0,
        icon: 'video',
        cameras: Object.keys(cameras),
      },
      backyard: {
        name: 'Backyard',
        order: 1,
        icon: 'trees',
        cameras: ['backyard'],
      },
    },
    detectors: {
      coral: { type: 'edgetpu', num_threads: 4 },
    },
    record: {
      enabled: true,
      retain: { default: 10, days: 30 },
      preview: { quality: 75, retain: { default: 7 } },
    },
    snapshots: {
      enabled: true,
      retain: { default: 10, days: 30 },
      quality: 75,
    },
    clips: {
      enabled: true,
      retain: { default: 10, days: 30 },
      quality: 75,
    },
    motion: {
      enabled: true,
      mask: [],
    },
    objects: {
      track: ['person', 'car', 'dog', 'cat', 'bird'],
      filters: {
        person: { min_area: 0, max_area: 0, threshold: 0.6 },
        car: { min_area: 0, max_area: 0, threshold: 0.6 },
        dog: { min_area: 0, max_area: 0, threshold: 0.6 },
        cat: { min_area: 0, max_area: 0, threshold: 0.6 },
      },
    },
    face_recognition: {
      enabled: true,
      model: 'mobilefacenet',
    },
    audio: {
      enabled: false,
      listen: false,
      max_energy: 0,
      min_volume: 0,
    },
    environment_vars: {},
    mqtt: {
      enabled: false,
      host: 'localhost',
      port: 1883,
      topic_prefix: 'frigate',
    },
    ui: {
      live_mode: 'mse',
      restream: 'view',
      maxZoomLevel: 8,
      truncated_attr: false,
      enabled: true,
    },
  });
});

app.get('/api/config/schema', (req, res) => {
  res.json({
    type: 'object',
    properties: {
      cameras: { type: 'object' },
      detectors: { type: 'object' },
    },
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    service: {
      version: '0.15.0',
      storage: { '/media/frigate/recordings': { total: 1000000, used: 500000 } },
    },
    cameras: Object.entries(cameras).reduce((acc, [key, cam]) => {
      acc[key] = {
        ...cam,
        fps: cam.fps,
        detection_fps: cam.fps * 0.8,
        process_fps: 5,
        skipped_fps: 0,
        current_frame_time: cam.current_frame_time,
      };
      return acc;
    }, {}),
  });
});

app.get('/api/cameras', (req, res) => {
  res.json(cameras);
});

app.get('/api/cameras/:name', (req, res) => {
  const camera = cameras[req.params.name];
  if (camera) {
    res.json(camera);
  } else {
    res.status(404).json({ error: 'Camera not found' });
  }
});

app.get('/api/cameras/:name/latest.jpg', (req, res) => {
  res.set('Content-Type', 'image/jpeg');
  res.send(Buffer.from('MOCK_IMAGE_DATA'));
});

app.get('/api/cameras/:name/recordings', (req, res) => {
  res.json({ recordings: [] });
});

app.get('/api/events', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 100;
  res.json(events.slice(0, limit));
});

app.get('/api/events/:id', (req, res) => {
  const event = events.find(e => e.id === req.params.id);
  if (event) {
    res.json(event);
  } else {
    res.status(404).json({ error: 'Event not found' });
  }
});

app.get('/api/events/:id/thumbnail.jpg', (req, res) => {
  res.set('Content-Type', 'image/jpeg');
  res.send(Buffer.from('MOCK_IMAGE_DATA'));
});

app.get('/api/events/:id/snapshot.jpg', (req, res) => {
  res.set('Content-Type', 'image/jpeg');
  res.send(Buffer.from('MOCK_IMAGE_DATA'));
});

app.get('/api/events/:id/clip.mp4', (req, res) => {
  res.set('Content-Type', 'video/mp4');
  res.send(Buffer.from('MOCK_VIDEO_DATA'));
});

app.get('/api/stats', (req, res) => {
  res.json({
    service: {
      frigate: {
        pid: 1234,
        start_time: Math.floor(Date.now() / 1000) - 3600,
        camera_fps: 90,
        detection_fps: 15,
        detection_start: Math.floor(Date.now() / 1000) - 3600,
        ffmpeg_pid: 1235,
      },
    },
    cpu_usages: {
      'frigate.full_system': {
        cpu: '15.2',
        mem: '512.0',
      },
      'frigate.recording': {
        cpu: '5.1',
        mem: '128.0',
      },
      'frigate.detect': {
        cpu: '45.0',
        mem: '256.0',
      },
    },
    gpu_usages: {},
    cameras: Object.keys(cameras).reduce((acc, cam) => {
      acc[cam] = {
        fps: cameras[cam].fps,
        detection_fps: cameras[cam].fps * 0.8,
        process_fps: 5,
        skipped_fps: 0,
      };
      return acc;
    }, {}),
  });
});

app.get('/api/version', (req, res) => {
  res.json({ version: '0.15.0-mock' });
});

app.get('/api/reviews/summary', (req, res) => {
  res.json({ data: [] });
});

app.get('/api/logs/:option', (req, res) => {
  res.json({ logs: [] });
});

// Serve placeholder images and videos
app.get('/profile.1', (req, res) => {
  res.status(200).set('Content-Type', 'image/jpeg').send(Buffer.allocUnsafe(1));
});

// Clips endpoint
app.get('/clips', (req, res) => {
  res.json({ clips: [] });
});

// VOD endpoint
app.get('/vod', (req, res) => {
  res.json({ segments: [] });
});

// Exports endpoint
app.get('/exports', (req, res) => {
  res.json({ exports: [] });
});

// Health check
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok' });
});

// Auth endpoints
app.post('/api/auth/verify', (req, res) => {
  res.json({ success: true });
});

app.post('/api/auth', (req, res) => {
  res.json({ access_token: 'mock_token_12345', token_type: 'bearer' });
});

// User endpoints
app.get('/api/user', (req, res) => {
  res.json({
    username: 'admin',
    admin: true,
    email: 'admin@frigate.local',
  });
});

// Storage endpoints
app.get('/api/storage', (req, res) => {
  res.json({
    '/media/frigate/recordings': {
      total: 1000000000,
      used: 500000000,
      free: 500000000,
    },
  });
});

// Recording endpoints
app.get('/api/recordings/summary', (req, res) => {
  res.json({
    front_door: { count: 45, duration: 3600 },
    backyard: { count: 32, duration: 2400 },
    garage: { count: 0, duration: 0 },
  });
});

// Event filter endpoints
app.get('/api/events/summary', (req, res) => {
  res.json({
    person: { count: 10, hours: [2, 1, 3, 1, 0, 2, 1] },
    car: { count: 5, hours: [1, 0, 1, 1, 1, 0, 1] },
    dog: { count: 3, hours: [0, 1, 0, 0, 1, 0, 1] },
    cat: { count: 2, hours: [0, 0, 0, 1, 0, 0, 1] },
  });
});

// Detector status
app.get('/api/detectors', (req, res) => {
  res.json({
    coral: {
      type: 'edgetpu',
      model_path: '/config/models/coral_model.tflite',
      enabled: true,
      detection_start: Math.floor(Date.now() / 1000),
    },
  });
});

// Birdseye endpoint
app.get('/api/birdseye/view', (req, res) => {
  res.json({
    cameras: ['front_door', 'backyard', 'garage'],
    layout: 'last_output',
  });
});

app.get('/api/birdseye/latest.jpg', (req, res) => {
  res.set('Content-Type', 'image/jpeg');
  res.send(Buffer.from('MOCK_BIRDSEYE_IMAGE'));
});

// Notification endpoints
app.get('/api/notifications', (req, res) => {
  res.json([]);
});

// Brightness endpoint
app.get('/api/cameras/:name/brightness', (req, res) => {
  res.json({ brightness: 50 });
});

// Ptzctrl endpoint (for pan/tilt/zoom cameras)
app.post('/api/cameras/:name/ptz', (req, res) => {
  res.json({ success: true });
});

app.get('/api/cameras/:name/ptz/info', (req, res) => {
  res.json({ 
    features: [],
    position: { x: 0, y: 0, z: 0 },
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Mock Frigate API Server Running
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  API:      http://localhost:${PORT}
  Frontend: http://localhost:5173 (served by Vite)
  WebSocket: ws://localhost:${PORT}/ws
  
  Mock Data Available:
  • 3 Cameras (front_door, backyard, garage)
  • 4 Detection Events (person, dog, cat, car)
  • Full Config endpoints
  • Status & Stats endpoints
  • Real-time Stats via WebSocket
  
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  // Send stats every 2 seconds
  const statsInterval = setInterval(() => {
    const stats = {
      type: 'stats',
      data: {
        service: {
          frigate: {
            pid: 1234,
            start_time: Math.floor(Date.now() / 1000) - 3600,
            camera_fps: 90,
            detection_fps: 15,
            detection_start: Math.floor(Date.now() / 1000) - 3600,
            ffmpeg_pid: 1235,
          },
        },
        cpu_usages: {
          'frigate.full_system': {
            cpu: (Math.random() * 30).toFixed(1),
            mem: (256 + Math.random() * 256).toFixed(1),
          },
          'frigate.recording': {
            cpu: (Math.random() * 10).toFixed(1),
            mem: (128 + Math.random() * 64).toFixed(1),
          },
          'frigate.detect': {
            cpu: (Math.random() * 60).toFixed(1),
            mem: (256 + Math.random() * 128).toFixed(1),
          },
        },
        gpu_usages: {},
        cameras: Object.keys(cameras).reduce((acc, cam) => {
          acc[cam] = {
            fps: cameras[cam].fps,
            detection_fps: cameras[cam].fps * 0.8,
            process_fps: 5,
            skipped_fps: 0,
          };
          return acc;
        }, {}),
      },
    };

    try {
      ws.send(JSON.stringify(stats));
    } catch (err) {
      console.error('Error sending stats:', err);
    }
  }, 2000);

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clearInterval(statsInterval);
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});
