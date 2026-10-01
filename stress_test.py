# -*- coding: utf-8 -*-
"""
新年抽奖系统 - 高压并发容量测试
阶段:
  P1 阶梯加压: GET /api/prizes, 并发 25/50/100/200/400
  P2 混合负载: 峰值并发下 70% prizes + 20% participants + 10% 首页
  P3 写并发:   100 并发 POST /api/participants (唯一姓名)
  P4 恢复:     init + migrate 恢复干净状态
输出: 每阶段 RPS / p50 / p95 / p99 / 错误率
"""
import asyncio, json, sys, time, statistics, aiohttp

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:5010"
REQ_TIMEOUT = aiohttp.ClientTimeout(total=15)
PHASE_SECONDS = 20

def pct(sorted_list, p):
    if not sorted_list:
        return 0
    idx = min(int(len(sorted_list) * p / 100), len(sorted_list) - 1)
    return sorted_list[idx]

def report(name, latencies, errors, dur):
    lat = sorted(latencies)
    n = len(latencies)
    rps = n / dur if dur > 0 else 0
    err = errors / (n + errors) * 100 if (n + errors) > 0 else 0
    print(f"  {name}: 请求数={n} 错误={errors} RPS={rps:.1f} "
          f"p50={pct(lat,50)*1000:.0f}ms p95={pct(lat,95)*1000:.0f}ms "
          f"p99={pct(lat,99)*1000:.0f}ms 最大={lat[-1]*1000 if lat else 0:.0f}ms 错误率={err:.2f}%")
    return rps, err

async def worker(session, stop_at, tasks_counter, latencies, errors, reqs):
    while time.monotonic() < stop_at:
        method, path, body = reqs[0]
        if reqs:
            # 混合负载时 reqs 是权重列表, worker 按序取
            method, path, body = reqs[0]
        t0 = time.monotonic()
        try:
            async with session.request(method, BASE + path, json=body) as r:
                await r.read()
                if r.status >= 400:
                    errors += 1
        except Exception:
            errors += 1
        latencies.append(time.monotonic() - t0)
        tasks_counter[0] += 1
    return errors

async def run_phase(session, conc, reqs, label, seconds=PHASE_SECONDS):
    latencies, errors = [], [0]
    counter = [0]
    stop_at = time.monotonic() + seconds
    t0 = time.monotonic()
    if len(reqs) == 1:
        reqs = reqs * conc
    async def w(i):
        nonlocal latencies, errors
        my_lat, my_err = [], 0
        while time.monotonic() < stop_at:
            method, path, body = reqs[i % len(reqs)]
            t1 = time.monotonic()
            try:
                async with session.request(method, BASE + path, json=body) as r:
                    await r.read()
                    if r.status >= 400:
                        my_err += 1
            except Exception:
                my_err += 1
            my_lat.append(time.monotonic() - t1)
        latencies.extend(my_lat)
        errors[0] += my_err
    await asyncio.gather(*[w(i) for i in range(conc)])
    dur = time.monotonic() - t0
    return report(label, latencies, errors[0], dur)

async def main():
    print(f"目标: {BASE}")
    print(f"每阶段时长: {PHASE_SECONDS}s\n")
    connector = aiohttp.TCPConnector(limit=500, ssl=False)
    async with aiohttp.ClientSession(connector=connector, timeout=REQ_TIMEOUT) as s:
        # 预热
        async with s.get(BASE + "/api/prizes") as r:
            await r.read()
        print("== P1 阶梯加压 (GET /api/prizes) ==")
        results = {}
        for conc in [25, 50, 100, 200, 400]:
            results[conc] = await run_phase(s, conc, [("GET", "/api/prizes", None)],
                                            f"并发={conc:>3}")
        print("\n== P2 混合负载 (并发400: 70% prizes / 20% participants / 10% 首页) ==")
        mixed = ([("GET", "/api/prizes", None)] * 7 +
                 [("GET", "/api/participants", None)] * 2 +
                 [("GET", "/", None)] * 1) * 40
        await run_phase(s, 400, mixed, "混合负载=400")

        print("\n== P3 写并发 (100 并发报名, 唯一姓名) ==")
        lat, errs = [], [0]
        t0 = time.monotonic()
        sem = asyncio.Semaphore(100)
        async def post_one(i):
            async with sem:
                t1 = time.monotonic()
                try:
                    async with s.post(BASE + "/api/participants",
                                      json={"name": f"压测用户{i:04d}"}) as r:
                        await r.read()
                        if r.status >= 400:
                            errs[0] += 1
                except Exception:
                    errs[0] += 1
                lat.append(time.monotonic() - t1)
        await asyncio.gather(*[post_one(i) for i in range(200)])
        dur = time.monotonic() - t0
        report("写并发=100(200请求)", lat, errs[0], dur)
        async with s.get(BASE + "/api/participants") as r:
            d = json.loads(await r.text())
            print(f"  写入后参与者总数: {len(d.get('data', []))}")

        print("\n== P4 恢复干净状态 ==")
        async with s.post(BASE + "/api/lottery/init") as r:
            print(f"  init: {r.status}")
        async with s.post(BASE + "/api/database/migrate") as r:
            print(f"  migrate(重建默认奖项): {r.status}")
        async with s.get(BASE + "/api/database/check") as r:
            print(f"  check: {(await r.text())[:120]}")

        print("\n== 容量结论 ==")
        best = max(results, key=lambda c: results[c][0])
        print(f"  最大吞吐出现在并发={best}: RPS={results[best][0]:.1f}")
        for c in sorted(results):
            rps, err = results[c]
            print(f"  并发{c:>3}: RPS={rps:>7.1f}  错误率={err:.2f}%")

asyncio.run(main())
