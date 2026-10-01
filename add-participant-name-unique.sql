-- 添加参与者姓名唯一约束（防重复报名）
-- 注意：执行前需要先清理重复的姓名数据

-- 1. 查找重复的姓名
SELECT name, COUNT(*) as count
FROM participants
GROUP BY name
HAVING COUNT(*) > 1;

-- 2. 如果存在重复姓名，先清理（保留最早的一条）
-- 以下脚本会删除重复记录，保留 createdAt 最早的记录
DELETE FROM participants
WHERE id NOT IN (
  SELECT MIN(id)
  FROM participants
  GROUP BY name
);

-- 3. 添加唯一约束
ALTER TABLE participants
ADD CONSTRAINT participants_name_unique UNIQUE (name);

-- 4. 验证约束是否添加成功
SELECT conname
FROM pg_constraint
WHERE conrelid = 'participants'::regclass
  AND conname = 'participants_name_unique';
