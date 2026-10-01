#!/usr/bin/env python3
"""
负载测试脚本 - 模拟并发访问
测试不同的并发级别：100、200、300、500
"""
import asyncio
import aiohttp
import time
import statistics
from typing import Dict, List, Tuple
import sys

# 测试配置
BASE_URL = "http://localhost:5000"
CONCURRENT_LEVELS = [100, 200, 300, 500]

# 测试端点
TEST_ENDPOINTS = {
    "首页": "/",
    "报名页面": "/join",
    "查询页面": "/query",
    "抽奖API": "/api/lottery/info",
    "查询API": "/api/lottery/query?q=张三",
}

class LoadTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.results = {}

    async def make_request(self, session: aiohttp.ClientSession, endpoint: str) -> Tuple[int, float]:
        """发送单个HTTP请求"""
        start_time = time.time()
        url = f"{self.base_url}{endpoint}"

        try:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                status = response.status
                await response.read()  # 读取响应体
                elapsed = time.time() - start_time
                return status, elapsed
        except Exception as e:
            elapsed = time.time() - start_time
            print(f"请求失败: {endpoint}, 错误: {e}")
            return 500, elapsed

    async def test_endpoint(self, endpoint_name: str, endpoint: str, concurrency: int, total_requests: int = 1000):
        """测试单个端点"""
        print(f"\n{'='*60}")
        print(f"测试: {endpoint_name} - {endpoint}")
        print(f"并发数: {concurrency} | 总请求数: {total_requests}")
        print(f"{'='*60}")

        connector = aiohttp.TCPConnector(limit=concurrency, limit_per_host=concurrency)
        timeout = aiohttp.ClientTimeout(total=30, connect=10)

        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            # 创建所有任务
            tasks = []
            for _ in range(total_requests):
                tasks.append(self.make_request(session, endpoint))

            # 执行所有任务
            start_time = time.time()
            results = await asyncio.gather(*tasks, return_exceptions=True)
            total_time = time.time() - start_time

            # 分析结果
            success_count = 0
            error_count = 0
            response_times = []

            for result in results:
                if isinstance(result, Exception):
                    error_count += 1
                else:
                    status, elapsed = result
                    if status == 200:
                        success_count += 1
                        response_times.append(elapsed)
                    else:
                        error_count += 1

            # 计算统计信息
            if response_times:
                avg_time = statistics.mean(response_times)
                median_time = statistics.median(response_times)
                p95_time = statistics.quantiles(response_times, n=100)[94] if len(response_times) >= 100 else max(response_times)
                p99_time = statistics.quantiles(response_times, n=100)[98] if len(response_times) >= 100 else max(response_times)
                min_time = min(response_times)
                max_time = max(response_times)
            else:
                avg_time = median_time = p95_time = p99_time = min_time = max_time = 0

            success_rate = (success_count / total_requests) * 100
            qps = total_requests / total_time

            # 打印结果
            print(f"\n📊 测试结果:")
            print(f"  成功请求数: {success_count}")
            print(f"  失败请求数: {error_count}")
            print(f"  成功率: {success_rate:.2f}%")
            print(f"  总耗时: {total_time:.2f}秒")
            print(f"  QPS (每秒请求数): {qps:.2f}")
            print(f"\n⏱️  响应时间统计:")
            print(f"  平均响应时间: {avg_time*1000:.2f}ms")
            print(f"  中位数响应时间: {median_time*1000:.2f}ms")
            print(f"  P95 响应时间: {p95_time*1000:.2f}ms")
            print(f"  P99 响应时间: {p99_time*1000:.2f}ms")
            print(f"  最小响应时间: {min_time*1000:.2f}ms")
            print(f"  最大响应时间: {max_time*1000:.2f}ms")

            # 评估结果
            if success_rate >= 99 and p99_time < 1.0:
                status = "✅ 优秀"
            elif success_rate >= 95 and p99_time < 2.0:
                status = "✅ 良好"
            elif success_rate >= 90 and p99_time < 3.0:
                status = "⚠️  一般"
            else:
                status = "❌ 需要优化"

            print(f"\n📈 评估: {status}")
            print(f"{'='*60}\n")

            return {
                "endpoint_name": endpoint_name,
                "endpoint": endpoint,
                "concurrency": concurrency,
                "total_requests": total_requests,
                "success_count": success_count,
                "error_count": error_count,
                "success_rate": success_rate,
                "total_time": total_time,
                "qps": qps,
                "avg_time": avg_time * 1000,
                "p95_time": p95_time * 1000,
                "p99_time": p99_time * 1000,
                "status": status
            }

    async def run_full_test(self):
        """运行完整测试"""
        print("\n" + "="*60)
        print("🚀 开始负载测试")
        print("="*60)

        all_results = []

        for concurrency in CONCURRENT_LEVELS:
            print(f"\n{'#'*60}")
            print(f"📊 测试并发级别: {concurrency}")
            print(f"{'#'*60}")

            for endpoint_name, endpoint in TEST_ENDPOINTS.items():
                result = await self.test_endpoint(
                    endpoint_name,
                    endpoint,
                    concurrency
                )
                all_results.append(result)

                # 测试间隔，避免服务器过载
                await asyncio.sleep(2)

        # 打印总结
        print("\n" + "="*60)
        print("📋 测试总结")
        print("="*60)

        # 按并发级别分组
        for concurrency in CONCURRENT_LEVELS:
            print(f"\n并发级别: {concurrency}")
            print("-" * 60)
            concurrency_results = [r for r in all_results if r["concurrency"] == concurrency]

            for result in concurrency_results:
                print(f"{result['endpoint_name']:12} | "
                      f"成功率: {result['success_rate']:5.1f}% | "
                      f"P99: {result['p99_time']:6.1f}ms | "
                      f"QPS: {result['qps']:6.1f} | "
                      f"{result['status']}")

        # 评估整体表现
        print("\n" + "="*60)
        print("🎯 整体评估")
        print("="*60)

        # 检查300并发的情况
        results_300 = [r for r in all_results if r["concurrency"] == 300]
        if results_300:
            avg_success_rate = statistics.mean([r["success_rate"] for r in results_300])
            avg_p99 = statistics.mean([r["p99_time"] for r in results_300])

            print(f"\n300并发时的平均表现:")
            print(f"  平均成功率: {avg_success_rate:.2f}%")
            print(f"  平均P99响应时间: {avg_p99:.2f}ms")

            if avg_success_rate >= 99 and avg_p99 < 1000:
                print(f"\n✅ 结论: 系统可以满足300+并发访问需求！")
            elif avg_success_rate >= 95 and avg_p99 < 2000:
                print(f"\n⚠️  结论: 系统基本满足300+并发访问需求，但建议优化")
            else:
                print(f"\n❌ 结论: 系统可能无法满足300+并发访问需求，需要优化")

        print("\n" + "="*60)

async def main():
    # 先检查服务是否可用
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(BASE_URL, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status != 200:
                    print(f"❌ 服务不可用，状态码: {resp.status}")
                    return
    except Exception as e:
        print(f"❌ 无法连接到服务: {e}")
        print("请确保服务正在运行: http://localhost:5000")
        return

    print("✅ 服务可用，开始测试...")

    tester = LoadTester(BASE_URL)
    await tester.run_full_test()

if __name__ == "__main__":
    asyncio.run(main())
