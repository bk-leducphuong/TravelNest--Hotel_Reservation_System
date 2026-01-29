# ELK Stack Setup Guide for Error Tracking and System Monitoring

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [1. Elasticsearch](#1-elasticsearch)
  - [2. Kibana](#2-kibana)
  - [3. Logstash](#3-logstash)
  - [4. Filebeat](#4-filebeat)
- [Configuration](#configuration)
- [Integration with Node.js Application](#integration-with-nodejs-application)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Useful Queries and Dashboards](#useful-queries-and-dashboards)

---

## Overview

The ELK Stack (Elasticsearch, Logstash, Kibana) combined with Filebeat provides a powerful solution for:

- **Error Tracking**: Centralized error logging and analysis
- **System Monitoring**: Real-time health metrics and performance monitoring
- **Log Aggregation**: Collecting logs from multiple sources
- **Data Visualization**: Creating dashboards and alerts

### Component Roles

| Component         | Purpose                                                                       |
| ----------------- | ----------------------------------------------------------------------------- |
| **Elasticsearch** | Distributed search and analytics engine for storing and indexing logs         |
| **Logstash**      | Server-side data processing pipeline that ingests, transforms, and sends data |
| **Kibana**        | Visualization layer for exploring and analyzing data                          |
| **Filebeat**      | Lightweight shipper for forwarding and centralizing log data                  |

---

## Architecture

```
Application Logs → Filebeat → Logstash → Elasticsearch → Kibana
                       ↓          ↓            ↓
                  (Collect)  (Transform)   (Store)    (Visualize)
```

**Data Flow:**

1. Application generates logs (JSON format recommended)
2. Filebeat monitors log files and ships them to Logstash
3. Logstash processes, filters, and enriches the data
4. Elasticsearch stores and indexes the processed data
5. Kibana provides visualization and alerting capabilities

---

## Prerequisites

### System Requirements

**Minimum Hardware:**

- **RAM**: 8GB (16GB recommended for production)
- **CPU**: 4 cores
- **Disk**: 50GB SSD (faster I/O is critical for Elasticsearch)

**Software:**

- **OS**: Ubuntu 20.04+ / CentOS 7+ / RHEL 8+
- **Java**: OpenJDK 11 or 17 (for Elasticsearch and Logstash)
- **Docker & Docker Compose** (optional, for containerized setup)

### Network Ports

| Service       | Port | Purpose            |
| ------------- | ---- | ------------------ |
| Elasticsearch | 9200 | HTTP API           |
| Elasticsearch | 9300 | Node communication |
| Kibana        | 5601 | Web UI             |
| Logstash      | 5044 | Beats input        |
| Logstash      | 9600 | Monitoring API     |

---

## Installation

### Method 1: Docker Compose (Recommended for Development)

#### Step 1: Create Docker Compose File

Create `docker-compose.elk.yml` in your project root:

```yaml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.3
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - 'ES_JAVA_OPTS=-Xms2g -Xmx2g'
      - xpack.security.enabled=true
      - ELASTIC_PASSWORD=changeme
      - xpack.security.http.ssl.enabled=false
    ports:
      - '9200:9200'
      - '9300:9300'
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - elk
    healthcheck:
      test:
        ['CMD-SHELL', 'curl -f http://localhost:9200/_cluster/health || exit 1']
      interval: 30s
      timeout: 10s
      retries: 5

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.3
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=elastic
      - ELASTICSEARCH_PASSWORD=changeme
    ports:
      - '5601:5601'
    networks:
      - elk
    depends_on:
      elasticsearch:
        condition: service_healthy
    healthcheck:
      test: ['CMD-SHELL', 'curl -f http://localhost:5601/api/status || exit 1']
      interval: 30s
      timeout: 10s
      retries: 5

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.3
    container_name: logstash
    volumes:
      - ./logstash/config/logstash.yml:/usr/share/logstash/config/logstash.yml
      - ./logstash/pipeline:/usr/share/logstash/pipeline
    ports:
      - '5044:5044'
      - '9600:9600'
    environment:
      - 'LS_JAVA_OPTS=-Xms1g -Xmx1g'
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=elastic
      - ELASTICSEARCH_PASSWORD=changeme
    networks:
      - elk
    depends_on:
      elasticsearch:
        condition: service_healthy

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.3
    container_name: filebeat
    user: root
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./logs:/logs:ro # Mount your application logs
    command: filebeat -e -strict.perms=false
    networks:
      - elk
    depends_on:
      logstash:
        condition: service_started

volumes:
  elasticsearch_data:
    driver: local

networks:
  elk:
    driver: bridge
```

#### Step 2: Start the Stack

```bash
docker-compose -f docker-compose.elk.yml up -d
```

#### Step 3: Verify Installation

```bash
# Check Elasticsearch
curl -u elastic:changeme http://localhost:9200/_cluster/health?pretty

# Access Kibana
# Open browser: http://localhost:5601
# Login: elastic / changeme
```

---

## Configuration

### 1. Logstash Pipeline Configuration

Create `/etc/logstash/conf.d/travelnest-pipeline.conf` or `./logstash/pipeline/logstash.conf`:

```ruby
input {
  beats {
    port => 5044
    host => "0.0.0.0"
  }
}

filter {
  # Parse JSON logs
  if [message] =~ /^\{.*\}$/ {
    json {
      source => "message"
      target => "parsed"
    }

    # Extract fields from parsed JSON
    if [parsed] {
      mutate {
        add_field => {
          "log_level" => "%{[parsed][level]}"
          "timestamp" => "%{[parsed][timestamp]}"
          "service_name" => "%{[parsed][service]}"
          "error_message" => "%{[parsed][message]}"
          "error_stack" => "%{[parsed][stack]}"
          "request_id" => "%{[parsed][requestId]}"
          "user_id" => "%{[parsed][userId]}"
          "method" => "%{[parsed][method]}"
          "url" => "%{[parsed][url]}"
          "status_code" => "%{[parsed][statusCode]}"
          "response_time" => "%{[parsed][responseTime]}"
        }
      }
    }
  }

  # Grok pattern for non-JSON logs
  else {
    grok {
      match => {
        "message" => "%{TIMESTAMP_ISO8601:timestamp} \[%{LOGLEVEL:log_level}\] %{GREEDYDATA:log_message}"
      }
    }
  }

  # Parse timestamp
  date {
    match => [ "timestamp", "ISO8601", "yyyy-MM-dd HH:mm:ss" ]
    target => "@timestamp"
  }

  # Add geoip for IP addresses
  if [client_ip] {
    geoip {
      source => "client_ip"
      target => "geoip"
    }
  }

  # Classify error severity
  if [log_level] == "error" or [log_level] == "fatal" {
    mutate {
      add_tag => ["error"]
      add_field => { "severity" => "high" }
    }
  } else if [log_level] == "warn" {
    mutate {
      add_tag => ["warning"]
      add_field => { "severity" => "medium" }
    }
  } else {
    mutate {
      add_field => { "severity" => "low" }
    }
  }

  # Add hostname
  mutate {
    add_field => { "hostname" => "%{[host][name]}" }
  }

  # Remove unnecessary fields
  mutate {
    remove_field => ["parsed", "agent", "ecs", "input", "log"]
  }
}

output {
  # Output to Elasticsearch
  elasticsearch {
    hosts => ["http://elasticsearch:9200"]
    user => "elastic"
    password => "changeme"
    index => "travelnest-logs-%{+YYYY.MM.dd}"

    # Index template
    template_name => "travelnest-logs"
    template_pattern => "travelnest-logs-*"
  }

  # Debug output (comment out in production)
  # stdout {
  #   codec => rubydebug
  # }
}
```

### 2. Filebeat Configuration

Create `./filebeat/filebeat.yml` or edit `/etc/filebeat/filebeat.yml`:

```yaml
# ============================== Filebeat inputs ===============================
filebeat.inputs:
  # Application logs
  - type: log
    enabled: true
    paths:
      - /logs/*.log
      - /logs/**/*.log
    fields:
      service: travelnest-server
      environment: production
    fields_under_root: true
    json.keys_under_root: true
    json.add_error_key: true
    multiline.pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
    multiline.negate: true
    multiline.match: after

  # Error logs specifically
  - type: log
    enabled: true
    paths:
      - /logs/error.log
    fields:
      service: travelnest-server
      log_type: error
      environment: production
    fields_under_root: true

  # Access logs
  - type: log
    enabled: true
    paths:
      - /logs/access.log
    fields:
      service: travelnest-server
      log_type: access
      environment: production
    fields_under_root: true

  # Docker container logs
  - type: container
    enabled: true
    paths:
      - '/var/lib/docker/containers/*/*.log'
    processors:
      - add_docker_metadata:
          host: 'unix:///var/run/docker.sock'

# ============================== Filebeat modules ==============================
filebeat.config.modules:
  path: ${path.config}/modules.d/*.yml
  reload.enabled: false

# ============================= Processors =====================================
processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_cloud_metadata: ~
  - add_docker_metadata: ~
  - add_kubernetes_metadata: ~

# ================================= General ====================================
name: travelnest-filebeat
tags: ['travelnest', 'production', 'nodejs']

# ================================== Outputs ===================================

# ------------------------------ Logstash Output -------------------------------
output.logstash:
  hosts: ['logstash:5044']

  # Optional: Load balance between multiple Logstash hosts
  # loadbalance: true

  # Compression
  compression_level: 3

  # Worker threads
  worker: 2

  # Bulk settings
  bulk_max_size: 2048

# Alternative: Direct to Elasticsearch (bypass Logstash)
# output.elasticsearch:
#   hosts: ["elasticsearch:9200"]
#   username: "elastic"
#   password: "changeme"
#   index: "travelnest-logs-%{+yyyy.MM.dd}"

# =================================== Kibana ===================================
setup.kibana:
  host: 'kibana:5601'

# ================================= Logging ====================================
logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
  permissions: 0644

# ================================= Monitoring =================================
monitoring.enabled: true
monitoring.elasticsearch:
  hosts: ['elasticsearch:9200']
  username: 'elastic'
  password: 'changeme'
```

### 3. Elasticsearch Index Template

Create an index template for better data structure:

```bash
curl -X PUT "http://localhost:9200/_index_template/travelnest-logs" \
  -u elastic:changeme \
  -H 'Content-Type: application/json' \
  -d '{
  "index_patterns": ["travelnest-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.refresh_interval": "5s",
      "index.max_result_window": 10000
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "log_level": { "type": "keyword" },
        "service_name": { "type": "keyword" },
        "error_message": { "type": "text" },
        "error_stack": { "type": "text" },
        "request_id": { "type": "keyword" },
        "user_id": { "type": "keyword" },
        "method": { "type": "keyword" },
        "url": { "type": "keyword" },
        "status_code": { "type": "integer" },
        "response_time": { "type": "float" },
        "hostname": { "type": "keyword" },
        "severity": { "type": "keyword" }
      }
    }
  }
}'
```

---

## Integration with Node.js Application

### 1. Update Logger Configuration

Modify your `config/logger.config.js` to output JSON logs:

```javascript
const winston = require('winston');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'travelnest-server',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Combined logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
    }),
    // Access logs
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/access.log'),
      level: 'http',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Console output for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Add request context
logger.addRequestContext = (req) => {
  return logger.child({
    requestId: req.id,
    userId: req.user?.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

module.exports = logger;
```

### 2. Enhanced Error Middleware

Update `middlewares/error.middleware.js`:

```javascript
const logger = require('../config/logger.config');

const errorHandler = (err, req, res, next) => {
  const requestLogger = logger.addRequestContext(req);

  const errorLog = {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500,
    code: err.code,
    isOperational: err.isOperational,
    path: req.path,
    timestamp: new Date().toISOString(),
  };

  // Log error with full context
  requestLogger.error('Request error', errorLog);

  // Send response
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
```

### 3. Request Logging Middleware

Create middleware for HTTP request logging:

```javascript
// middlewares/request-logger.middleware.js
const logger = require('../config/logger.config');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const requestLog = logger.addRequestContext(req);

    requestLog.log({
      level: res.statusCode >= 400 ? 'error' : 'http',
      message: 'HTTP Request',
      statusCode: res.statusCode,
      responseTime: duration,
      contentLength: res.get('content-length'),
    });
  });

  next();
};

module.exports = requestLogger;
```

### 4. Create Logs Directory

```bash
mkdir -p logs
echo "*" > logs/.gitignore
```

---

## Monitoring and Alerting

### 1. Create Kibana Index Pattern

1. Open Kibana: `http://localhost:5601`
2. Login with: `elastic` / `changeme`
3. Go to **Management** → **Stack Management** → **Index Patterns**
4. Click **Create index pattern**
5. Enter pattern: `travelnest-logs-*`
6. Select time field: `@timestamp`
7. Click **Create index pattern**

### 2. Create Visualizations

#### Error Rate Visualization

1. Go to **Visualize Library** → **Create visualization**
2. Select **Line** chart
3. Configure:
   - **Y-axis**: Count
   - **X-axis**: Date Histogram on `@timestamp`
   - **Filter**: `log_level: error`
   - **Interval**: 1 hour

#### Response Time Metrics

1. Create **Metric** visualization
2. Configure:
   - **Metric**: Average of `response_time`
   - **Split series**: By `url.keyword`

#### Error Distribution by Service

1. Create **Pie** chart
2. Configure:
   - **Slice size**: Count
   - **Split slices**: By `service_name.keyword`
   - **Filter**: `log_level: error`

### 3. Create Dashboard

1. Go to **Dashboard** → **Create dashboard**
2. Add visualizations created above
3. Add **Markdown** widget with key metrics
4. Save as "TravelNest System Health"

### 4. Set Up Alerts

Create alert rules in Kibana:

#### High Error Rate Alert

```json
{
  "name": "High Error Rate Alert",
  "rule_type_id": ".es-query",
  "params": {
    "index": ["travelnest-logs-*"],
    "timeField": "@timestamp",
    "esQuery": {
      "query": {
        "bool": {
          "filter": [
            { "term": { "log_level": "error" } },
            { "range": { "@timestamp": { "gte": "now-5m" } } }
          ]
        }
      }
    },
    "threshold": [10]
  },
  "schedule": { "interval": "5m" },
  "actions": [
    {
      "group": "query matched",
      "id": "email-action",
      "params": {
        "to": ["admin@travelnest.com"],
        "subject": "High Error Rate Detected",
        "message": "More than 10 errors in the last 5 minutes"
      }
    }
  ]
}
```

#### Slow Response Time Alert

Monitor response times exceeding threshold:

```json
{
  "name": "Slow Response Time Alert",
  "rule_type_id": ".es-query",
  "params": {
    "index": ["travelnest-logs-*"],
    "timeField": "@timestamp",
    "esQuery": {
      "query": {
        "bool": {
          "filter": [
            { "range": { "response_time": { "gte": 5000 } } },
            { "range": { "@timestamp": { "gte": "now-10m" } } }
          ]
        }
      }
    },
    "threshold": [5]
  },
  "schedule": { "interval": "10m" }
}
```

---

## Security Best Practices

### 1. Enable Security Features

```yaml
# elasticsearch.yml
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: true
```

### 2. Create Service Accounts

```bash
# Create logstash writer user
curl -X POST "http://localhost:9200/_security/user/logstash_writer" \
  -u elastic:changeme \
  -H 'Content-Type: application/json' \
  -d '{
  "password": "strong_password_here",
  "roles": ["logstash_writer"],
  "full_name": "Logstash Writer",
  "email": "logstash@travelnest.com"
}'

# Create kibana user
curl -X POST "http://localhost:9200/_security/user/kibana_user" \
  -u elastic:changeme \
  -H 'Content-Type: application/json' \
  -d '{
  "password": "strong_password_here",
  "roles": ["kibana_admin"],
  "full_name": "Kibana User",
  "email": "kibana@travelnest.com"
}'
```

### 3. Configure Firewall

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 5601/tcp  # Kibana (restrict to VPN/IP whitelist)
sudo ufw deny 9200/tcp   # Elasticsearch (internal only)
sudo ufw deny 5044/tcp   # Logstash (internal only)
sudo ufw enable
```

### 4. Use Environment Variables

Never hardcode passwords. Use environment variables or secrets management:

```bash
# .env file
ELASTICSEARCH_HOST=https://elasticsearch:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_secure_password
KIBANA_ENCRYPTION_KEY=your_32_character_encryption_key
```

### 5. Enable Audit Logging

```yaml
# elasticsearch.yml
xpack.security.audit.enabled: true
xpack.security.audit.logfile.events.include:
  - access_granted
  - access_denied
  - authentication_failed
```

---

## Troubleshooting

### Common Issues

#### 1. Elasticsearch Won't Start

**Check logs:**

```bash
sudo journalctl -u elasticsearch -f
```

**Common causes:**

- Insufficient memory: Increase heap size in `jvm.options`
- Port already in use: Check with `sudo netstat -tulpn | grep 9200`
- Permission issues: `sudo chown -R elasticsearch:elasticsearch /var/lib/elasticsearch`

#### 2. Filebeat Not Shipping Logs

**Test configuration:**

```bash
filebeat test config
filebeat test output
```

**Check connectivity:**

```bash
telnet logstash-host 5044
```

**Enable debug logging:**

```yaml
logging.level: debug
```

#### 3. Logstash Pipeline Not Processing

**Test pipeline:**

```bash
/usr/share/logstash/bin/logstash --config.test_and_exit -f /etc/logstash/conf.d/travelnest-pipeline.conf
```

**Check Logstash logs:**

```bash
tail -f /var/log/logstash/logstash-plain.log
```

#### 4. High Memory Usage

**Elasticsearch:**

- Reduce heap size if too high
- Clear old indices:
  ```bash
  curator delete indices --older-than 30 --time-unit days
  ```

**Logstash:**

- Reduce `pipeline.batch.size`
- Reduce `pipeline.workers`

### Performance Optimization

#### 1. Index Lifecycle Management (ILM)

Automatically manage index lifecycle:

```bash
curl -X PUT "http://localhost:9200/_ilm/policy/travelnest-logs-policy" \
  -u elastic:changeme \
  -H 'Content-Type: application/json' \
  -d '{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "7d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          }
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}'
```

#### 2. Optimize Queries

Use filters instead of queries when possible:

```json
{
  "query": {
    "bool": {
      "filter": [
        { "term": { "log_level": "error" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ]
    }
  }
}
```

---

## Useful Queries and Dashboards

### Kibana Query Examples

#### 1. Find All Errors in Last Hour

```
log_level: error AND @timestamp >= now-1h
```

#### 2. Find Errors for Specific User

```
log_level: error AND user_id: "12345"
```

#### 3. Find Slow Requests (>3 seconds)

```
response_time > 3000
```

#### 4. Find 500 Errors

```
status_code: 500
```

#### 5. Search by Request ID

```
request_id: "abc-123-def-456"
```

### Elasticsearch Query Examples

#### Get Error Count by Service

```bash
curl -X GET "http://localhost:9200/travelnest-logs-*/_search?pretty" \
  -u elastic:changeme \
  -H 'Content-Type: application/json' \
  -d '{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "term": { "log_level": "error" } },
        { "range": { "@timestamp": { "gte": "now-24h" } } }
      ]
    }
  },
  "aggs": {
    "by_service": {
      "terms": {
        "field": "service_name.keyword",
        "size": 10
      }
    }
  }
}'
```

#### Get Average Response Time

```bash
curl -X GET "http://localhost:9200/travelnest-logs-*/_search?pretty" \
  -u elastic:changeme \
  -H 'Content-Type: application/json' \
  -d '{
  "size": 0,
  "query": {
    "range": { "@timestamp": { "gte": "now-1h" } }
  },
  "aggs": {
    "avg_response_time": {
      "avg": {
        "field": "response_time"
      }
    },
    "by_endpoint": {
      "terms": {
        "field": "url.keyword",
        "size": 10
      },
      "aggs": {
        "avg_time": {
          "avg": {
            "field": "response_time"
          }
        }
      }
    }
  }
}'
```

### Custom Dashboard Panels

#### System Health Overview

- Total requests (last 24h)
- Error rate %
- Average response time
- Top 5 slowest endpoints
- Error distribution by type

#### Real-time Monitoring

- Request rate (requests/minute)
- Error rate chart (last 1 hour)
- Active users count
- Geographic distribution map

---

## Maintenance Tasks

### Daily

- Monitor dashboard for anomalies
- Check disk space usage
- Review error logs

### Weekly

- Review and optimize slow queries
- Check cluster health
- Update alert thresholds if needed

### Monthly

- Archive old logs
- Review and update index templates
- Performance tuning
- Security audit

---

## Additional Resources

- **Elasticsearch Documentation**: https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html
- **Logstash Documentation**: https://www.elastic.co/guide/en/logstash/current/index.html
- **Kibana Documentation**: https://www.elastic.co/guide/en/kibana/current/index.html
- **Filebeat Documentation**: https://www.elastic.co/guide/en/beats/filebeat/current/index.html
- **ELK Stack Best Practices**: https://www.elastic.co/guide/en/elasticsearch/reference/current/best-practices.html

---

## Support

For issues specific to TravelNest integration:

- Check application logs: `./logs/`
- Review Filebeat logs: `/var/log/filebeat/`
- Review Logstash logs: `/var/log/logstash/`
- Contact DevOps team: devops@travelnest.com

---

**Last Updated**: January 29, 2026
**Version**: 1.0
**Maintainer**: TravelNest DevOps Team
