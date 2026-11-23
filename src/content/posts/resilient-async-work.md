---
title: TEST
description: 네트워크 실패와 지연을 고려해 복구 가능한 비동기 경계를 설계하는 방법을 정리합니다.
date: 2026-11-12
category: Projects
draft: false
---

# 블로그 게시글 테스트

네트워크 요청은 언제든 지연되거나 실패할 수 있습니다. 오류를 숨기지 않고 사용자와 시스템이 다음 행동을 선택할 수 있도록 경계를 설계하는 방법을 정리합니다.

## 이 글에서 다루는 내용

비동기 코드를 안정적으로 만드는 핵심은 모든 실패를 막는 데 있지 않습니다. 실패가 발생했을 때 **어디에서, 어떤 이유로** 일어났는지 알 수 있고, 안전한 복구가 가능한 경계를 만드는 데 있습니다.

이 글에서 확인할 내용은 다음과 같습니다.

1. 지연 시간과 실패를 함수의 계약에 포함하기
2. 응답 데이터를 신뢰하기 전에 검증하기
3. 재시도와 취소를 명시적인 정책으로 다루기

일반 목록도 요청과 예외를 빠르게 확인할 때 유용합니다.

- 요청에 시간 제한을 둡니다.
- 외부 응답은 `unknown`으로 다룹니다.
- 취소와 재시도 동작을 테스트합니다.

## 실행 모델 이해하기

`async` 함수도 호출한 순서대로 끝난다는 뜻은 아닙니다. 첫 번째 `await`에서 제어를 넘기고 호출자는 그동안 다른 일을 계속합니다. 반환 타입뿐 아니라 완료 시점과 취소 방법도 호출 계약의 일부로 문서화해야 합니다.

> 비동기 경계는 지연을 감추는 추상화가 아니라, 지연과 실패를 다루기 위한 명시적인 약속입니다.

### 이벤트 루프와 완료 순서

동기 작업이 끝나면 대기 중인 마이크로태스크가 처리되고 그 다음 렌더링과 다음 작업이 이어집니다. 여러 요청을 동시에 시작했다면 완료 순서는 시작 순서와 다를 수 있습니다. 결과를 합칠 때는 식별자를 기준으로 정렬하거나 필요한 경우 순차 실행을 선택하세요.

## 안전한 비동기 경계 만들기

요청 함수가 네트워크 응답을 곧바로 애플리케이션 데이터로 취급하면 오류가 여러 화면으로 번집니다. 아래 예시는 HTTP 상태를 먼저 확인하고, 외부에서 들어온 값을 `unknown`으로 다룬 다음 타입 가드로 검증합니다. 요청에는 `AbortSignal`을 전달해 더 이상 필요하지 않은 작업도 정리할 수 있게 합니다.

```ts
type User = {
  id: string;
  name: string;
  email: string;
};

type ApiError = {
  code: string;
  message: string;
};

async function getUser(userId: string, signal?: AbortSignal): Promise<User> {
  const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(`[${error.code}] ${error.message}`);
  }

  const payload: unknown = await response.json();
  if (!isUser(payload)) {
    throw new TypeError('사용자 응답 형식이 올바르지 않습니다.');
  }

  return payload;
}

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  return (
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'email' in value &&
    typeof value.email === 'string'
  );
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5_000);

try {
  const user = await getUser('user_42', controller.signal);
  console.log(user.name);
} finally {
  clearTimeout(timeout);
}
```

### 응답은 신뢰 경계에서 검증하기

TypeScript의 타입은 컴파일 시점의 약속입니다. 서버에서 받은 JSON에는 런타임 검증이 필요하므로 응답을 `unknown`으로 받고 필요한 필드의 형식과 존재 여부를 확인합니다. 검증 실패는 빈 객체 같은 기본값으로 바꾸지 말고 호출자가 구분할 수 있는 오류로 반환하세요.

### 재시도에는 끝과 조건이 있어야 합니다

일시적인 네트워크 문제는 재시도로 해결될 수 있지만 잘못된 입력이나 권한 오류를 반복해도 결과는 달라지지 않습니다. 재시도 횟수와 간격을 제한하고 멱등성이 보장되는 작업에만 적용해야 합니다.

```ts
async function withRetry<T>(
  loadDocument: (options: { signal: AbortSignal }) => Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  const delays = [250, 750, 1_500];

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await loadDocument({ signal });
    } catch (error) {
      if (!isRetryable(error) || attempt === delays.length) {
        throw error;
      }

      await wait(delays[attempt], signal);
    }
  }

  throw new Error('재시도 한도를 초과했습니다.');
}
```

## 실패 경로를 테스트하기

성공 응답만 확인하면 가장 중요한 계약을 놓치기 쉽습니다. 테스트에서는 결과값뿐 아니라 요청 횟수, 취소 신호, 오류 종류처럼 호출자가 의존하는 동작을 검증합니다.

| 상황 | 기대 동작 | 검증 포인트 |
| --- | --- | --- |
| 정상 응답 | 검증된 데이터 반환 | 필수 필드와 타입 |
| 서버 오류 | 분류 가능한 오류 전달 | 상태 코드, 재시도 여부 |
| 요청 취소 | 작업을 빠르게 종료 | 취소 신호가 전달되는지 |
| 잘못된 응답 | 검증 오류로 실패 | 기본값으로 숨기지 않는지 |

### 결과를 결정적으로 만드는 방법

실제 시간을 기다리는 대신 타이머를 제어하고 네트워크 응답은 테스트 경계에서 고정합니다. 그러면 간헐적인 지연에 기대지 않고 재시도 횟수와 취소 동작을 확인할 수 있습니다. 각 테스트는 다른 테스트의 실행 순서에 의존하지 않도록 상태를 정리해야 합니다.

## 운영 환경에서 확인할 것

운영 로그에는 요청의 시작과 완료, 소요 시간, 실패 분류를 남기되 토큰이나 개인정보 같은 민감한 값은 기록하지 않습니다. 동일한 요청 흐름을 추적할 수 있도록 상관관계 ID를 사용하고 사용자에게 보여주는 메시지와 내부 진단 정보는 분리합니다.

좋은 추상화는 실패를 보이지 않게 만들지 않습니다. 오류의 맥락을 보존하면서 호출자가 합리적인 다음 행동을 선택하도록 돕습니다.
