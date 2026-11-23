import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

// Isolate test database before importing server modules
const TEST_DB_PATH = path.resolve(process.cwd(), 'data', 'learnmatch_test.db');
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}
process.env.LEARNMATCH_DB_PATH = TEST_DB_PATH;

const { createApp } = await import('../server.ts');
const { validateExerciseQuestions } = await import('../server/catalog.ts');
const { db: testDb } = await import('../server/db.ts');

interface TestReportEntry {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: TestReportEntry[] = [];

async function runTest(id: string, name: string, fn: () => Promise<string>) {
  try {
    const details = await fn();
    results.push({ id, name, status: 'PASS', details });
    console.log(`[PASS] ${id} - ${name}: ${details}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ id, name, status: 'FAIL', details: msg });
    console.error(`[FAIL] ${id} - ${name}: ${msg}`);
  }
}

class DualAuthClient {
  public cookie = '';
  public bearerToken: string | null = null;
  public lastSetCookieHeader: string | null = null;

  async request(
    baseUrl: string,
    method: string,
    route: string,
    body?: unknown,
    options?: { useCookie?: boolean; useBearer?: boolean; extraHeaders?: Record<string, string> },
  ): Promise<{ status: number; data: any }> {
    const useCookie = options?.useCookie ?? true;
    const useBearer = options?.useBearer ?? false;

    const headers: Record<string, string> = {
      'X-Requested-With': 'LearnMatch',
      ...(options?.extraHeaders || {}),
    };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (useCookie && this.cookie) {
      headers['Cookie'] = this.cookie;
    }
    if (useBearer && this.bearerToken) {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    }

    const res = await fetch(`${baseUrl}${route}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      this.lastSetCookieHeader = setCookie;
      const pair = setCookie.split(';')[0];
      if (pair.endsWith('=')) {
        this.cookie = '';
      } else {
        this.cookie = pair;
      }
    }

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (typeof data?.token === 'string') {
      this.bearerToken = data.token;
    }
    return { status: res.status, data };
  }
}

const app = createApp();
const server = http.createServer(app);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address() as { port: number };
const BASE_URL = `http://127.0.0.1:${address.port}`;

const userA = new DualAuthClient();
const userB = new DualAuthClient();

// 1 & 2. Criar conta + criar perfil simulando iframe sem cookies (Bearer em memória) + emissão de cookie HTTPS
await runTest('REG-01', 'Registo e criação de perfil em contexto iframe sem cookies (Bearer)', async () => {
  const reg = await userA.request(
    BASE_URL,
    'POST',
    '/api/auth/register',
    {
      email: 'ana.silva@learnmatch.test',
      password: 'Password123!',
    },
    {
      useCookie: false,
      extraHeaders: { Origin: 'https://ais-dev-preview.run.app' },
    },
  );
  assert.equal(reg.status, 201, `Registo falhou: ${JSON.stringify(reg.data)}`);
  assert.ok(userA.bearerToken, 'Servidor deve devolver token de sessão para uso em memória');
  assert.ok(
    userA.lastSetCookieHeader?.includes('SameSite=None') &&
      userA.lastSetCookieHeader?.includes('Secure') &&
      userA.lastSetCookieHeader?.includes('Partitioned') &&
      userA.lastSetCookieHeader?.includes('HttpOnly'),
    `Cookie HTTPS deve incluir HttpOnly; SameSite=None; Secure; Partitioned. Recebido: ${userA.lastSetCookieHeader}`,
  );

  // Simular browser que bloqueou cookie de terceiros na iframe (useCookie: false, useBearer: true)
  const prof = await userA.request(
    BASE_URL,
    'PUT',
    '/api/profile',
    {
      displayName: 'Ana Silva',
      ageGroup: 'adult_18_plus',
    },
    { useCookie: false, useBearer: true },
  );
  assert.equal(prof.status, 200, `Criação de perfil falhou: ${JSON.stringify(prof.data)}`);
  assert.equal(prof.data.user.displayName, 'Ana Silva');
  assert.equal(prof.data.user.profileCompleted, true);
  return 'Registo devolveu token e Set-Cookie HTTPS (HttpOnly; SameSite=None; Secure; Partitioned); perfil concluído mesmo sem cookies.';
});

// 3. Atualizar página (GET /api/auth/me com cookie HttpOnly) e verificar persistência da sessão
await runTest('REG-02', 'Recuperação da sessão após atualização de página via cookie HttpOnly', async () => {
  const me = await userA.request(BASE_URL, 'GET', '/api/auth/me', undefined, {
    useCookie: true,
    useBearer: false,
  });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.displayName, 'Ana Silva');
  assert.equal(me.data.user.profileCompleted, true);
  assert.ok(me.data.token, 'GET /api/auth/me deve devolver o token ativo para sincronizar memória');
  return 'Sessão restaurada via cookie HttpOnly após reload simulado.';
});

// 4 & 5. Terminar sessão e voltar a iniciar sessão + persistência do perfil
await runTest('REG-03', 'Terminar sessão, invalidar token antigo e voltar a iniciar sessão', async () => {
  const oldToken = userA.bearerToken;
  const logout = await userA.request(BASE_URL, 'POST', '/api/auth/logout', undefined, {
    useCookie: false,
    useBearer: true,
  });
  assert.equal(logout.status, 200);

  // Token antigo não pode voltar a autenticar
  const staleMe = await userA.request(BASE_URL, 'GET', '/api/auth/me', undefined, {
    useCookie: false,
    useBearer: true,
  });
  assert.equal(staleMe.status, 401);
  assert.ok(oldToken);

  const login = await userA.request(BASE_URL, 'POST', '/api/auth/login', {
    email: 'ana.silva@learnmatch.test',
    password: 'Password123!',
  });
  assert.equal(login.status, 200);
  assert.equal(login.data.user.displayName, 'Ana Silva');
  assert.equal(login.data.user.profileCompleted, true);
  return 'Logout invalidou sessão anterior (401); novo login preservou perfil completo.';
});

// 6, 7 & 8. Exercícios Nível 1 e Nível 2, desbloqueio e histórico
await runTest('REG-04', 'Conclusão Nível 1 (8/10), desbloqueio e conclusão Nível 2 (10/10) e histórico', async () => {
  const genL1 = await userA.request(
    BASE_URL,
    'POST',
    '/api/exercises/generate',
    { level: 1, forceFresh: true },
    { useCookie: false, useBearer: true },
  );
  assert.equal(genL1.status, 200);
  const batchL1 = genL1.data.batch;
  assert.equal(batchL1.questions.length, 10);

  const answersL1 = batchL1.questions.map((q: any, idx: number) => ({
    questionId: q.id,
    selectedAnswer: idx < 8 ? q.correctAnswer : q.options.find((o: string) => o !== q.correctAnswer),
  }));
  const subL1 = await userA.request(
    BASE_URL,
    'POST',
    '/api/attempts',
    { batchId: batchL1.id, level: 1, answers: answersL1, durationSeconds: 38 },
    { useCookie: false, useBearer: true },
  );
  assert.equal(subL1.status, 201);
  assert.equal(subL1.data.attempt.passed, true);
  assert.equal(subL1.data.newlyUnlockedLevel, 2);

  const genL2 = await userA.request(
    BASE_URL,
    'POST',
    '/api/exercises/generate',
    { level: 2, forceFresh: true },
    { useCookie: false, useBearer: true },
  );
  assert.equal(genL2.status, 200);
  const batchL2 = genL2.data.batch;

  const answersL2 = batchL2.questions.map((q: any) => ({
    questionId: q.id,
    selectedAnswer: q.correctAnswer,
  }));
  const subL2 = await userA.request(
    BASE_URL,
    'POST',
    '/api/attempts',
    { batchId: batchL2.id, level: 2, answers: answersL2, durationSeconds: 29 },
    { useCookie: false, useBearer: true },
  );
  assert.equal(subL2.status, 201);
  assert.equal(subL2.data.attempt.percentage, 100);

  const hist = await userA.request(BASE_URL, 'GET', '/api/attempts', undefined, {
    useCookie: false,
    useBearer: true,
  });
  assert.equal(hist.status, 200);
  assert.equal(hist.data.attempts.length, 2);
  return `Nível 1 (8/10) desbloqueou Nível 2 (10/10); 2 tentativas persistidas no histórico (fonte lotes: ${batchL1.source}).`;
});

// 9. Isolamento entre utilizadores + idade não define nível
await runTest('REG-05', 'Isolamento de dados entre utilizadores e reprovação (4/10)', async () => {
  await userB.request(BASE_URL, 'POST', '/api/auth/register', {
    email: 'tiago.junior@learnmatch.test',
    password: 'Password123!',
  });
  const profB = await userB.request(
    BASE_URL,
    'PUT',
    '/api/profile',
    { displayName: 'Tiago', ageGroup: 'child_6_10' },
    { useCookie: false, useBearer: true },
  );
  assert.equal(profB.status, 200);
  assert.equal(profB.data.user.currentLevel, 1);

  const genB = await userB.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 1 });
  const answersB = genB.data.batch.questions.map((q: any, idx: number) => ({
    questionId: q.id,
    selectedAnswer: idx < 4 ? q.correctAnswer : q.options.find((o: string) => o !== q.correctAnswer),
  }));
  const subB = await userB.request(BASE_URL, 'POST', '/api/attempts', {
    batchId: genB.data.batch.id,
    level: 1,
    answers: answersB,
    durationSeconds: 45,
  });
  assert.equal(subB.status, 201);
  assert.equal(subB.data.attempt.passed, false);
  assert.equal(subB.data.user.lives, 0);

  const histB = await userB.request(BASE_URL, 'GET', '/api/attempts');
  assert.equal(histB.data.attempts.length, 1);
  assert.equal(histB.data.attempts[0].correctCount, 4);

  const lockedL2 = await userB.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 2 });
  assert.equal(lockedL2.status, 403);
  return 'Tiago (6-10 anos) isolado de Ana; reprovou 4/10 (6 erros -> lives=0/5), Nível 2 bloqueado (403).';
});

// 10. Falha Gemini / validação + reserva transparente + recomendações + treino focado
await runTest('REG-06', 'Reserva transparente quando Gemini falha, validador e treino focado', async () => {
  const badCheck = validateExerciseQuestions(
    Array.from({ length: 10 }, () => ({
      word: 'APPLE',
      options: ['APPLE', 'APPLE', 'BANANA', 'PEAR'],
      correctAnswer: 'APPLE',
    })),
    1,
    'beginner',
  );
  assert.equal(badCheck.valid, false);

  const rec = await userB.request(BASE_URL, 'POST', '/api/ai/recommendations');
  assert.equal(rec.status, 200);
  assert.ok(['gemini', 'local_analysis'].includes(rec.data.recommendation.source));

  // Tiago ficou com 0 vidas no REG-05: recuperar +1 vida pelo desafio antes de treinar palavras difíceis
  const recStart = await userB.request(BASE_URL, 'POST', '/api/recovery/start');
  assert.equal(recStart.status, 201);
  const recSub = await userB.request(BASE_URL, 'POST', '/api/recovery/submit', {
    challengeId: recStart.data.challenge.id,
    answers: recStart.data.challenge.questions.map((q: any) => ({
      questionId: q.id,
      selectedAnswer: q.correctAnswer,
    })),
  });
  assert.equal(recSub.status, 200);
  assert.equal(recSub.data.user.lives, 1);

  const focused = await userB.request(BASE_URL, 'POST', '/api/exercises/generate', {
    level: 1,
    forceFresh: true,
    focusWeakWords: true,
  });
  assert.equal(focused.status, 200);
  assert.equal(focused.data.batch.questions.length, 10);
  return `Validador rejeitou duplicados; fallback transparente (${focused.data.batch.source}), desafio de recuperação (+1 vida) e treino focado validados.`;
});

// 11. Endpoint de áudio e cache WAV v2 para as 5 palavras obrigatórias
await runTest('REG-07', 'Endpoint /api/audio/speak, cache v2 (hit) e cabeçalho RIFF WAV', async () => {
  const unauth = await fetch(`${BASE_URL}/api/audio/speak?word=horse&v=2`);
  assert.equal(unauth.status, 401);

  const invalid = await fetch(`${BASE_URL}/api/audio/speak?word=horse123!&v=2`, {
    headers: { Authorization: `Bearer ${userA.bearerToken}` },
  });
  assert.equal(invalid.status, 400);

  const words = ['horse', 'apple', 'dog', 'banana', 'house'];
  for (const w of words) {
    const res = await fetch(`${BASE_URL}/api/audio/speak?word=${encodeURIComponent(w)}&v=2`, {
      headers: { Authorization: `Bearer ${userA.bearerToken}` },
    });
    assert.equal(res.status, 200, `Esperado WAV 200 para "${w}", obtido ${res.status}`);
    assert.equal(res.headers.get('content-type'), 'audio/wav');
    assert.equal(res.headers.get('x-audio-version'), 'v2');
    assert.equal(res.headers.get('x-audio-cache'), 'hit');
    const buf = Buffer.from(await res.arrayBuffer());
    assert.equal(buf.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.ok(buf.length > 10000 && buf.length < 180000, `Tamanho WAV inesperado para ${w}: ${buf.length}`);
  }
  return 'Autenticação (401), validação (400) e cache v2 RIFF WAV validados para horse, apple, dog, banana e house.';
});

// 12. TESTE 1, 2, 3, 4, 5, 6, 7 e 8 do sistema de vidas
async function createFreshLearner(email: string, displayName: string) {
  const client = new DualAuthClient();
  const r = await client.request(BASE_URL, 'POST', '/api/auth/register', {
    email,
    password: 'Password123!',
  });
  assert.equal(r.status, 201);
  const p = await client.request(
    BASE_URL,
    'PUT',
    '/api/profile',
    { displayName, ageGroup: 'adult_18_plus' },
    { useCookie: false, useBearer: true },
  );
  assert.equal(p.status, 200);
  assert.equal(p.data.user.lives, 5);
  return client;
}

await runTest('TESTE-01', 'Começar com 5 vidas e responder incorretamente -> 4 vidas', async () => {
  const u = await createFreshLearner('teste1@learnmatch.test', 'Teste 1');
  const gen = await u.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 1, forceFresh: true });
  const q0 = gen.data.batch.questions[0];
  const wrongOpt = q0.options.find((o: string) => o !== q0.correctAnswer);

  const ans = await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gen.data.batch.id,
    questionId: q0.id,
    selectedAnswer: wrongOpt,
  });
  assert.equal(ans.status, 200);
  assert.equal(ans.data.isCorrect, false);
  assert.equal(ans.data.livesDeducted, 1);
  assert.equal(ans.data.user.lives, 4);
  return 'Início com 5 vidas; 1 resposta incorreta reduziu imediatamente para 4/5.';
});

await runTest('TESTE-02', 'Começar com 5 vidas e responder corretamente -> mantém 5 vidas', async () => {
  const u = await createFreshLearner('teste2@learnmatch.test', 'Teste 2');
  const gen = await u.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 1, forceFresh: true });
  const q0 = gen.data.batch.questions[0];

  const ans = await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gen.data.batch.id,
    questionId: q0.id,
    selectedAnswer: q0.correctAnswer,
  });
  assert.equal(ans.status, 200);
  assert.equal(ans.data.isCorrect, true);
  assert.equal(ans.data.livesDeducted, 0);
  assert.equal(ans.data.user.lives, 5);
  return 'Início com 5 vidas; resposta correta manteve 5/5.';
});

await runTest('TESTE-03', 'Sequência mista e 3 respostas incorretas -> 2 vidas (sem dupla dedução no fim)', async () => {
  const u = await createFreshLearner('teste3@learnmatch.test', 'Teste 3');
  const gen = await u.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 1, forceFresh: true });
  const qs = gen.data.batch.questions;

  // 1ª incorreta -> 4
  const a1 = await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gen.data.batch.id,
    questionId: qs[0].id,
    selectedAnswer: qs[0].options.find((o: string) => o !== qs[0].correctAnswer),
  });
  assert.equal(a1.data.user.lives, 4);

  // 2ª correta -> mantém 4
  const a2 = await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gen.data.batch.id,
    questionId: qs[1].id,
    selectedAnswer: qs[1].correctAnswer,
  });
  assert.equal(a2.data.user.lives, 4);

  // 3ª incorreta -> 3
  const a3 = await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gen.data.batch.id,
    questionId: qs[2].id,
    selectedAnswer: qs[2].options.find((o: string) => o !== qs[2].correctAnswer),
  });
  assert.equal(a3.data.user.lives, 3);

  // 4ª incorreta -> 2
  const a4 = await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gen.data.batch.id,
    questionId: qs[3].id,
    selectedAnswer: qs[3].options.find((o: string) => o !== qs[3].correctAnswer),
  });
  assert.equal(a4.data.user.lives, 2);

  // Restantes 6 corretas e conclusão da sessão (7/10 aprovado) -> deve manter exatamente 2 vidas
  const fullAnswers = [
    { questionId: qs[0].id, selectedAnswer: qs[0].options.find((o: string) => o !== qs[0].correctAnswer) },
    { questionId: qs[1].id, selectedAnswer: qs[1].correctAnswer },
    { questionId: qs[2].id, selectedAnswer: qs[2].options.find((o: string) => o !== qs[2].correctAnswer) },
    { questionId: qs[3].id, selectedAnswer: qs[3].options.find((o: string) => o !== qs[3].correctAnswer) },
  ];
  for (let i = 4; i < 10; i++) {
    await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
      batchId: gen.data.batch.id,
      questionId: qs[i].id,
      selectedAnswer: qs[i].correctAnswer,
    });
    fullAnswers.push({ questionId: qs[i].id, selectedAnswer: qs[i].correctAnswer });
  }

  const finish = await u.request(BASE_URL, 'POST', '/api/attempts', {
    batchId: gen.data.batch.id,
    level: 1,
    answers: fullAnswers,
    durationSeconds: 30,
  });
  assert.equal(finish.status, 201);
  assert.equal(finish.data.attempt.passed, true);
  assert.equal(finish.data.user.lives, 2);
  return 'Sequência 5->4->4->3->2 validada e mantida em 2/5 ao concluir o lote sem dupla dedução.';
});

await runTest('TESTE-04', 'Cliques rápidos / submissão repetida na mesma pergunta -> apenas 1 desconto', async () => {
  const u = await createFreshLearner('teste4@learnmatch.test', 'Teste 4');
  const gen = await u.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 1, forceFresh: true });
  const q0 = gen.data.batch.questions[0];
  const wrongOpt = q0.options.find((o: string) => o !== q0.correctAnswer);

  // Disparar 5 pedidos concorrentes idênticos para a mesma pergunta
  const responses = await Promise.all(
    Array.from({ length: 5 }, () =>
      u.request(BASE_URL, 'POST', '/api/exercises/answer', {
        batchId: gen.data.batch.id,
        questionId: q0.id,
        selectedAnswer: wrongOpt,
      }),
    ),
  );

  for (const r of responses) {
    assert.equal(r.status, 200);
    assert.equal(r.data.user.lives, 4);
  }
  const deductedSum = responses.reduce((sum, r) => sum + (r.data.livesDeducted || 0), 0);
  assert.equal(deductedSum, 1, `Esperado exatamente 1 desconto, obtido ${deductedSum}`);

  // Mais uma tentativa com outra alternativa para a mesma pergunta já respondida
  const replay = await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gen.data.batch.id,
    questionId: q0.id,
    selectedAnswer: q0.correctAnswer,
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.data.alreadyAnswered, true);
  assert.equal(replay.data.livesDeducted, 0);
  assert.equal(replay.data.user.lives, 4);
  return '5 pedidos concorrentes + 1 replay na mesma pergunta aplicaram exatamente 1 desconto (5 -> 4).';
});

await runTest('TESTE-05', 'Perder vida e atualizar página (GET /api/auth/me) -> persiste em SQLite', async () => {
  const u = await createFreshLearner('teste5@learnmatch.test', 'Teste 5');
  const gen = await u.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 1, forceFresh: true });
  const q0 = gen.data.batch.questions[0];
  const wrongOpt = q0.options.find((o: string) => o !== q0.correctAnswer);

  await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gen.data.batch.id,
    questionId: q0.id,
    selectedAnswer: wrongOpt,
  });

  // Simular refresh da página com cookie HttpOnly
  const reloaded = await u.request(BASE_URL, 'GET', '/api/auth/me', undefined, {
    useCookie: true,
    useBearer: false,
  });
  assert.equal(reloaded.status, 200);
  assert.equal(reloaded.data.user.lives, 4);
  return 'Após reload simulado via GET /api/auth/me, vidas permaneceram 4/5.';
});

await runTest('TESTE-06', 'Utilizadores diferentes possuem vidas independentes', async () => {
  const u1 = await createFreshLearner('teste6a@learnmatch.test', 'Utilizador A');
  const u2 = await createFreshLearner('teste6b@learnmatch.test', 'Utilizador B');

  const gen1 = await u1.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 1, forceFresh: true });
  for (let i = 0; i < 3; i++) {
    const q = gen1.data.batch.questions[i];
    await u1.request(BASE_URL, 'POST', '/api/exercises/answer', {
      batchId: gen1.data.batch.id,
      questionId: q.id,
      selectedAnswer: q.options.find((o: string) => o !== q.correctAnswer),
    });
  }

  const me1 = await u1.request(BASE_URL, 'GET', '/api/auth/me');
  const me2 = await u2.request(BASE_URL, 'GET', '/api/auth/me');
  assert.equal(me1.data.user.lives, 2);
  assert.equal(me2.data.user.lives, 5);
  return 'Utilizador A ficou com 2/5 vidas enquanto Utilizador B manteve 5/5 vidas.';
});

await runTest('TESTE-07', 'Recuperação automática (15 min/vida) e recuperação manual funcionais', async () => {
  const u = await createFreshLearner('teste7@learnmatch.test', 'Teste 7');
  const gen = await u.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 1, forceFresh: true });
  for (let i = 0; i < 3; i++) {
    const q = gen.data.batch.questions[i];
    await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
      batchId: gen.data.batch.id,
      questionId: q.id,
      selectedAnswer: q.options.find((o: string) => o !== q.correctAnswer),
    });
  }

  const beforeAuto = await u.request(BASE_URL, 'GET', '/api/auth/me');
  assert.equal(beforeAuto.data.user.lives, 2);

  // Recuar lives_updated_at em 16 minutos para testar regeneração automática de +1 vida
  const sixteenMinAgo = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  testDb
    .prepare(`UPDATE users SET lives_updated_at = ? WHERE email = ?`)
    .run(sixteenMinAgo, 'teste7@learnmatch.test');

  const afterAuto = await u.request(BASE_URL, 'GET', '/api/auth/me');
  assert.equal(afterAuto.data.user.lives, 3);

  // Recuperação manual direta antiga deve estar desativada (exige Desafio de Recuperação)
  const legacyManual = await u.request(BASE_URL, 'POST', '/api/profile/recover-life', undefined, {
    useCookie: false,
    useBearer: true,
  });
  assert.equal(legacyManual.status, 400);

  // Desafio de recuperação 5/5 concede +1 vida (3 -> 4)
  const startRec = await u.request(BASE_URL, 'POST', '/api/recovery/start');
  assert.equal(startRec.status, 201);
  const recAnswers = startRec.data.challenge.questions.map((q: any) => ({
    questionId: q.id,
    selectedAnswer: q.correctAnswer,
  }));
  const subRec = await u.request(BASE_URL, 'POST', '/api/recovery/submit', {
    challengeId: startRec.data.challenge.id,
    answers: recAnswers,
  });
  assert.equal(subRec.status, 200);
  assert.equal(subRec.data.livesGained, 1);
  assert.equal(subRec.data.user.lives, 4);
  return 'Recuperação automática (+1 após 16 min: 2->3), bloqueio da rota legada (400) e Desafio de Recuperação (3->4) validados.';
});

await runTest('TESTE-08', 'Perda de vidas consistente no Nível 1, Nível 2 e modo focusWeakWords', async () => {
  const u = await createFreshLearner('teste8@learnmatch.test', 'Teste 8');

  // Nível 1: 1 erro (5->4) e aprovar (9/10) para desbloquear Nível 2
  const g1 = await u.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 1, forceFresh: true });
  const ans1: any[] = [];
  for (let i = 0; i < 10; i++) {
    const q = g1.data.batch.questions[i];
    const sel = i === 0 ? q.options.find((o: string) => o !== q.correctAnswer) : q.correctAnswer;
    const r = await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
      batchId: g1.data.batch.id,
      questionId: q.id,
      selectedAnswer: sel,
    });
    if (i === 0) assert.equal(r.data.user.lives, 4);
    ans1.push({ questionId: q.id, selectedAnswer: sel });
  }
  const s1 = await u.request(BASE_URL, 'POST', '/api/attempts', {
    batchId: g1.data.batch.id,
    level: 1,
    answers: ans1,
    durationSeconds: 20,
  });
  assert.equal(s1.data.newlyUnlockedLevel, 2);
  assert.equal(s1.data.user.lives, 4);

  // Nível 2: 1 erro (4->3)
  const g2 = await u.request(BASE_URL, 'POST', '/api/exercises/generate', { level: 2, forceFresh: true });
  const q2 = g2.data.batch.questions[0];
  const r2 = await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: g2.data.batch.id,
    questionId: q2.id,
    selectedAnswer: q2.options.find((o: string) => o !== q2.correctAnswer),
  });
  assert.equal(r2.data.user.lives, 3);

  // Modo focusWeakWords: 1 erro (3->2)
  const gf = await u.request(BASE_URL, 'POST', '/api/exercises/generate', {
    level: 1,
    forceFresh: true,
    focusWeakWords: true,
  });
  const qf = gf.data.batch.questions[0];
  const rf = await u.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gf.data.batch.id,
    questionId: qf.id,
    selectedAnswer: qf.options.find((o: string) => o !== qf.correctAnswer),
  });
  assert.equal(rf.data.user.lives, 2);
  return 'Nível 1 (5->4), Nível 2 (4->3) e modo focusWeakWords (3->2) descontaram 1 vida por erro de forma consistente.';
});

// 13. Os 10 testes obrigatórios de fim de jogo a 0 vidas e Desafio de Recuperação
let zeroLivesClient: DualAuthClient;
let zeroLivesBatch: any;

await runTest('VIDAS-01', '1. Responder incorretamente reduz 1 vida', async () => {
  zeroLivesClient = await createFreshLearner('vidas01@learnmatch.test', 'Vidas Flow');
  const gen = await zeroLivesClient.request(BASE_URL, 'POST', '/api/exercises/generate', {
    level: 1,
    forceFresh: true,
  });
  assert.equal(gen.status, 200);
  zeroLivesBatch = gen.data.batch;

  const q0 = zeroLivesBatch.questions[0];
  const ans0 = await zeroLivesClient.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: zeroLivesBatch.id,
    questionId: q0.id,
    selectedAnswer: q0.options.find((o: string) => o !== q0.correctAnswer),
    durationSeconds: 5,
  });
  assert.equal(ans0.status, 200);
  assert.equal(ans0.data.livesDeducted, 1);
  assert.equal(ans0.data.user.lives, 4);
  assert.equal(ans0.data.gameOver, false);
  return '1.a resposta incorreta reduziu vidas de 5 para 4 (gameOver=false).';
});

await runTest('VIDAS-02', '2. Vidas chegam a 0 -> termina sessão imediatamente e guarda tentativa parcial no histórico', async () => {
  const qs = zeroLivesBatch.questions;
  // Pergunta 1 correta (+15 pts preservados no fim), Perguntas 2..5 incorretas (4->3->2->1->0)
  const q1 = await zeroLivesClient.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: zeroLivesBatch.id,
    questionId: qs[1].id,
    selectedAnswer: qs[1].correctAnswer,
    durationSeconds: 10,
  });
  assert.equal(q1.status, 200);
  assert.equal(q1.data.user.lives, 4);

  for (let i = 2; i <= 4; i++) {
    const r = await zeroLivesClient.request(BASE_URL, 'POST', '/api/exercises/answer', {
      batchId: zeroLivesBatch.id,
      questionId: qs[i].id,
      selectedAnswer: qs[i].options.find((o: string) => o !== qs[i].correctAnswer),
      durationSeconds: 15,
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.gameOver, false);
  }

  // 5.o erro (pergunta índice 5) -> vida chega a 0 e dispara gameOver imediato
  const finalErr = await zeroLivesClient.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: zeroLivesBatch.id,
    questionId: qs[5].id,
    selectedAnswer: qs[5].options.find((o: string) => o !== qs[5].correctAnswer),
    durationSeconds: 22,
  });
  assert.equal(finalErr.status, 200);
  assert.equal(finalErr.data.user.lives, 0);
  assert.equal(finalErr.data.gameOver, true);
  assert.ok(finalErr.data.attemptResult, 'gameOver deve devolver attemptResult completo');
  assert.equal(finalErr.data.attemptResult.endedByZeroLives, true);
  assert.equal(finalErr.data.attemptResult.attempt.correctCount, 1);
  assert.equal(finalErr.data.attemptResult.attempt.incorrectCount, 5);
  assert.equal(finalErr.data.attemptResult.attempt.score, 15);
  assert.equal(finalErr.data.attemptResult.attempt.answers.length, 6);

  const hist = await zeroLivesClient.request(BASE_URL, 'GET', '/api/attempts');
  assert.equal(hist.status, 200);
  assert.equal(hist.data.attempts.length, 1);
  assert.equal(hist.data.attempts[0].score, 15);
  assert.equal(hist.data.attempts[0].answers.length, 6);
  return 'Ao atingir 0 vidas na 6.a pergunta, sessão terminou de imediato (gameOver=true) e guardou 1/6 corretas (+15 pts) no histórico.';
});

await runTest('VIDAS-03', '3. Com 0 vidas não é possível responder a mais perguntas nem iniciar níveis normais', async () => {
  const qs = zeroLivesBatch.questions;
  const blockedAns = await zeroLivesClient.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: zeroLivesBatch.id,
    questionId: qs[6].id,
    selectedAnswer: qs[6].correctAnswer,
  });
  assert.equal(blockedAns.status, 403);

  const blockedGen = await zeroLivesClient.request(BASE_URL, 'POST', '/api/exercises/generate', {
    level: 1,
    forceFresh: true,
  });
  assert.equal(blockedGen.status, 403);

  const blockedDupAttempt = await zeroLivesClient.request(BASE_URL, 'POST', '/api/attempts', {
    batchId: zeroLivesBatch.id,
    level: 1,
    answers: [{ questionId: qs[0].id, selectedAnswer: qs[0].correctAnswer }],
    durationSeconds: 25,
  });
  assert.equal(blockedDupAttempt.status, 400);

  const blockedLegacyRec = await zeroLivesClient.request(BASE_URL, 'POST', '/api/profile/recover-life');
  assert.equal(blockedLegacyRec.status, 400);
  return 'Com 0 vidas: resposta adicional bloqueada (403), novo exercício bloqueado (403), tentativa duplicada rejeitada (400) e atalho antigo bloqueado (400).';
});

await runTest('VIDAS-04', '4. Concluir desafio de recuperação com 4/5 ou 5/5 corretas ganha +1 vida', async () => {
  const start4 = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/start');
  assert.equal(start4.status, 201);
  assert.equal(start4.data.challenge.questions.length, 5);

  const ans4 = start4.data.challenge.questions.map((q: any, idx: number) => ({
    questionId: q.id,
    selectedAnswer: idx < 4 ? q.correctAnswer : q.options.find((o: string) => o !== q.correctAnswer),
  }));
  const sub4 = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/submit', {
    challengeId: start4.data.challenge.id,
    answers: ans4,
  });
  assert.equal(sub4.status, 200);
  assert.equal(sub4.data.correctCount, 4);
  assert.equal(sub4.data.passed, true);
  assert.equal(sub4.data.livesBefore, 0);
  assert.equal(sub4.data.livesGained, 1);
  assert.equal(sub4.data.livesAfter, 1);
  assert.equal(sub4.data.user.lives, 1);

  const start5 = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/start');
  const ans5 = start5.data.challenge.questions.map((q: any) => ({
    questionId: q.id,
    selectedAnswer: q.correctAnswer,
  }));
  const sub5 = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/submit', {
    challengeId: start5.data.challenge.id,
    answers: ans5,
  });
  assert.equal(sub5.status, 200);
  assert.equal(sub5.data.correctCount, 5);
  assert.equal(sub5.data.livesGained, 1);
  assert.equal(sub5.data.livesAfter, 2);
  return 'Desafio 4/5 recuperou 0->1 vida e desafio 5/5 recuperou 1->2 vidas.';
});

await runTest('VIDAS-05', '5. Desafio com <= 3/5 corretas não ganha vidas e não perde vidas pelos erros', async () => {
  const start3 = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/start');
  assert.equal(start3.status, 201);

  const ans3 = start3.data.challenge.questions.map((q: any, idx: number) => ({
    questionId: q.id,
    selectedAnswer: idx < 3 ? q.correctAnswer : q.options.find((o: string) => o !== q.correctAnswer),
  }));
  const sub3 = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/submit', {
    challengeId: start3.data.challenge.id,
    answers: ans3,
  });
  assert.equal(sub3.status, 200);
  assert.equal(sub3.data.correctCount, 3);
  assert.equal(sub3.data.passed, false);
  assert.equal(sub3.data.livesBefore, 2);
  assert.equal(sub3.data.livesGained, 0);
  assert.equal(sub3.data.livesAfter, 2);
  assert.equal(sub3.data.user.lives, 2);
  return 'Desafio 3/5 devolveu livesGained=0 e manteve 2/5 vidas sem descontar erros.';
});

await runTest('VIDAS-06', '6. Limite máximo de 5 vidas respeitado e submissão duplicada bloqueada (409)', async () => {
  // Elevar vidas para 4/5 via 2 desafios 5/5
  for (let round = 0; round < 2; round++) {
    const st = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/start');
    const sb = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/submit', {
      challengeId: st.data.challenge.id,
      answers: st.data.challenge.questions.map((q: any) => ({
        questionId: q.id,
        selectedAnswer: q.correctAnswer,
      })),
    });
    assert.equal(sb.status, 200);
  }
  const me4 = await zeroLivesClient.request(BASE_URL, 'GET', '/api/auth/me');
  assert.equal(me4.data.user.lives, 4);

  // 4 -> 5
  const st45 = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/start');
  const sb45 = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/submit', {
    challengeId: st45.data.challenge.id,
    answers: st45.data.challenge.questions.map((q: any) => ({
      questionId: q.id,
      selectedAnswer: q.correctAnswer,
    })),
  });
  assert.equal(sb45.status, 200);
  assert.equal(sb45.data.livesGained, 1);
  assert.equal(sb45.data.livesAfter, 5);

  // Reenvio duplicado do mesmo challengeId deve falhar (409)
  const dup = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/submit', {
    challengeId: st45.data.challenge.id,
    answers: st45.data.challenge.questions.map((q: any) => ({
      questionId: q.id,
      selectedAnswer: q.correctAnswer,
    })),
  });
  assert.equal(dup.status, 409);

  // Novo desafio com 5/5 mantém 5/5 (livesGained=0)
  const stMax = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/start');
  const sbMax = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/submit', {
    challengeId: stMax.data.challenge.id,
    answers: stMax.data.challenge.questions.map((q: any) => ({
      questionId: q.id,
      selectedAnswer: q.correctAnswer,
    })),
  });
  assert.equal(sbMax.status, 200);
  assert.equal(sbMax.data.livesGained, 0);
  assert.equal(sbMax.data.livesAfter, 5);
  assert.equal(sbMax.data.user.lives, 5);
  return '4->5 concedeu +1; reenvio do mesmo challengeId rejeitado (409); 5->5 manteve estritamente 5 vidas.';
});

await runTest('VIDAS-07', '7. Atualizar a página mantém o número atualizado de vidas', async () => {
  // Descontar 1 vida (5->4) e simular refresh via cookie HttpOnly
  const gen = await zeroLivesClient.request(BASE_URL, 'POST', '/api/exercises/generate', {
    level: 1,
    forceFresh: true,
  });
  const q0 = gen.data.batch.questions[0];
  await zeroLivesClient.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gen.data.batch.id,
    questionId: q0.id,
    selectedAnswer: q0.options.find((o: string) => o !== q0.correctAnswer),
  });

  const refresh = await zeroLivesClient.request(BASE_URL, 'GET', '/api/auth/me', undefined, {
    useCookie: true,
    useBearer: false,
  });
  assert.equal(refresh.status, 200);
  assert.equal(refresh.data.user.lives, 4);
  return 'Após reload via cookie HttpOnly (GET /api/auth/me), lives=4 mantidas.';
});

await runTest('VIDAS-08', '8. Isolamento entre utilizadores no desafio de recuperação (403)', async () => {
  const other = await createFreshLearner('vidas08@learnmatch.test', 'Outro Utilizador');
  const startOther = await other.request(BASE_URL, 'POST', '/api/recovery/start');
  assert.equal(startOther.status, 201);

  const hijack = await zeroLivesClient.request(BASE_URL, 'POST', '/api/recovery/submit', {
    challengeId: startOther.data.challenge.id,
    answers: startOther.data.challenge.questions.map((q: any) => ({
      questionId: q.id,
      selectedAnswer: q.correctAnswer,
    })),
  });
  assert.equal(hijack.status, 403);

  const meOther = await other.request(BASE_URL, 'GET', '/api/auth/me');
  assert.equal(meOther.data.user.lives, 5);
  return 'Tentativa cross-user bloqueada com HTTP 403 e contas isoladas.';
});

await runTest('VIDAS-09', '9. Desafio de recuperação não desbloqueia níveis nem altera pontos ou histórico', async () => {
  const cleanUser = await createFreshLearner('vidas09@learnmatch.test', 'Sem Poluicao');
  // Reduzir 1 vida (5->4) num exercício, concluir a tentativa para ter referência exata
  const gen = await cleanUser.request(BASE_URL, 'POST', '/api/exercises/generate', {
    level: 1,
    forceFresh: true,
  });
  const q0 = gen.data.batch.questions[0];
  await cleanUser.request(BASE_URL, 'POST', '/api/exercises/answer', {
    batchId: gen.data.batch.id,
    questionId: q0.id,
    selectedAnswer: q0.options.find((o: string) => o !== q0.correctAnswer),
  });

  const beforeMe = await cleanUser.request(BASE_URL, 'GET', '/api/auth/me');
  const beforeHist = await cleanUser.request(BASE_URL, 'GET', '/api/attempts');
  const beforeStats = await cleanUser.request(BASE_URL, 'GET', '/api/stats');

  const st = await cleanUser.request(BASE_URL, 'POST', '/api/recovery/start');
  const sb = await cleanUser.request(BASE_URL, 'POST', '/api/recovery/submit', {
    challengeId: st.data.challenge.id,
    answers: st.data.challenge.questions.map((q: any) => ({
      questionId: q.id,
      selectedAnswer: q.correctAnswer,
    })),
  });
  assert.equal(sb.status, 200);
  assert.equal(sb.data.user.lives, 5);

  const afterMe = await cleanUser.request(BASE_URL, 'GET', '/api/auth/me');
  const afterHist = await cleanUser.request(BASE_URL, 'GET', '/api/attempts');
  const afterStats = await cleanUser.request(BASE_URL, 'GET', '/api/stats');

  assert.equal(afterMe.data.user.totalPoints, beforeMe.data.user.totalPoints);
  assert.deepEqual(afterMe.data.user.unlockedLevels, [1]);
  assert.equal(afterHist.data.attempts.length, beforeHist.data.attempts.length);
  assert.equal(afterStats.data.wordStats.length, beforeStats.data.wordStats.length);
  return 'Desafio 5/5 deu +1 vida sem alterar totalPoints (0), unlockedLevels ([1]), attempts (0) nem wordStats (0).';
});

await runTest('VIDAS-10', '10. Funcionalidades existentes e estado final após recuperação (retomar níveis normais)', async () => {
  // zeroLivesClient estava com 4 vidas após VIDAS-07; garantir que consegue iniciar exercício normal novamente
  const resume = await zeroLivesClient.request(BASE_URL, 'POST', '/api/exercises/generate', {
    level: 1,
    forceFresh: true,
  });
  assert.equal(resume.status, 200);
  assert.equal(resume.data.batch.questions.length, 10);
  return 'Após recuperar vidas, utilizador retomou normalmente a prática do Nível 1 (10 perguntas) preservando todo o restante MVP.';
});

console.log('\nResumo da auditoria e regressão:');
console.log(JSON.stringify(results, null, 2));

server.close();
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}

const failed = results.filter((r) => r.status === 'FAIL');
if (failed.length > 0) {
  process.exit(1);
}
