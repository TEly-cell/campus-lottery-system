#!/usr/bin/env python3
"""
快速性能测试 - 300并发
"""
import asyncio
import aiohttp
import time
import statistics

BASE_URL = "http://localhost:5000"
CONCURRENCY = 300
REQUESTS_PER_ENDPOINT = 300

ENDPOINTS = {
    "首页": "/",
    "报名页面": "/join",
    "查询页面": "/query",
}

async def test_endpoint(session, url):
    """测试单个请求"""
    try:
        start = time.time()
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            status = resp.status
            elapsed = time.time() - start
            return status, elapsed, None
    except Exception as e:
        elapsed = time.time() - start
        return 500, elapsed, str(e)

async def run_test():
    """运行测试"""
    print(f"\n{'='*60}")
    print(f"🚀 300并发性能测试")
    print(f"{'='*60}\n")

    connector = aiohttp.TCPConnector(limit=CONCURRENCY, limit_per_host=CONCURRENCY)
    timeout = aiohttp.ClientTimeout(total=10, connect=5)

    results = {}

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        for name, endpoint in ENDPOINTS.items():
            print(f"📊 测试: {name}")
            print(f"   并发: {CONCURRENCY} | 总请求: {REQUESTS_PER_ENDPOINT}")

            # 创建任务
            tasks = [test_endpoint(session, BASE_URL + endpoint) for _ in range(REQUESTS_PER_ENDPOINT)]

            # 执行任务
            start_time = time.time()
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = time.time() - start_time

            # 分析结果
            success_count = 0
            error_count = 0
            response_times = []

            for resp in responses:
                if isinstance(resp, Exception):
                    error_count += 1
                else:
                    status, elapsed, error = resp
                    if status == 200:
                        success_count += 1
                        response_times.append(elapsed * 1000)  # 转换为毫秒
                    else:
                        error_count += 1

            # 统计
            if response_times:
                avg_time = statistics.mean(response_times)
                median_time = statistics.median(response_times)
                p95_time = statistics.quantiles(response_times, n=100)[94] if len(response_times) >= 100 else max(response_times)
                p99_time = statistics.quantiles(response_times, n=100)[98] if len(response_times) >= 100 else max(response_times)
            else:
                avg_time = median_time = p95_time = p99_time = 0

            success_rate = (success_count / REQUESTS_PER_ENDPOINT) * 100
            qps = REQUESTS_PER_ENDPOINT / total_time

            print(f"\n   ✅ 成功: {success_count} | ❌ 失败: {error_count}")
            print(f"   📈 成功率: {success_rate:.1f}%")
            print(f"   ⚡ QPS: {qps:.1f}")
            print(f"   ⏱️  响应时间:")
            print(f"      平均: {avg_time:.0f}ms")
            print(f"      中位数: {median_time:.0f}ms")
            print(f"      P95: {p95_time:.0f}ms")
            print(f"      P99: {p99_time:.0f}ms\n")

            results[name] = {
                "success_rate": success_rate,
                "qps": qps,
                "p99_time": p99_time,
                "avg_time": avg_time
            }

    # 总结
    print(f"{'='*60}")
    print("📋 测试总结")
    print(f"{'='*60}\n")

    avg_success_rate = statistics.mean([r["success_rate"] for r in results.values()])
    avg_p99 = statistics.mean([r["p99_time"] for r in results.values()])

    for name, data in results.items():
        print(f"{name:8} | 成功率: {data['success_rate']:5.1f}% | P99: {data['p99_time']:6.0f}ms | QPS: {data['qps']:6.1f}")

    print(f"\n{'='*60}")
    print(f"🎯 300并发平均表现:")
    print(f"   平均成功率: {avg_success_rate:.1f}%")
    print(f"   平均P99响应时间: {avg_p99:.0f}ms")
    print(f"{'='*60}\n")

    if avg_success_rate >= 99 and avg_p99 < 1000:
        print("✅ 优秀: 系统可以轻松应对300+并发！")
    elif avg_success_rate >= 95 and avg_p99 < 2000:
        print("✅ 良好: 系统可以应对300+并发")
    elif avg_success_rate >= 90 and avg_p99 < 5000:
        print("⚠️  一般: 系统基本可以应对300+并发，建议优化")
    else:
        print("❌ 需要优化: 系统可能无法稳定应对300+并发")

    print(f"\n💡 建议:")
    print("   1. 使用生产模式运行 (npm run build && npm start)")
    print("   2. 配置数据库连接池")
    print("   3. 启用Redis缓存")
    print("   4. 使用CDN加速静态资源")
    print(f"{'='*60}\n")

async def main():
    # 检查服务是否可用
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(BASE_URL, timeout=aiohttp.ClientTimeout(total=3)) as resp:
                if resp.status != 200:
                    print(f"❌ 服务不可用: {resp.status}")
                    return
    except Exception as e:
        print(f"❌ 无法连接服务: {e}")
        print("   请确保服务在 http://localhost:5000 运行")
        return

    print("✅ 服务可用\n")
    await run_test()

if __name__ == "__main__":
    asyncio.run(main())
