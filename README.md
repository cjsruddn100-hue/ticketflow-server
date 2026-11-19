# 🎫 TICKETFLOW Server

Supabase와 연동한 공연 관리 API 서버입니다. (Node.js / Express / Supabase / Render)

## 기술 스택
- JavaScript, Node.js, Express
- Supabase (PostgreSQL), `@supabase/supabase-js`
- 배포: Render

## 실행 방법
```bash
npm install
cp .env.example .env   # 값 입력
npm run dev            # http://localhost:3001
```

## 환경 변수
| 이름 | 설명 |
|---|---|
| PORT | 로컬 포트 (기본 3001, Render는 자동 제공) |
| SUPABASE_URL | Supabase 프로젝트 URL |
| SUPABASE_SERVICE_ROLE_KEY | 서버 전용 Supabase 키 (공개 금지) |
| ADMIN_API_KEY | 등록·수정·삭제 API 보호용 비밀값 |

## API
| 메서드 | 경로 | 설명 | 관리자 키 |
|---|---|---|---|
| GET | / | 서버 상태 확인 | - |
| GET | /performances | 공연 목록 조회 (id 오름차순) | - |
| GET | /performances/:id | 공연 상세 조회 (선택 과제) | - |
| POST | /performances | 공연 등록 | `x-admin-key` |
| PATCH | /performances/:id | 공연 수정 (전달한 항목만) | `x-admin-key` |
| DELETE | /performances/:id | 공연 삭제 | `x-admin-key` |

## 오류 응답
- 400: 잘못된 ID·입력값 / 401: 관리자 키 없음·불일치 / 404: 없는 공연 / 409: 연결 데이터 존재
