# Front Desk Dashboard API Documentation

## 🎯 **Overview**

The Front Desk Dashboard API provides comprehensive statistics and metrics for receptionists to monitor station performance, queue status, and application processing at biometric centers.

---

## 🚀 **Base URL**

```
https://your-api-domain.com/api/v1/dashboard-frontdesk
```

---

## 🔐 **Authentication**

All endpoints require authentication using JWT Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

---

## 📊 **API Endpoints**

### **1. Get Comprehensive Dashboard Statistics**

**Endpoint:** `GET /:stationId/stats`

**Description:** Retrieve all dashboard statistics for a specific station including queue, station, application, processing, and agent metrics.

**Parameters:**

- `stationId` (UUID, required): Biometric center/station ID

**Response:**

```json
{
  "success": true,
  "data": {
    "queueStats": {
      "waitingQueue": 42,
      "inProgress": 18,
      "totalInQueue": 60
    },
    "stationStats": {
      "availableStations": 7,
      "busyStations": 5,
      "totalStations": 12,
      "utilizationPercentage": 41.67
    },
    "applicationStats": {
      "todayApplications": 24,
      "completedToday": 15,
      "pendingFromPreviousDays": 38,
      "totalApplications": 80
    },
    "processingStats": {
      "avgProcessingTime": 8.5,
      "fastestProcessingToday": 3.2,
      "slowestProcessingToday": 15.8,
      "totalProcessingTimeToday": 127.5
    },
    "agentStats": {
      "activeAgents": 12,
      "agentsOnBreak": 3,
      "agentsOffDuty": 2,
      "totalAgents": 17
    },
    "lastUpdated": "2025-08-27T21:41:00Z",
    "stationId": "station-uuid-123",
    "stationName": "Main Reception"
  },
  "message": "Dashboard statistics retrieved successfully"
}
```

**Example Request:**

```bash
curl -X GET "https://your-api-domain.com/api/v1/dashboard-frontdesk/123e4567-e89b-12d3-a456-426614174000/stats" \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

### **2. Get Real-Time Queue Updates**

**Endpoint:** `GET /:stationId/queue-updates`

**Description:** Retrieve real-time updates for queue statistics and station status. Useful for WebSocket or Server-Sent Events.

**Parameters:**

- `stationId` (UUID, required): Biometric center/station ID

**Response:**

```json
{
  "success": true,
  "data": {
    "queueStats": {
      "waitingQueue": 42,
      "inProgress": 18,
      "totalInQueue": 60
    },
    "stationStats": {
      "availableStations": 7,
      "busyStations": 5,
      "totalStations": 12,
      "utilizationPercentage": 41.67
    },
    "timestamp": "2025-08-27T21:41:00Z"
  },
  "message": "Queue updates retrieved successfully"
}
```

**Example Request:**

```bash
curl -X GET "https://your-api-domain.com/api/v1/dashboard-frontdesk/123e4567-e89b-12d3-a456-426614174000/queue-updates" \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

### **3. Get Station-Specific Metrics**

**Endpoint:** `GET /:stationId/metrics`

**Description:** Retrieve station-specific metrics including efficiency score and performance indicators.

**Parameters:**

- `stationId` (UUID, required): Biometric center/station ID

**Response:**

```json
{
  "success": true,
  "data": {
    "stationStats": {
      "availableStations": 7,
      "busyStations": 5,
      "totalStations": 12,
      "utilizationPercentage": 41.67
    },
    "queueStats": {
      "waitingQueue": 42,
      "inProgress": 18,
      "totalInQueue": 60
    },
    "efficiency": 75,
    "lastUpdated": "2025-08-27T21:41:00Z"
  },
  "message": "Station metrics retrieved successfully"
}
```

**Example Request:**

```bash
curl -X GET "https://your-api-domain.com/api/v1/dashboard-frontdesk/123e4567-e89b-12d3-a456-426614174000/metrics" \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

### **4. Get Queue Statistics Only**

**Endpoint:** `GET /:stationId/queue-stats`

**Description:** Retrieve only queue-related statistics for the station.

**Parameters:**

- `stationId` (UUID, required): Biometric center/station ID

**Response:**

```json
{
  "success": true,
  "data": {
    "waitingQueue": 42,
    "inProgress": 18,
    "totalInQueue": 60
  },
  "message": "Queue statistics retrieved successfully"
}
```

**Example Request:**

```bash
curl -X GET "https://your-api-domain.com/api/v1/dashboard-frontdesk/123e4567-e89b-12d3-a456-426614174000/queue-stats" \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

### **5. Get Station Statistics Only**

**Endpoint:** `GET /:stationId/station-stats`

**Description:** Retrieve only station-related statistics.

**Parameters:**

- `stationId` (UUID, required): Biometric center/station ID

**Response:**

```json
{
  "success": true,
  "data": {
    "availableStations": 7,
    "busyStations": 5,
    "totalStations": 12,
    "utilizationPercentage": 41.67
  },
  "message": "Station statistics retrieved successfully"
}
```

**Example Request:**

```bash
curl -X GET "https://your-api-domain.com/api/v1/dashboard-frontdesk/123e4567-e89b-12d3-a456-426614174000/station-stats" \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

### **6. Get Application Statistics Only**

**Endpoint:** `GET /:stationId/application-stats`

**Description:** Retrieve only application-related statistics.

**Parameters:**

- `stationId` (UUID, required): Biometric center/station ID

**Response:**

```json
{
  "success": true,
  "data": {
    "todayApplications": 24,
    "completedToday": 15,
    "pendingFromPreviousDays": 38,
    "totalApplications": 80
  },
  "message": "Application statistics retrieved successfully"
}
```

**Example Request:**

```bash
curl -X GET "https://your-api-domain.com/api/v1/dashboard-frontdesk/123e4567-e89b-12d3-a456-426614174000/application-stats" \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

### **7. Get Processing Statistics Only**

**Endpoint:** `GET /:stationId/processing-stats`

**Description:** Retrieve only processing time-related statistics.

**Parameters:**

- `stationId` (UUID, required): Biometric center/station ID

**Response:**

```json
{
  "success": true,
  "data": {
    "avgProcessingTime": 8.5,
    "fastestProcessingToday": 3.2,
    "slowestProcessingToday": 15.8,
    "totalProcessingTimeToday": 127.5
  },
  "message": "Processing statistics retrieved successfully"
}
```

**Example Request:**

```bash
curl -X GET "https://your-api-domain.com/api/v1/dashboard-frontdesk/123e4567-e89b-12d3-a456-426614174000/processing-stats" \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

### **8. Get Agent Statistics Only**

**Endpoint:** `GET /:stationId/agent-stats`

**Description:** Retrieve only agent-related statistics.

**Parameters:**

- `stationId` (UUID, required): Biometric center/station ID

**Response:**

```json
{
  "success": true,
  "data": {
    "activeAgents": 12,
    "agentsOnBreak": 3,
    "agentsOffDuty": 2,
    "totalAgents": 17
  },
  "message": "Agent statistics retrieved successfully"
}
```

**Example Request:**

```bash
curl -X GET "https://your-api-domain.com/api/v1/dashboard-frontdesk/123e4567-e89b-12d3-a456-426614174000/agent-stats" \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

### **9. Health Check**

**Endpoint:** `GET /health`

**Description:** Check if the dashboard service is running properly.

**Response:**

```json
{
  "success": true,
  "message": "Front Desk Dashboard service is running",
  "timestamp": "2025-08-27T21:41:00Z",
  "version": "1.0.0"
}
```

**Example Request:**

```bash
curl -X GET "https://your-api-domain.com/api/v1/dashboard-frontdesk/health" \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## 📱 **Frontend Integration Examples**

### **React Hook for Dashboard Stats**

```typescript
import { useState, useEffect } from 'react';

interface DashboardStats {
  queueStats: QueueStats;
  stationStats: StationStats;
  applicationStats: ApplicationStats;
  processingStats: ProcessingStats;
  agentStats: AgentStats;
  lastUpdated: string;
  stationId: string;
  stationName: string;
}

export const useDashboardStats = (stationId: string) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/v1/dashboard-frontdesk/${stationId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();
      setStats(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [stationId]);

  return { stats, loading, error, refetch: fetchStats };
};
```

### **Vue.js Composable**

```typescript
// composables/useDashboardStats.ts
import { ref, onMounted, onUnmounted } from 'vue';

export const useDashboardStats = (stationId: string) => {
  const stats = ref(null);
  const loading = ref(true);
  const error = ref(null);

  const fetchStats = async () => {
    try {
      loading.value = true;
      const response = await fetch(
        `/api/v1/dashboard-frontdesk/${stationId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      );

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }

      const data = await response.json();
      stats.value = data.data;
      error.value = null;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  let interval: NodeJS.Timeout;

  onMounted(() => {
    fetchStats();
    interval = setInterval(fetchStats, 30000);
  });

  onUnmounted(() => {
    if (interval) clearInterval(interval);
  });

  return { stats, loading, error, refetch: fetchStats };
};
```

### **Angular Service**

```typescript
// services/dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private baseUrl = '/api/v1/dashboard-frontdesk';

  constructor(private http: HttpClient) {}

  getDashboardStats(stationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${stationId}/stats`);
  }

  getRealTimeStats(
    stationId: string,
    refreshInterval = 30000,
  ): Observable<any> {
    return interval(refreshInterval).pipe(
      startWith(0),
      switchMap(() => this.getDashboardStats(stationId)),
    );
  }

  getQueueStats(stationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${stationId}/queue-stats`);
  }

  getStationStats(stationId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${stationId}/station-stats`);
  }
}
```

---

## 🔄 **Real-Time Updates**

### **WebSocket Integration**

```typescript
// Real-time dashboard updates using WebSocket
class DashboardWebSocket {
  private ws: WebSocket;
  private stationId: string;

  constructor(stationId: string) {
    this.stationId = stationId;
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(
      `ws://your-api-domain.com/dashboard-frontdesk/${this.stationId}/ws`,
    );

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleUpdate(data);
    };

    this.ws.onclose = () => {
      // Reconnect after 5 seconds
      setTimeout(() => this.connect(), 5000);
    };
  }

  private handleUpdate(data: any) {
    // Handle different types of updates
    switch (data.type) {
      case 'QUEUE_UPDATE':
        this.updateQueueStats(data.data);
        break;
      case 'STATION_UPDATE':
        this.updateStationStats(data.data);
        break;
      case 'APPLICATION_UPDATE':
        this.updateApplicationStats(data.data);
        break;
    }
  }

  private updateQueueStats(stats: any) {
    // Update queue display
    console.log('Queue updated:', stats);
  }

  private updateStationStats(stats: any) {
    // Update station display
    console.log('Station updated:', stats);
  }

  private updateApplicationStats(stats: any) {
    // Update application display
    console.log('Applications updated:', stats);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}
```

---

## 📊 **Data Models**

### **QueueStats**

```typescript
interface QueueStats {
  waitingQueue: number; // Applications waiting in queue
  inProgress: number; // Applications currently being processed
  totalInQueue: number; // Total applications in queue
}
```

### **StationStats**

```typescript
interface StationStats {
  availableStations: number; // Currently available stations
  busyStations: number; // Currently occupied stations
  totalStations: number; // Total stations at center
  utilizationPercentage: number; // Station utilization percentage
}
```

### **ApplicationStats**

```typescript
interface ApplicationStats {
  todayApplications: number; // New applications today
  completedToday: number; // Applications completed today
  pendingFromPreviousDays: number; // Pending from previous days
  totalApplications: number; // Total applications in system
}
```

### **ProcessingStats**

```typescript
interface ProcessingStats {
  avgProcessingTime: number; // Average processing time (minutes)
  fastestProcessingToday: number; // Fastest processing today (minutes)
  slowestProcessingToday: number; // Slowest processing today (minutes)
  totalProcessingTimeToday: number; // Total processing time today (minutes)
}
```

### **AgentStats**

```typescript
interface AgentStats {
  activeAgents: number; // Currently active agents
  agentsOnBreak: number; // Agents on break
  agentsOffDuty: number; // Agents off duty
  totalAgents: number; // Total agents assigned
}
```

---

## 🚨 **Error Handling**

### **HTTP Status Codes**

- **200 OK**: Request successful
- **400 Bad Request**: Invalid parameters
- **401 Unauthorized**: Missing or invalid authentication
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Station not found
- **500 Internal Server Error**: Server error

### **Error Response Format**

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "timestamp": "2025-08-27T21:41:00Z"
}
```

### **Common Error Scenarios**

1. **Station Not Found**

   ```json
   {
     "success": false,
     "message": "Station with ID station-uuid-123 not found",
     "error": "NOT_FOUND",
     "timestamp": "2025-08-27T21:41:00Z"
   }
   ```

2. **Unauthorized Access**

   ```json
   {
     "success": false,
     "message": "Unauthorized access",
     "error": "UNAUTHORIZED",
     "timestamp": "2025-08-27T21:41:00Z"
   }
   ```

3. **Invalid Station ID**
   ```json
   {
     "success": false,
     "message": "Invalid UUID format",
     "error": "VALIDATION_ERROR",
     "timestamp": "2025-08-27T21:41:00Z"
   }
   ```

---

## 🔧 **Configuration**

### **Environment Variables**

```bash
# Dashboard refresh interval (milliseconds)
DASHBOARD_REFRESH_INTERVAL=30000

# Real-time update interval (milliseconds)
REALTIME_UPDATE_INTERVAL=5000

# Maximum concurrent dashboard requests
MAX_CONCURRENT_DASHBOARD_REQUESTS=10
```

### **Rate Limiting**

- **Standard endpoints**: 100 requests per minute per user
- **Real-time endpoints**: 1000 requests per minute per user
- **Health check**: No rate limiting

---

## 📈 **Performance Considerations**

### **Caching Strategy**

1. **Dashboard Stats**: Cache for 30 seconds
2. **Queue Updates**: Cache for 10 seconds
3. **Station Metrics**: Cache for 60 seconds
4. **Agent Stats**: Cache for 5 minutes

### **Database Optimization**

- Use database indexes on frequently queried fields
- Implement query result caching
- Use database views for complex aggregations
- Monitor query performance with slow query logs

---

## 🧪 **Testing**

### **Unit Tests**

```bash
# Run dashboard service tests
npm run test dashboard-frontdesk.service.spec.ts

# Run dashboard controller tests
npm run test dashboard-frontdesk.controller.spec.ts
```

### **Integration Tests**

```bash
# Run dashboard API integration tests
npm run test:e2e dashboard-frontdesk
```

### **Load Testing**

```bash
# Test dashboard performance under load
npm run test:load dashboard-frontdesk
```

---

## 🚀 **Deployment**

### **Docker Configuration**

```dockerfile
# Build dashboard service
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production image
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
```

### **Health Check Endpoint**

```bash
# Kubernetes health check
curl -f http://localhost:3000/api/v1/dashboard-frontdesk/health || exit 1
```

---

## 📚 **Additional Resources**

- [Swagger Documentation](./swagger)
- [API Changelog](./CHANGELOG.md)
- [Dashboard Widgets](./widgets)
- [Performance Monitoring](./monitoring)

---

This API provides comprehensive dashboard functionality for front desk staff to monitor and manage biometric center operations efficiently! 🎯
