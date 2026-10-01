-- 检查是否有重复中奖的参与者
-- 如果有重复，需要先清理

-- 查找重复的参与者（中奖次数 > 1）
SELECT
  p.id as participant_id,
  p.name as participant_name,
  COUNT(w.id) as win_count,
  array_agg(pr.name ORDER BY w.created_at) as prize_names,
  array_agg(w.created_at ORDER BY w.created_at) as win_times
FROM participants p
JOIN winners w ON w.participant_id = p.id
JOIN prizes pr ON pr.id = w.prize_id
GROUP BY p.id, p.name
HAVING COUNT(w.id) > 1;

-- 如果有重复，可以保留最早的中奖记录，删除后续的记录
-- 请谨慎执行以下SQL

-- 1. 备份所有中奖记录
CREATE TABLE winners_backup AS SELECT * FROM winners;

-- 2. 删除重复的中奖记录（保留最早的）
DELETE FROM winners
WHERE id IN (
  SELECT id FROM (
    SELECT
      w.id,
      ROW_NUMBER() OVER (PARTITION BY w.participant_id ORDER BY w.created_at) as rn
    FROM winners w
  ) t
  WHERE rn > 1
);

-- 3. 验证删除结果
SELECT
  p.id as participant_id,
  p.name as participant_name,
  COUNT(w.id) as win_count
FROM participants p
JOIN winners w ON w.participant_id = p.id
GROUP BY p.id, p.name
HAVING COUNT(w.id) > 1;
-- 如果返回空结果，说明所有重复都已删除

-- 4. 应用唯一约束（如果表不存在唯一约束）
-- 注意：这需要通过 Drizzle migration 或手动执行
-- ALTER TABLE winners DROP CONSTRAINT IF EXISTS winners_participant_unique;
-- ALTER TABLE winners ADD CONSTRAINT winners_participant_unique UNIQUE (participant_id);

-- 5. 如果需要恢复，可以从备份恢复
-- TRUNCATE winners;
-- INSERT INTO winners SELECT * FROM winners_backup;
-- DROP TABLE winners_backup;
