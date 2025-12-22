# 회식 장소 + 주차 데이터 수집 플랫폼

팀 단위 회식 장소 투표 기능과 방문 후 주차 경험 데이터를 수집하여 B2B 데이터 상품으로 전환하는 웹 플랫폼입니다.

## 기술 스택
- **프론트엔드**: Next.js 14 (TypeScript, Tailwind CSS)
- **백엔드**: Node.js + Express
- **데이터베이스**: MongoDB

## 프로젝트 구조 (Monorepo)
```
babmoa/
├── packages/
│   ├── client/        # Next.js 프론트엔드
│   └── server/        # Express 백엔드
└── package.json       # npm workspaces
```

## 시작하기

```bash
# 의존성 설치 (루트에서 한 번에)
npm install

# 프론트엔드 실행 (http://localhost:3000)
npm run dev:client

# 백엔드 실행 (http://localhost:5000)
npm run dev:server
```

## 환경 변수

### Backend (`packages/server/.env`)
```bash
cp packages/server/.env.example packages/server/.env
```
- `PORT`: 서버 포트 (기본값: 5000)
- `MONGODB_URI`: MongoDB 연결 문자열

