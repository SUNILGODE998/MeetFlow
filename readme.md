# MeetFlow

**A modern, scalable real-time video conferencing and meeting management platform.**

MeetFlow is a full-stack meeting management and video conferencing application designed to provide seamless communication, meeting scheduling, user management, and real-time collaboration.

The backend is built using Java 21 and Spring Boot, with a separate mediasoup-based Selective Forwarding Unit (SFU) responsible for real-time audio and video communication.

---

## 1. Features

### Authentication & Authorization
- User registration and login.
- JWT-based authentication.
- Secure password hashing using BCrypt.
- Role-based access control (RBAC).
- Support for Admin, Manager, Developer, and Attendee roles.
- Validate whether an email is registered before login.
- Proper authentication and authorization error responses.
- Google OAuth2 login planned.

### User Management
- User registration.
- User profile management.
- Role-based permissions.
- User account management.

### Meeting Management
- Create meetings.
- Schedule meetings.
- Join meetings.
- Manage meeting participants.
- Meeting access control.
- Meeting lifecycle management.

### Real-Time Communication
- WebSocket communication.
- Real-time audio and video.
- mediasoup SFU architecture.
- WebRTC-based media streaming.
- Producer and Consumer management.

### Infrastructure
- PostgreSQL database.
- Flyway database migrations.
- Docker containerization.
- RESTful API architecture.

---

## 2. Technology Stack

| Technology | Purpose |
|---|---|
| Java 21 | Programming language |
| Spring Boot | Backend framework |
| Spring Security | Authentication and authorization |
| Spring Data JPA | Database operations |
| Spring WebSocket | Real-time communication |
| JWT | Stateless authentication |
| BCrypt | Password encryption |
| PostgreSQL | Relational database |
| Flyway | Database migrations |
| Gradle | Dependency management |
| Docker | Containerization |
| mediasoup | WebRTC SFU |
| WebRTC | Audio and video communication |

---

## 3. System Architecture

MeetFlow follows a modular architecture.

```text
                 CLIENT APPLICATION
                         |
                         |
                   REST API / JWT
                         |
                         v
                SPRING BOOT BACKEND
                         |
          +--------------+--------------+
          |              |              |
          v              v              v
     AUTH MODULE    USER MODULE    MEETING MODULE
          |              |              |
          +--------------+--------------+
                         |
                         v
                    POSTGRESQL
                         |
                    FLYWAY DB
                         |
                         |
                  WEBSOCKET SERVER
                         |
                         v
                  MEDIASOUP SFU
                         |
                         v
                       WEBRTC
                         |
                 AUDIO / VIDEO STREAM
```

The Spring Boot backend manages authentication, authorization, users, meetings, and application business logic.

The separate mediasoup service handles real-time media routing.

---

## 4. Project Structure

```text
MeetFlow/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com/meetflow/
│   │   │   │       ├── config/
│   │   │   │       ├── controller/
│   │   │   │       ├── dto/
│   │   │   │       ├── entity/
│   │   │   │       ├── exception/
│   │   │   │       ├── repository/
│   │   │   │       ├── security/
│   │   │   │       ├── service/
│   │   │   │       └── MeetFlowApplication.java
│   │   │   │
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── db/
│   │   │           └── migration/
│   │   │
│   │   └── test/
│   │
│   ├── build.gradle
│   └── Dockerfile
│
├── mediasoup-server/
│
├── docker-compose.yml
│
└── README.md
```

*The folder structure is the intended architecture; update it as modules are added.*

---

## 5. Prerequisites

Install the following before running MeetFlow:

- Java Development Kit 21
- Gradle
- PostgreSQL
- Docker Desktop
- Node.js (for the mediasoup service)
- Git
- IntelliJ IDEA or another Java IDE
- Insomnia or Postman

---

## 6. Getting Started

### Step 1: Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/MeetFlow.git
cd MeetFlow
```

### Step 2: Configure PostgreSQL

Create a database:

```sql
CREATE DATABASE meetflow;
```

### Step 3: Configure application.yml

Configure your database connection and JWT settings.

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/meetflow
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: true

  flyway:
    enabled: true
    locations: classpath:db/migration

server:
  port: 8080
```

Configure sensitive values using environment variables. Never commit actual passwords or JWT secrets.

### Step 4: Configure environment variables

```env
DB_USERNAME=postgres
DB_PASSWORD=your_database_password
JWT_SECRET=your_base64_encoded_secret
JWT_EXPIRATION=86400000
```

Use a cryptographically secure JWT secret with sufficient entropy.

### Step 5: Run the backend

From the backend directory:

```bash
./gradlew bootRun
```

For Windows:

```powershell
.\gradlew.bat bootRun
```

Backend default URL:

```text
http://localhost:8080
```

Flyway automatically executes pending database migrations when the application starts.

---

## 7. Authentication & Authorization

MeetFlow uses Spring Security and JWT for stateless authentication.

### User Roles

| Role | Description |
|---|---|
| ADMIN | Full system administration |
| MANAGER | Meeting and team management |
| DEVELOPER | Meeting participation and collaboration |
| ATTENDEE | Join and participate in meetings |

### Registration

**Endpoint**

```http
POST /api/auth/register
```

Example request:

```json
{
  "fullName": "John Doe",
  "email": "john@gmail.com",
  "password": "StrongPassword123"
}
```

Registration creates a user account with a securely hashed password.

Role assignment should be controlled by the backend. Public registration must not allow users to assign themselves ADMIN privileges.

### Login

**Endpoint**

```http
POST /api/auth/login
```

Example request:

```json
{
  "email": "john@gmail.com",
  "password": "StrongPassword123"
}
```

**Successful response: HTTP 200 OK**

```json
{
  "id": 1,
  "fullName": "John Doe",
  "email": "john@gmail.com",
  "role": "DEVELOPER",
  "accessToken": "YOUR_JWT_TOKEN",
  "tokenType": "Bearer"
}
```

### Login Error Handling

MeetFlow validates whether the email exists before authenticating the password.

**1. Email does not exist**

HTTP Status: `404 NOT FOUND`

```json
{
  "success": false,
  "status": 404,
  "error": "USER_NOT_FOUND",
  "message": "This email is not registered. Please register first.",
  "timestamp": "2026-11-08T23:00:00"
}
```

**2. Incorrect password**

HTTP Status: `401 UNAUTHORIZED`

```json
{
  "success": false,
  "status": 401,
  "error": "UNAUTHORIZED",
  "message": "Invalid email or password.",
  "timestamp": "2026-11-08T23:00:00"
}
```

**3. Successful authentication**

HTTP Status: `200 OK`

The backend generates a JWT access token.

### JWT Authentication Flow

```text
       USER
        |
        v
    LOGIN REQUEST
        |
        v
  CHECK REGISTERED EMAIL
        |
        +------ No ------> USER_NOT_FOUND (404)
        |
       Yes
        |
        v
  VALIDATE PASSWORD
        |
        +------ Invalid --> UNAUTHORIZED (401)
        |
       Valid
        |
        v
    GENERATE JWT
        |
        v
   RETURN ACCESS TOKEN
        |
        v
  ACCESS PROTECTED APIs
```

### Accessing Protected Endpoints

Add the following HTTP header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Example:

```http
GET /api/meetings
Authorization: Bearer YOUR_ACCESS_TOKEN
```

---

## 8. API Documentation

| Module | HTTP Method | Endpoint | Authentication |
|---|---|---|---|
| Authentication | POST | `/api/auth/register` | Public |
| Authentication | POST | `/api/auth/login` | Public |
| Meetings | GET | `/api/meetings` | Required |
| Meetings | POST | `/api/meetings` | Required |

Additional endpoints will be documented here as the application develops.

---

## 9. Database Management

MeetFlow uses PostgreSQL with Flyway for database version control.

Migration files are stored in:

```text
src/main/resources/db/migration/
```

Example:

```text
V1__create_users_table.sql
V2__create_meetings_table.sql
V3__create_meeting_participants_table.sql
```

Flyway automatically applies pending migrations during application startup.

Hibernate schema generation is configured with:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

Database schema changes should be implemented through new Flyway migration files.

---

## 10. Testing with Insomnia

### Authentication Testing

1. Start the Spring Boot application.
2. Open Insomnia.
3. Send a POST request to `/api/auth/register`.
4. Register a new user.
5. Send a POST request to `/api/auth/login`.
6. Copy the generated access token.

### Testing Protected APIs

1. Create a GET request to `/api/meetings`.
2. Open the Auth tab.
3. Select Bearer Token.
4. Paste your JWT access token.
5. Send the request.

### Test Cases

| Test Case | Expected Result |
|---|---|
| Register new user | Account created |
| Login with valid credentials | JWT generated |
| Login with unregistered email | 404 USER_NOT_FOUND |
| Login with incorrect password | 401 UNAUTHORIZED |
| Access protected API without token | 401 UNAUTHORIZED |
| Access protected API with valid token | Request authorized |

---

## 11. Docker Deployment

Docker will be used to containerize the backend, PostgreSQL, and mediasoup services.

Start the services:

```bash
docker compose up -d
```

Stop the services:

```bash
docker compose down
```

Check running containers:

```bash
docker ps
```

The complete Docker configuration will be maintained in `docker-compose.yml`.

---

## 12. Security Considerations

- Passwords must never be stored in plain text.
- Use BCrypt for password hashing.
- Protect private endpoints using Spring Security.
- Validate JWT signatures and expiration.
- Restrict administrative privileges.
- Keep credentials and secrets outside source control.
- Validate incoming API requests.
- Use HTTPS in production.
- Configure appropriate CORS policies.
- Implement authorization checks on sensitive operations.

---

## 13. Future Enhancements

- [ ] Google OAuth2 authentication.
- [ ] Refresh token implementation.
- [ ] Email verification.
- [ ] Forgot password functionality.
- [ ] Advanced meeting scheduling.
- [ ] Real-time chat.
- [ ] Screen sharing.
- [ ] Audio and video controls.
- [ ] Meeting recording.
- [ ] Participant management.
- [ ] Admin dashboard.
- [ ] Notifications.
- [ ] Production deployment.

---

## 14. Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Write or update unit tests.
5. Update the README documentation.
6. Submit a pull request.

---

## 15. License

This project is currently under development. A license will be added when the repository is prepared for public release.

---

**MeetFlow — Connect. Collaborate. Communicate.**#   M e e t F l o w  
 #   M e e t F l o w  
 #   M e e t F l o w  
 #   M e e t F l o w  
 #   M e e t F l o w  
 