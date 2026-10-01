# -*- coding: utf-8 -*-
"""
新年抽奖系统 全功能自动化测试
目标: 线上部署环境 (workbuddy sites)
覆盖: 页面渲染 / 管理员登录 / 参与者CRUD+校验 / 奖项CRUD+校验 / 内定与互斥 /
      抽奖(内定/随机/抽完保护/防重复中奖) / 中奖记录与查询 / 重复清理 / 重置初始化 / SSE
"""
import json
import sys
import urllib.request
import urllib.error
from urllib.parse import quote

BASE = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else "http://localhost:5010"
RESULTS = []


def req(method, path, body=None, raw=False):
    # 对路径中非 ASCII 字符做 percent-encoding（保留已编码的 % 与 URL 结构字符）
    url = BASE + quote(path, safe="/?=&%[]:.")
    data = json.dumps(body).encode("utf-8") if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    if data:
        r.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            text = resp.read().decode("utf-8", errors="replace")
            if raw:
                return resp.status, text
            try:
                return resp.status, json.loads(text)
            except Exception:
                return resp.status, {"_raw": text[:200]}
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", errors="replace")
        if raw:
            return e.code, text
        try:
            return e.code, json.loads(text)
        except Exception:
            return e.code, {"_raw": text[:200]}


def check(name, condition, evidence=""):
    status = "PASS" if condition else "FAIL"
    RESULTS.append((status, name, evidence))
    print(f"[{status}] {name}" + (f"  | 证据: {evidence}" if evidence else ""))


def GET(p):
    return req("GET", p)


def POST(p, b=None):
    return req("POST", p, b if b is not None else {})


def PUT(p, b=None):
    return req("PUT", p, b if b is not None else {})


def DELETE(p, b=None):
    return req("DELETE", p, b if b is not None else {})


print("=" * 70)
print(f"测试目标: {BASE}")
print("=" * 70)

# ========== 0. 环境重置(确保干净起点) ==========
print("\n---- 0. 环境重置 ----")
s, d = POST("/api/lottery/init")
check("初始化(清空所有数据+默认奖项)", s == 200 and d.get("success"))

# ========== 1. 页面渲染 ==========
print("\n---- 1. 页面渲染 ----")
PAGES = {
    "/": "抽奖主页",
    "/join": "报名页",
    "/view": "观看页",
    "/query": "中奖查询页",
    "/guide": "使用指南",
    "/admin-login": "管理员登录页",
    "/admin-draw": "管理员抽奖页",
}
for path, label in PAGES.items():
    code, html = GET_RAW = req("GET", path, raw=True)
    ok = code == 200 and len(html) > 500 and "链接已失效" not in html
    check(f"页面 {path} ({label}) 可访问", ok, f"HTTP {code}, 长度 {len(html)}")

# ========== 2. 管理员登录 ==========
print("\n---- 2. 管理员登录 ----")
s, d = POST("/api/admin/login", {"username": "admin", "password": "admin123"})
check("正确账号密码登录成功", s == 200 and d.get("success"), str(d.get("message")))
s, d = POST("/api/admin/login", {"username": "admin", "password": "wrong"})
check("错误密码被拒绝(401)", s == 401 and not d.get("success"), f"HTTP {s}")
s, d = POST("/api/admin/login", {"username": "", "password": ""})
check("空账号密码被拒绝(400)", s == 400, f"HTTP {s}")

# ========== 3. 奖项管理 ==========
print("\n---- 3. 奖项管理 ----")
s, d = GET("/api/prizes")
prizes = d["data"]
check("默认奖项已自动创建(一二三等奖)", s == 200 and len(prizes) == 3,
      ", ".join(f"{p['name']}x{p['count']}" for p in prizes))
prize1, prize2, prize3 = prizes[0], prizes[1], prizes[2]

s, d = POST("/api/prizes", {"name": "特等奖", "count": 1})
check("新增奖项成功", s == 200 and d.get("success") and d["data"]["name"] == "特等奖")
teZJ_id = d["data"]["id"] if d.get("success") else ""

s, d = POST("/api/prizes", {"name": "", "count": 1})
check("空奖项名称被拒绝", not d.get("success"), f"HTTP {s} {d.get('error', '')[:40]}")
s, d = POST("/api/prizes", {"name": "无效奖项", "count": 0})
check("奖项数量为0被拒绝", not d.get("success"), f"HTTP {s}")

s, d = PUT(f"/api/prizes/{teZJ_id}", {"count": 2})
check("更新奖项数量成功", s == 200 and d["data"]["count"] == 2)
s, d = DELETE(f"/api/prizes/{teZJ_id}")
check("删除奖项成功", s == 200 and d.get("success"))
s, d = DELETE(f"/api/prizes/nonexistent-id")
check("删除不存在奖项返回404", s == 404, f"HTTP {s}")

# ========== 4. 参与者报名与管理 ==========
print("\n---- 4. 参与者报名与管理 ----")
names = ["张三", "李四", "王五", "赵六", "钱七", "孙八", "周九", "吴十", "郑一", "王二"]
ids = {}
for i, n in enumerate(names):
    phone = f"1390000{i:04d}" if i % 2 == 0 else None
    body = {"name": n} if phone is None else {"name": n, "phone": phone}
    s, d = POST("/api/participants", body)
    check(f"报名「{n}」" + ("(含手机号)" if phone else ""), s == 200 and d.get("success"))
    ids[n] = d["data"]["id"] if d.get("success") else None

s, d = POST("/api/participants", {"name": "张三"})
check("重复报名被拒绝(400)", s == 400 and not d.get("success"), str(d.get("error"))[:50])
s, d = POST("/api/participants", {"name": ""})
check("空姓名被拒绝", not d.get("success"), f"HTTP {s}")

s, d = GET("/api/participants")
check("参与者列表返回10人", s == 200 and len(d["data"]) == 10, f"实际 {len(d['data'])} 人")

s, d = PUT(f"/api/participants/{ids['王二']}", {"name": "王二丰", "phone": "13911112222"})
check("更新参与者姓名/手机成功", s == 200 and d["data"]["name"] == "王二丰")
ids["王二"] = d["data"]["id"]

# 内定: 李四内定一等奖
s, d = PUT(f"/api/participants/{ids['李四']}", {"isFixedWinner": True, "fixedPrizeId": prize1["id"]})
check("设置李四内定一等奖", s == 200 and d["data"]["isFixedWinner"] and d["data"]["fixedPrizeId"] == prize1["id"])
# 内定与概率互斥: 再设置概率应清空内定
s, d = PUT(f"/api/participants/{ids['李四']}", {"winProbability": 85})
check("设置概率后内定被互斥清空", s == 200 and d["data"]["isFixedWinner"] is False
      and d["data"]["fixedPrizeId"] is None and d["data"]["winProbability"] == 85,
      f"isFixed={d['data'].get('isFixedWinner')}, prob={d['data'].get('winProbability')}")
# 恢复内定
s, d = PUT(f"/api/participants/{ids['李四']}", {"isFixedWinner": True, "fixedPrizeId": prize1["id"]})
check("恢复李四内定一等奖", s == 200 and d["data"]["isFixedWinner"])
# 内定超名额: 一等奖 count=1, 张三也想内定一等奖应被拒
s, d = PUT(f"/api/participants/{ids['张三']}", {"isFixedWinner": True, "fixedPrizeId": prize1["id"]})
check("内定人数超过奖项名额被拒绝", s == 400 and not d.get("success"), str(d.get("error"))[:50])
# 分奖项概率: 张三对二等奖概率 60
s, d = PUT(f"/api/participants/{ids['张三']}", {"winProbabilities": {prize2["id"]: 60}})
check("设置分奖项概率成功", s == 200 and d["data"]["winProbabilities"] == {prize2["id"]: 60})

# ========== 5. 抽奖功能 ==========
print("\n---- 5. 抽奖功能 ----")
s, d = POST("/api/lottery/winners", {})
check("未指定奖项ID被拒绝(400)", s == 400, f"HTTP {s}")
s, d = POST("/api/lottery/winners", {"prizeId": "nonexistent"})
check("不存在的奖项ID报错", not d.get("success"), str(d.get("error"))[:30])

s, d = POST("/api/lottery/winners", {"prizeId": prize1["id"]})
check("抽一等奖命中内定李四", s == 200 and d.get("success") and d["data"]["name"] == "李四",
      f"中奖人: {d['data'].get('name') if d.get('data') else d.get('error')}")

random_winners = []
for i in range(2):
    s, d = POST("/api/lottery/winners", {"prizeId": prize2["id"]})
    check(f"抽二等奖(第{i+1}个名额)成功", s == 200 and d.get("success"),
          f"中奖人: {d['data'].get('name') if d.get('data') else d.get('error')}")
    if d.get("data"):
        random_winners.append(d["data"]["name"])

s, d = POST("/api/lottery/winners", {"prizeId": prize2["id"]})
check("二等奖抽完后再抽被拒绝", not d.get("success"), str(d.get("error")))

for i in range(3):
    s, d = POST("/api/lottery/winners", {"prizeId": prize3["id"]})
    ok = s == 200 and d.get("success")
    check(f"抽三等奖(第{i+1}个名额)成功", ok,
          f"中奖人: {d['data'].get('name') if d.get('data') else d.get('error')}")
    if d.get("data"):
        random_winners.append(d["data"]["name"])

check("无人重复中奖(防重复机制)", len(set(random_winners)) == len(random_winners),
      f"随机中奖者: {','.join(random_winners)}")

s, d = POST("/api/lottery/winners", {"prizeId": prize3["id"]})
check("三等奖抽完后再抽被拒绝", not d.get("success"), str(d.get("error")))

# ========== 6. 中奖记录与查询 ==========
print("\n---- 6. 中奖记录与查询 ----")
s, d = GET("/api/lottery/winners")
winners = d["data"]
check("中奖记录共6条(1内定+5随机)", s == 200 and len(winners) == 6, f"实际 {len(winners)} 条")
fixed_entry = [w for w in winners if w["isFixed"]]
check("内定记录正确标记(isFixed=true)", len(fixed_entry) == 1 and fixed_entry[0]["participantName"] == "李四")
check("中奖记录含姓名与奖项名", all("participantName" in w and "prizeName" in w for w in winners))

s, d = GET("/api/lottery/query?q=李四")
check("按姓名查询中奖结果(李四-一等奖)", s == 200 and d["data"] and d["data"]["prizeName"] == "一等奖")
s, d = GET("/api/lottery/query?q=13900000000")
check("按手机号查询中奖结果", s == 200 and d["data"] is not None, str(d.get("data"))[:60])
s, d = GET("/api/lottery/query?q=不存在的名字xyz")
check("查无此人返回null(不报错)", s == 200 and d["data"] is None)
s, d = GET("/api/lottery/query?q=%20%20")
check("空查询被拒绝(400)", s == 400, f"HTTP {s}")

# ========== 7. 重复数据清理 ==========
print("\n---- 7. 重复数据清理 ----")
s, d = GET("/api/lottery/admin/clear-duplicates")
check("检查重复中奖记录接口正常", s == 200 and "hasDuplicates" in d, str(d))
s, d = POST("/api/lottery/admin/clear-duplicates")
check("清理重复中奖记录接口正常", s == 200 and d.get("success"))
s, d = GET("/api/participants/admin/clear-duplicates")
check("检查重复参与者接口正常", s == 200 and "hasDuplicates" in d, str(d))
s, d = POST("/api/participants/admin/clear-duplicates")
check("清理重复参与者接口正常", s == 200 and d.get("success"))

# ========== 8. 删除与级联 ==========
print("\n---- 8. 删除与级联 ----")
wname = [w["participantName"] for w in winners if not w["isFixed"]][0]
wid = ids.get(wname) or ids.get("张三")
if wname == "王二丰":
    wid = ids["王二"]
s, d = DELETE(f"/api/participants/{wid}")
check(f"删除参与者「{wname}」成功(级联删其记录)", s == 200 and d.get("success"))
s, d = GET("/api/lottery/winners")
remain = [w["participantName"] for w in d["data"]]
check("被删参与者不再出现在中奖名单", wname not in remain, f"剩余: {','.join(remain)}")
s, d = DELETE(f"/api/participants/{wid}")
check("重复删除返回404", s == 404, f"HTTP {s}")

# ========== 9. SSE 事件流 ==========
print("\n---- 9. SSE 实时推送 ----")
try:
    r = urllib.request.Request(BASE + "/api/lottery/events")
    with urllib.request.urlopen(r, timeout=8) as resp:
        ctype = resp.headers.get("Content-Type", "")
        first_line = resp.readline().decode("utf-8", errors="replace")
        second_line = resp.readline().decode("utf-8", errors="replace")
        payload = first_line + second_line
        check("SSE 端点建立连接并推送connected事件",
              "text/event-stream" in ctype and "connected" in payload,
              f"Content-Type={ctype}, 首包={payload.strip()[:80]}")
except Exception as e:
    check("SSE 端点建立连接", False, f"异常: {e}")

# ========== 10. 重置与最终一致性 ==========
print("\n---- 10. 重置与最终一致性 ----")
s, d = PUT("/api/lottery/reset")
check("重置抽奖(清中奖记录)", s == 200 and d.get("success"))
s, d = GET("/api/lottery/winners")
check("重置后中奖记录为空", s == 200 and len(d["data"]) == 0)
s, d = GET("/api/participants")
check("重置后参与者保留(仅清中奖)", s == 200 and len(d["data"]) == 9, f"实际 {len(d['data'])} 人")
s, d = GET("/api/database/check")
st = d.get("data", {})
check("存储引擎健康(json-file)", s == 200 and st.get("engine") == "json-file",
      f"参与者{st.get('participants')} 奖项{st.get('prizes')} 中奖{st.get('winners')}")
s, d = POST("/api/lottery/init")
check("一键初始化(清全部+默认奖项)", s == 200 and d.get("success"))
s, d = GET("/api/participants")
check("初始化后参与者清空", len(d["data"]) == 0)

# ========== 汇总 ==========
print("\n" + "=" * 70)
passed = sum(1 for r in RESULTS if r[0] == "PASS")
failed = [r for r in RESULTS if r[0] == "FAIL"]
print(f"总计 {len(RESULTS)} 项: 通过 {passed}, 失败 {len(failed)}")
if failed:
    print("\n失败明细:")
    for st, name, ev in failed:
        print(f"  [{st}] {name} | {ev}")
    sys.exit(1)
print("全部测试通过 ✅")
