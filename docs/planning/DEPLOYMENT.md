# Frontend Deployment Guide

프론트엔드(Next.js 14) 배포 가이드입니다.

## 목차

- [개요](#개요)
- [사전 요구사항](#사전-요구사항)
- [서버 설정](#서버-설정)
- [배포 방법](#배포-방법)
- [트러블슈팅](#트러블슈팅)

---

## 개요

이 프로젝트는 **Next.js 14 standalone 모드**를 사용하여 배포합니다.

| 구분 | 역할 |
|------|------|
| 로컬 | 빌드 수행 (`npm run build`) |
| 서버 | Node.js 실행 + Nginx 서빙 |

> [!IMPORTANT]
> 서버에서는 `npm install`, `npm run build` 명령을 **절대 실행하지 않습니다**.

---

## 사전 요구사항

### 로컬 환경 (Build Machine)

- [x] Node.js LTS 설치
- [x] rsync 설치
- [x] SSH 키 설정 완료

### 서버 환경 (Home Server)

- [x] Node.js LTS 설치
- [x] PM2 설치 (권장)
- [x] Nginx 설정 완료
- [x] 배포 디렉토리 생성: `/srv/babmoa`
- [x] `.env` 파일 수동 설정 완료

---

## 서버 설정

### 1. 배포 디렉토리 생성

```bash
sudo mkdir -p /srv/babmoa
sudo chown $USER:$USER /srv/babmoa
```

### 2. 환경 변수 설정

서버에 `.env` 파일을 수동으로 생성합니다:

```bash
nano /srv/babmoa/.env
```

> [!CAUTION]
> 배포 스크립트는 `.env` 파일을 생성/수정/삭제하지 않습니다.
> 환경 변수는 반드시 서버에서 직접 관리하세요.

### 3. PM2 설치 (권장)

```bash
npm install -g pm2
```

### 4. Nginx 설정 예시

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 배포 방법

### 기본 배포

```bash
# 프로젝트 루트에서 실행
./scripts/deploy-frontend.sh
```

### 환경 변수로 SSH 설정

```bash
SSH_HOST=192.168.0.100 SSH_USER=admin ./scripts/deploy-frontend.sh
```

### 드라이런 (빌드만 테스트)

```bash
./scripts/deploy-frontend.sh --dry-run
```

### 사용 가능한 환경 변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `SSH_HOST` | `your-server-ip` | 서버 호스트명 또는 IP |
| `SSH_USER` | `your-username` | SSH 사용자명 |
| `SSH_PORT` | `22` | SSH 포트 |
| `SSH_KEY` | `~/.ssh/id_rsa` | SSH 키 경로 |

---

## 배포 후 서버 디렉토리 구조

```
/srv/babmoa/
├── server.js               # Next.js standalone entry
├── .next/
│   └── static/
└── public/
```

---

## 수동 실행

PM2 없이 직접 실행:

```bash
cd /srv/babmoa
node server.js
```

PM2로 실행:

```bash
pm2 start /srv/babmoa/server.js --name babmoa-fe
```

PM2 로그 확인:

```bash
pm2 logs babmoa-fe
```

---

## 트러블슈팅

### 빌드 실패

1. `next.config.ts`에 `output: 'standalone'` 설정 확인
2. Node.js 버전 확인 (LTS 권장)
3. 의존성 설치: `cd packages/client && npm install`

### 서버 접속 실패

1. SSH 키 권한 확인: `chmod 600 ~/.ssh/id_rsa`
2. 서버 방화벽 확인: SSH 포트(22) 및 앱 포트(3000) 열기
3. SSH 연결 테스트: `ssh -v user@host`

### 정적 파일 404

배포 후 CSS/JS가 로드되지 않으면:

1. `.next/static` 디렉토리가 서버에 복사되었는지 확인
2. 서버 디렉토리 구조 확인:
   ```bash
   ls -la /srv/babmoa/.next/static
   ```

### PM2 프로세스 문제

```bash
# 프로세스 상태 확인
pm2 status

# 프로세스 재시작
pm2 restart babmoa-fe

# 프로세스 삭제 후 재생성
pm2 delete babmoa-fe
pm2 start /srv/babmoa/server.js --name babmoa-fe
```
