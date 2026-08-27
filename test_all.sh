#!/bin/bash
# 家族人生录 全量测试脚本
# 测试所有API端点，记录问题

BASE="http://localhost:3000"
ISSUES_FILE="/Users/zhuchao/代码/家族人生录/问题清单.md"
TEST_LOG="/tmp/test_results.txt"

echo "# 家族人生录 - 问题清单" > $ISSUES_FILE
echo "" >> $ISSUES_FILE
echo "测试时间: $(date '+%Y-%m-%d %H:%M:%S')" >> $ISSUES_FILE
echo "测试范围: 全量API + 前端页面 + 数据库" >> $ISSUES_FILE
echo "" >> $ISSUES_FILE
echo "---" >> $ISSUES_FILE
echo "" >> $ISSUES_FILE

# 辅助函数：记录问题
record_issue() {
  local severity="$1"
  local module="$2"
  local desc="$3"
  echo "### [$severity] $module" >> $ISSUES_FILE
  echo "- **问题**: $desc" >> $ISSUES_FILE
  echo "" >> $ISSUES_FILE
  echo "❌ [$severity] $module: $desc" >> $TEST_LOG
}

record_ok() {
  local module="$1"
  local desc="$2"
  echo "✅ $module: $desc" >> $TEST_LOG
}

echo "=== 开始全量测试 ===" > $TEST_LOG

# ========== 1. 健康检查 ==========
echo "=== 1. 健康检查 ===" >> $TEST_LOG
HEALTH=$(curl -s "$BASE/api/health")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  record_ok "健康检查" "API状态正常"
else
  record_issue "CRITICAL" "健康检查" "API返回异常: $HEALTH"
fi

# ========== 2. 测试数据库连接 ==========
echo "" >> $ISSUES_FILE
echo "## 一、数据库测试" >> $ISSUES_FILE
echo "" >> $ISSUES_FILE

echo "=== 2. 数据库表检查 ===" >> $TEST_LOG
EXPECTED_TABLES="user_account family_space space_member invitation person_profile kinship interview_session interview_qa life_book book_version timeline_story family_event family_message sync_queue backup_record verification_code search_index tts_cache asr_transcripts ai_conversations ai_analytics ai_prompts ocr_jobs ocr_persons book_shares book_share_views book_share_likes story_comments collab_sessions collab_participants collab_ops offline_queue sync_conflicts cloud_files"
for table in $EXPECTED_TABLES; do
  EXISTS=$(mysql -u root family_life_db -s -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='family_life_db' AND table_name='$table';" 2>/dev/null)
  if [ "$EXISTS" -eq 0 ]; then
    record_issue "CRITICAL" "数据库" "表 $table 不存在"
  else
    record_ok "数据库表" "$table 存在"
  fi
done

# 检查字段
echo "" >> $ISSUES_FILE
echo "### 2.1 关键字段检查" >> $ISSUES_FILE
echo "" >> $ISSUES_FILE

# user_account表
for col in user_id phone nickname avatar status created_at updated_at; do
  EXISTS=$(mysql -u root family_life_db -s -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='family_life_db' AND TABLE_NAME='user_account' AND COLUMN_NAME='$col';" 2>/dev/null)
  if [ "$EXISTS" -eq 0 ]; then
    record_issue "HIGH" "数据库字段" "user_account 表缺少字段: $col"
  fi
done

# person_profile表
for col in person_id space_id name gender birth_date death_date status generation bio is_self; do
  EXISTS=$(mysql -u root family_life_db -s -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='family_life_db' AND TABLE_NAME='person_profile' AND COLUMN_NAME='$col';" 2>/dev/null)
  if [ "$EXISTS" -eq 0 ]; then
    record_issue "HIGH" "数据库字段" "person_profile 表缺少字段: $col"
  fi
done

# life_book表
for col in book_id person_id space_id title status current_version_id; do
  EXISTS=$(mysql -u root family_life_db -s -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='family_life_db' AND TABLE_NAME='life_book' AND COLUMN_NAME='$col';" 2>/dev/null)
  if [ "$EXISTS" -eq 0 ]; then
    record_issue "HIGH" "数据库字段" "life_book 表缺少字段: $col"
  fi
done

# kinship表
for col in relation_id person_a_id person_b_id relation_type status notes; do
  EXISTS=$(mysql -u root family_life_db -s -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='family_life_db' AND TABLE_NAME='kinship' AND COLUMN_NAME='$col';" 2>/dev/null)
  if [ "$EXISTS" -eq 0 ]; then
    record_issue "HIGH" "数据库字段" "kinship 表缺少字段: $col"
  fi
done

# interview_session表
for col in session_id person_id space_id outline_id ai_mode status current_question_index max_duration tts_voice tts_speed; do
  EXISTS=$(mysql -u root family_life_db -s -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='family_life_db' AND TABLE_NAME='interview_session' AND COLUMN_NAME='$col';" 2>/dev/null)
  if [ "$EXISTS" -eq 0 ]; then
    record_issue "HIGH" "数据库字段" "interview_session 表缺少字段: $col"
  fi
done

# story_comments表
for col in id story_id author_id parent_comment_id content likes status; do
  EXISTS=$(mysql -u root family_life_db -s -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='family_life_db' AND TABLE_NAME='story_comments' AND COLUMN_NAME='$col';" 2>/dev/null)
  if [ "$EXISTS" -eq 0 ]; then
    record_issue "HIGH" "数据库字段" "story_comments 表缺少字段: $col"
  fi
done

# collab_sessions表
for col in id book_id session_id creator_id status version base_content; do
  EXISTS=$(mysql -u root family_life_db -s -N -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='family_life_db' AND TABLE_NAME='collab_sessions' AND COLUMN_NAME='$col';" 2>/dev/null)
  if [ "$EXISTS" -eq 0 ]; then
    record_issue "HIGH" "数据库字段" "collab_sessions 表缺少字段: $col"
  fi
done

# ========== 3. 认证模块测试 ==========
echo "" >> $ISSUES_FILE
echo "## 二、认证模块测试" >> $ISSUES_FILE
echo "" >> $ISSUES_FILE

echo "=== 3. 认证模块 ===" >> $TEST_LOG"
